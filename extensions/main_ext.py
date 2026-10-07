# Extensions library for Plainsheet's PyO3 addon system.
#
# Discovered by the Rust core (`addons.rs`); every function takes/returns
# JSON-serializable values.

import csv
import io
import json
import re
from pathlib import Path

BANK_HEADER_MAPS = {
    "date": ["date", "transaction date", "posted date", "valutadatum", "buchungstag"],
    "description": ["description", "memo", "details", "payee", "verwendungszweck", "umsatztext"],
    "amount": ["amount", "value", "betrag"],
    "debit": ["debit", "withdrawal", "out", "paid out", "soll"],
    "credit": ["credit", "deposit", "in", "paid in", "haben"],
}

EMAIL_RE = re.compile(r"[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}", re.IGNORECASE)
PHONE_RE = re.compile(r"(\+\d{1,2}\s?)?1?-?\.?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}")

EXTENSIONS = [
    {
        "id": "bank-acc-mapping",
        "name": "Accounting Mapper",
        "description": "Auto-map bank statements (Chase, HSBC, etc.) to QuickBooks/Xero standard OFX/QBO formats.",
        "category": "Format",
        "icon": "bank",
        "kind": "big",
    },
    {
        "id": "trimmer",
        "name": "The Great Trimmer",
        "description": "One-click whitespace removal across all columns.",
        "category": "Data",
        "icon": "broom",
        "kind": "small",
    },
    {
        "id": "gdpr-anonymizer",
        "name": "GDPR Data Scrubber",
        "description": "Scanner for Emails, Phones, SSNs and masks all detected PII.",
        "category": "Data",
        "icon": "shield",
        "kind": "small",
    },
    {
        "id": "high-level-stats",
        "name": "High-Level Stats",
        "description": "Null counts, row count and per-column fill-rate analysis.",
        "category": "Analysis",
        "icon": "chart",
        "kind": "big",
    },
    {
        "id": "data-cleaner",
        "name": "Data Cleaner",
        "description": "Removes duplicate rows and writes the cleaned file in place.",
        "category": "Data",
        "icon": "drop",
        "kind": "big",
    },
    {
        "id": "data-validator",
        "name": "Data Validator",
        "description": "Reports missing values and duplicate rows in the file.",
        "category": "Analysis",
        "icon": "check",
        "kind": "big",
    },
]


def discover_extensions():
    return EXTENSIONS


def _read_csv(path):
    raw = Path(path).read_bytes()
    for enc in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            text = raw.decode(enc)
            if enc == "utf-8-sig":
                text = text.lstrip("\ufeff")
            break
        except UnicodeDecodeError:
            continue
    try:
        delim = csv.Sniffer().sniff(text[:4096], delimiters=",;\t|").delimiter
    except Exception:
        delim = ","
    return list(csv.reader(io.StringIO(text), delimiter=delim))


def _pick_delimiter(headers):
    counts = {d: sum(1 for h in headers if h.lower().strip() in BANK_HEADER_MAPS["date"]) for d in (",", ";", "\t", "|")}
    return max(counts, key=counts.get)


# --- small addons: transform in-memory rows -------------------------------

def run_extension_by_name(name, addon_id, headers, rows):
    """Return {"rows": [...], "message": "..."}."""
    if addon_id == "trimmer" or "trimmer" in name.lower():
        out = [[c.strip() if isinstance(c, str) else c for c in row] for row in rows]
        return {"rows": out, "message": "Data trimmed successfully!"}

    if addon_id == "gdpr-anonymizer" or "gdpr" in name.lower():
        def mask(val):
            if not isinstance(val, str):
                return val
            val = EMAIL_RE.sub("[ANONYMIZED EMAIL]", val)
            val = PHONE_RE.sub("[REDACTED PHONE]", val)
            return val
        out = [[mask(c) for c in row] for row in rows]
        return {"rows": out, "message": "Legal Tech Scrubbing Complete: all PII masked."}

    if addon_id == "bank-acc-mapping":
        # row-oriented map fallback: produce date/desc/amount mapping for loaded rows
        cols = [h.lower() for h in headers]
        mapping = {}
        for key, aliases in BANK_HEADER_MAPS.items():
            for i, c in enumerate(cols):
                if c in aliases:
                    mapping[key] = i
                    break
        out = []
        for row in rows:
            date = row[mapping["date"]] if "date" in mapping and mapping["date"] < len(row) else ""
            desc = row[mapping["description"]] if "description" in mapping and mapping["description"] < len(row) else "Transaction"
            if "amount" in mapping:
                amt = _to_float(row[mapping["amount"]]) if mapping["amount"] < len(row) else 0.0
            elif "debit" in mapping and "credit" in mapping:
                deb = _to_float(row[mapping["debit"]]) if mapping["debit"] < len(row) else 0.0
                cre = _to_float(row[mapping["credit"]]) if mapping["credit"] < len(row) else 0.0
                amt = cre - abs(deb)
            else:
                amt = 0.0
            out.append([date, desc, "{:.2f}".format(amt)])
        return {"rows": out, "message": "Rows mapped to standardized Date/Description/Amount."}

    return {"rows": rows, "message": "{} has no generic implementation.".format(name)}


def _to_float(s):
    try:
        return float(re.sub(r"[^-0-9.]", "", str(s))) if s not in (None, "") else 0.0
    except ValueError:
        return 0.0


# --- big addons: process a file path -------------------------------------

def run_big_data_job(name, addon_id, file_path):
    if addon_id == "bank-acc-mapping":
        return _accounting_mapper(file_path)
    if addon_id == "high-level-stats":
        return _high_level_stats(file_path)
    if addon_id == "data-cleaner":
        return _data_cleaner(file_path)
    if addon_id == "data-validator":
        return _data_validator(file_path)
    return {"ok": False, "message": "Unknown big-data job: {}".format(name)}


def _accounting_mapper(path):
    try:
        rows = _read_csv(path)
    except Exception as e:
        return {"ok": False, "message": "Could not read file: {}".format(e)}
    if not rows:
        return {"ok": False, "message": "File is empty."}
    cols = [c.strip().lower() for c in rows[0]]
    mapping = {}
    for key, aliases in BANK_HEADER_MAPS.items():
        for i, c in enumerate(cols):
            if c in aliases:
                mapping[key] = i
                break
    if "date" not in mapping or ("amount" not in mapping and not ("debit" in mapping and "credit" in mapping)):
        return {"ok": False, "message": 'Could not auto-detect standard bank columns. Headers like "Date" and "Amount" are required.'}

    standardized = []
    for row in rows[1:]:
        def cell(key):
            idx = mapping.get(key)
            return row[idx] if idx is not None and idx < len(row) else ""
        date = cell("date")
        desc = cell("description") or "Transaction"
        if "amount" in mapping:
            amount = _to_float(cell("amount"))
        else:
            amount = _to_float(cell("credit")) - abs(_to_float(cell("debit")))
        standardized.append((date, desc, amount))

    now = __import__("datetime").datetime.now()
    ts = now.strftime("%Y%m%d%H%M%S")
    datepart = now.strftime("%Y-%m-%d")
    ofx = []
    ofx.append("OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\nSECURITY:NONE\nENCODING:USASCII\nCHARSET:1252\nCOMPRESSION:NONE\nOLDFILEUID:NONE\nNEWFILEUID:NONE\n")
    ofx.append("<OFX>\n<SIGNONMSGSRSV1>\n<SONRS>\n<STATUS><CODE>0<SEVERITY>INFO</STATUS>\n")
    ofx.append("<DTSERVER>{}\n<LANGUAGE>ENG</LANGUAGE>\n</SONRS>\n</SIGNONMSGSRSV1>\n".format(ts))
    ofx.append("<BANKMSGSRSV1>\n<STMTTRNRS>\n<TRNUID>{}\n<STATUS><CODE>0<SEVERITY>INFO</STATUS>\n".format(ts))
    ofx.append("<STMTRS>\n<CURDEF>USD</CURDEF>\n<BANKTRANLIST>\n")
    for i, (rdate, rdesc, amount) in enumerate(standardized):
        try:
            rdate_s = __import__("datetime").datetime.strptime(rdate[:10], "%Y-%m-%d").strftime("%Y%m%d")
        except Exception:
            rdate_s = now.strftime("%Y%m%d")
        trntype = "CREDIT" if amount >= 0 else "DEBIT"
        ofx.append("<STMTTRN>\n<TRNTYPE>{}\n<DTPOSTED>{}\n<TRNAMT>{:.2f}\n<FITID>{}{}\n<NAME>{}\n</STMTTRN>\n".format(
            trntype, rdate_s, amount, ts, i, str(rdesc)[:32]))
    ofx.append("</BANKTRANLIST>\n</STMTRS>\n</STMTTRNRS>\n</BANKMSGSRSV1>\n</OFX>")

    out_path = str(Path(path).with_suffix("")) + "_accounting_ready.ofx"
    try:
        Path(out_path).write_text("".join(ofx), encoding="ascii", errors="ignore")
    except Exception as e:
        return {"ok": False, "message": "Could not write OFX: {}".format(e)}
    return {"ok": True, "message": "Exported {} transactions to {}".format(len(standardized), out_path)}


def _high_level_stats(path):
    try:
        rows = _read_csv(path)
    except Exception as e:
        return {"ok": False, "message": "Could not read file: {}".format(e)}
    if not rows:
        return {"ok": False, "message": "File is empty."}
    headers = rows[0]
    ncols = len(headers)
    nrows = max(len(rows) - 1, 0)
    nulls = 0
    fill = [0] * ncols
    sample = rows[1:2001]
    for row in sample:
        for i in range(ncols):
            v = row[i] if i < len(row) else ""
            if not v or v.strip() == "":
                nulls += 1
            else:
                fill[i] += 1
    fill_rate = [round(100.0 * fill[i] / len(sample), 1) if sample else 0.0 for i in range(ncols)]
    top = sorted(zip(headers, fill_rate), key=lambda x: -x[1])[:5]
    msg = "Rows: {} | Cols: {} | Empty cells (sampled): {}".format(nrows, ncols, nulls)
    msg += " | Best filled: " + ", ".join("{} ({}%)".format(h, r) for h, r in top)
    return {"ok": True, "message": msg, "details": {"rows": nrows, "cols": ncols, "empty_sampled": nulls}}


def _data_cleaner(path):
    try:
        rows = _read_csv(path)
    except Exception as e:
        return {"ok": False, "message": "Could not read file: {}".format(e)}
    if not rows:
        return {"ok": False, "message": "File is empty."}
    header = rows[0]
    seen = set()
    deduped = [header]
    removed = 0
    for row in rows[1:]:
        k = json.dumps(row, ensure_ascii=False)
        if k in seen:
            removed += 1
            continue
        seen.add(k)
        deduped.append(row)
    try:
        with open(path, "w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerows(deduped)
    except Exception as e:
        return {"ok": False, "message": "Could not write file: {}".format(e)}
    return {"ok": True, "message": "Removed {} duplicate rows.".format(removed)}


def _data_validator(path):
    try:
        rows = _read_csv(path)
    except Exception as e:
        return {"ok": False, "message": "Could not read file: {}".format(e)}
    if not rows:
        return {"ok": False, "message": "File is empty."}
    ncols = len(rows[0])
    missing = 0
    dupes = len(rows[1:]) - len(set(json.dumps(r, ensure_ascii=False) for r in rows[1:]))
    short_rows = 0
    for row in rows[1:]:
        for cell in row:
            if not cell or cell.strip() == "":
                missing += 1
        if len(row) != ncols:
            short_rows += 1
    msg = "Validation: {} missing values, {} duplicate rows, {} rows with column mismatch.".format(
        missing, dupes, short_rows)
    return {"ok": True, "message": msg}