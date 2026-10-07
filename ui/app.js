/* PlainSheet frontend — Sciter.JS, talks to the Rust core via Window.this.xcall. */

"use strict";

var ROW_HEIGHT = 32;
var VISIBLE_BUFFER = 15;
var PAGE = 2000;

var ICONS = { bank: "\u{1f3e6}", broom: "\u{1f9f9}", shield: "\u{1f6e1}", chart: "\u{1f4ca}", drop: "\u{1f9fc}", check: "\u2705", spark: "\u2728", brain: "\u{1f9e0}", coin: "\u{1f4b5}" }; 
var ICON_FALLBACK = "\u{1f512}";

var TRANSLATIONS = {
  en: {
    appTitle: "PlainSheet Pro", newSheet: "New Spreadsheet", openFile: "Open File...",
    marketplace: "Plugin Marketplace", settings: "Application Settings", reset: "Reset Environment",
    searchPlaceholder: "Instant grid search...", commands: "COMMANDS", export: "Export",
    save: "SAVE", saveSuccess: "Workspace saved locally", addRow: "ADD ROW", addCol: "ADD COLUMN",
    delete: "DELETE", deleteRows: "DELETE {n} ROWS", deleteCols: "DELETE {n} COLS", sort: "SORT",
    sortActive: "Sort (Active Col)", processing: "Processing", idle: "Idle", license: "ENTERPRISE LICENSE",
    licensedTo: "Licensed to:", stats: "STATS", rows: "ROWS", cols: "COLS", format: "FORMAT",
    parserSettings: "Parser Settings", delimiter: "Global Delimiter", headerMapping: "Header Mapping",
    headerMappingSub: "Treat first row as keys", saveChanges: "Save Changes", language: "Interface Language",
    plugins: "Plugins", activePlugins: "Active Plugins", execute: "Execute", working: "Working...",
    browseMarket: "Browse Marketplace", tabClosed: "Tab closed", fileImported: "File imported successfully",
    importFailed: "Import failed", newSheetCreated: "Created new sheet", readyToUse: "Ready to Use",
    installPlugin: "Install Plugin", installed: "INSTALLED", enterpriseEco: "Enterprise Ecosystem",
    ecoDesc: "Premium tools for FinTech, AI, and Compliance", management: "Management",
    documentation: "Documentation", searchStore: "Search store...", closeStore: "Close Store",
    promptCol: "Enter new column name:", colEmptyError: "Column name cannot be empty",
    colExistsError: "Column name already exists", cellActive: "Cell {col}{row} active | Len: {len}",
    rowsSelected: "{n} rows selected", colsSelected: "{n} columns selected", gridEngine: "PlainSheet Grid Engine",
    quickAction: "PlainSheet QuickAction Engine", escClose: "ESC to close", whatToDo: "What do you want to do?",
    enterToExec: "to execute", navKeys: "to navigate", installs: "Installs", category: "Category",
    menuEdit: "EDIT", menuData: "DATA", menuFind: "FIND", menuTools: "TOOLS", menuHelp: "HELP",
    menuFile: "FILE", fileMenu: "FILE", clearSelect: "Clear Selection", about: "About PlainSheet",
    saveWorkspace: "Save Workspace", saveFile: "Save to File...", sortBy: "Sorted by {c} ({d})",
    renamed: 'Renamed "{a}" to "{b}"', selectedDeleted: "Selected items deleted", addRowTop: "Row added",
    addRowFail: "Rows can be added only in memory sheets",
    addColFail: "Columns can be added only in memory sheets",
    sortFailPaged: "Sorting is disabled for large files (paged mode)",
    deleteFailPaged: "Deleting is disabled for large files (paged mode)",
    searchPagedHint: "Search is disabled for large files",
    fileSaved: "File saved to {p}", fileNotSaved: "Could not save file",
    unsupportedFormat: "Excel export is not supported yet - use CSV/TSV/JSON",
    unsupportedPaged: "This export is only available for in-memory sheets",
    noFileBacked: "This addon requires a file-backed sheet",
    addonRun: "{a} complete", addonErr: "{a} failed",
    notInstalledError: "This addon is not installed", addonDemo: "{a} functionality limited in demo mode.",
    toolClose: "close", dataMode: "MEM", pagedMode: "PAGED",
    pluginsPanel: "Plugins Panel", remove: "Remove", uninstall: "Uninstall", manageHint: "These addons are active in this workspace.",
    loading: "Loading…", saving: "Saving…", openErr: "Could not open file"
  },
  vi: {
    appTitle: "PlainSheet Pro", newSheet: "Trang tính mới", openFile: "Mở tệp...",
    marketplace: "Chợ Plugin", settings: "Cài đặt ứng dụng", reset: "Đặt lại môi trường",
    searchPlaceholder: "Tìm kiếm nhanh...", commands: "LỆNH", export: "Xuất tệp",
    save: "LƯU", saveSuccess: "Đã lưu không gian làm việc", addRow: "THÊM DÒNG", addCol: "THÊM CỘT",
    delete: "XÓA", deleteRows: "XÓA {n} DÒNG", deleteCols: "XÓA {n} CỘT", sort: "SẮP XẾP",
    sortActive: "Sắp xếp (cột đang chọn)", processing: "Đang xử lý", idle: "Đang chờ", license: "BẢN QUYỀN DOANH NGHIỆP",
    licensedTo: "Cấp phép cho:", stats: "THỐNG KÊ", rows: "DÒNG", cols: "CỘT", format: "ĐỊNH DẠNG",
    parserSettings: "Cài đặt bộ phân tích", delimiter: "Dấu phân cách", headerMapping: "Tiêu đề cột",
    headerMappingSub: "Coi dòng đầu là tên cột", saveChanges: "Lưu thay đổi", language: "Ngôn ngữ giao diện",
    plugins: "Tiện ích", activePlugins: "Tiện ích đang dùng", execute: "Thực thi", working: "Đang chạy...",
    browseMarket: "Xem cửa hàng", tabClosed: "Đã đóng tab", fileImported: "Nhập tệp thành công",
    importFailed: "Nhập tệp thất bại", newSheetCreated: "Đã tạo trang tính mới", readyToUse: "Sẵn sàng",
    installPlugin: "Cài đặt", installed: "ĐÃ CÀI", enterpriseEco: "Hệ sinh thái doanh nghiệp",
    ecoDesc: "Công cụ cao cấp cho Tài chính, AI và Tuân thủ", management: "Quản lý",
    documentation: "Tài liệu", searchStore: "Tìm trong cửa hàng...", closeStore: "Đóng cửa hàng",
    promptCol: "Nhập tên cột mới:", colEmptyError: "Tên cột không được để trống",
    colExistsError: "Tên cột đã tồn tại", cellActive: "Ô {col}{row} đang chọn | Độ dài: {len}",
    rowsSelected: "Đã chọn {n} dòng", colsSelected: "Đã chọn {n} cột", gridEngine: "PlainSheet Grid Engine",
    quickAction: "PlainSheet QuickAction Engine", escClose: "ESC để đóng", whatToDo: "Bạn muốn làm gì?",
    enterToExec: "để thực thi", navKeys: "để di chuyển", installs: "Lượt cài", category: "Phân loại",
    menuEdit: "CHỈNH SỬA", menuData: "DỮ LIỆU", menuFind: "TÌM KIẾM", menuTools: "CÔNG CỤ", menuHelp: "TRỢ GIÚP",
    menuFile: "TỆP", fileMenu: "TỆP", clearSelect: "Bỏ chọn tất cả", about: "Về PlainSheet",
    saveWorkspace: "Lưu không gian làm việc", saveFile: "Lưu ra tệp...", sortBy: "Đã sắp xếp theo {c} ({d})",
    renamed: 'Đã đổi "{a}" thành "{b}"', selectedDeleted: "Đã xóa các mục đã chọn", addRowTop: "Đã thêm dòng",
    addRowFail: "Chỉ các bảng nhỏ mới thêm được dòng",
    addColFail: "Chỉ các bảng nhỏ mới thêm được cột",
    sortFailPaged: "Không thể sắp xếp tệp lớn (chế độ paged)",
    deleteFailPaged: "Không thể xóa trong tệp lớn (chế độ paged)",
    searchPagedHint: "Tìm kiếm không áp dụng cho tệp lớn",
    fileSaved: "Đã lưu tệp {p}", fileNotSaved: "Không thể lưu tệp",
    unsupportedFormat: "Xuất Excel chưa được hỗ trợ - dùng CSV/TSV/JSON",
    unsupportedPaged: "Xuất tệp chỉ có cho bảng được tải vào bộ nhớ",
    noFileBacked: "Tiện ích này cần một bảng từ tệp",
    addonRun: "Xong: {a}", addonErr: "Lỗi: {a}",
    notInstalledError: "Tiện ích chưa được cài đặt", addonDemo: "Chức năng {a} bị giới hạn trong demo.",
    toolClose: "đóng", dataMode: "BỘ NHỚ", pagedMode: "PHÂN TRANG",
    pluginsPanel: "Bảng tiện ích", remove: "Gỡ", uninstall: "Gỡ cài đặt", manageHint: "Các tiện ích này đang hoạt động trong không gian làm việc.",
    loading: "Đang tải…", saving: "Đang lưu…", openErr: "Không thể mở tệp"
  }
};

var MARKETPLACE = [
  { id: "bank-acc-mapping", name: "Accounting Mapper", desc: "Auto-map bank statements to standard formats.", category: "Format", icon: "bank", price: "Free", installs: "12k", kind: "big" },
  { id: "ai-architect", name: "AI Data Architect", desc: "Uses Gemini to normalize and clean your spreadsheet data.", category: "AI", icon: "spark", price: "$9.99", installs: "4.2k", kind: "small", demo: true },
  { id: "gdpr-anonymizer", name: "GDPR Data Scrubber", desc: "Mask PII and ensure compliance with GDPR/SOC2.", category: "Data", icon: "shield", price: "$24/mo", installs: "800", kind: "small" },
  { id: "trimmer", name: "The Great Trimmer", desc: "Remove leading/trailing whitespace across all cells.", category: "Data", icon: "broom", price: "Free", installs: "25k", kind: "small" },
  { id: "sentiment-analyzer", name: "Sentiment Analysis", desc: "Analyze text columns for emotional tone and polarity.", category: "Analysis", icon: "brain", price: "$4.99", installs: "1.5k", kind: "small", demo: true },
  { id: "currency-conv", name: "Forex Converter", desc: "Real-time currency conversion for financial data.", category: "Data", icon: "coin", price: "Free", installs: "9k", kind: "small", demo: true },
  { id: "high-level-stats", name: "High-Level Stats", desc: "Null counts, row count and column fill-rate analysis.", category: "Analysis", icon: "chart", price: "Free", installs: "6k", kind: "big" },
  { id: "data-cleaner", name: "Data Cleaner", desc: "Removes duplicate rows and writes the cleaned file in place.", category: "Data", icon: "drop", price: "Free", installs: "3k", kind: "big" },
  { id: "data-validator", name: "Data Validator", desc: "Reports missing values and duplicate rows in the file.", category: "Analysis", icon: "check", price: "Free", installs: "2k", kind: "big" }
];

var state = {
  lang: "en",
  sheets: [],
  activeId: null,
  settings: { delimiter: ",", hasHeader: true },
  searchQuery: "",
  paletteQuery: "",
  marketQuery: "",
  showPalette: false,
  showSettings: false,
  showAddon: false,
  addonTab: "marketplace",
  panelOpen: false,
  activeCell: null,
  selRows: {},
  selCols: {},
  selRowCount: 0,
  selColCount: 0,
  lastRow: null,
  lastCol: null,
  scrollTop: 0,
  viewH: 0,
  processing: false,
  notes: [],
  sort: null,
  pyAddons: [],
  demoInstalled: [],
  cmdIdx: 0,
  editing: false,
  inited: false
};

function $(id) { return document.getElementById(id); }
function t(key) { var d = TRANSLATIONS[state.lang] || TRANSLATIONS.en; return (d[key] !== undefined ? d[key] : TRANSLATIONS.en[key]) || key; }
function xcall(name) { var args = Array.prototype.slice.call(arguments, 1); return Window.this.xcall.apply(Window.this, [name].concat(args)); }
function closest(el, sel) {
  if (!el) return null;
  try { if (el.matches(sel)) return el; } catch (e) {}
  var cur = el.parentElement;
  while (cur) {
    try { if (cur.matches(sel)) return cur; } catch (e) {}
    cur = cur.parentElement;
  }
  return null;
}
function fmtNum(n) {
  var s = String(n);
  var out = "";
  var count = 0;
  for (var i = s.length - 1; i >= 0; i--) { out = s.charAt(i) + out; count++; if (count % 3 === 0 && i > 0) out = "," + out; }
  return out;
}
var promptCallback = null;
function simplePrompt(title, defaultValue, cb) {
  promptCallback = cb;
  $("input-title").textContent = title;
  $("input-value").value = defaultValue || "";
  $("input-modal").style.display = "flex";
  setTimeout(function () { try { $("input-value").focus(); $("input-value").select(); } catch (e) {} }, 10);
}
function closePrompt() {
  $("input-modal").style.display = "none";
  promptCallback = null;
}

/* ---------- sheets ---------- */
function newSheet(name, headers, rows) {
  var id = "s" + Date.now() + Math.floor(Math.random() * 9999);
  var sheet = {
    id: id, name: name, session: null, path: null, mode: "mem",
    headers: headers || ["A", "B", "C", "D"],
    rows: rows || [], totalRows: 0, loaded: 0, edits: {}, dirty: false
  };
  if (!rows) {
    sheet.rows = [];
    for (var i = 0; i < 100; i++) { var r = []; for (var j = 0; j < sheet.headers.length; j++) r.push(""); sheet.rows.push(r); }
  }
  sheet.totalRows = sheet.rows.length;
  sheet.loaded = sheet.rows.length;
  return sheet;
}
function initialSheet() { return newSheet("untitled_data.csv", null, null); }
function activeSheet() {
  for (var i = 0; i < state.sheets.length; i++) if (state.sheets[i].id === state.activeId) return state.sheets[i];
  return state.sheets[0] || null;
}
function isPaged(an) { return an && an.mode === "paged"; }
function isPreview(an) { return an && an.mode === "preview"; }
function collength(an) { return an ? an.headers.length : 0; }

function filteredRows(an) {
  an = an || activeSheet();
  if (!an) return [];
  if (isPaged(an)) return an.rows;
  var src = an.rows;
  if (state.sort) {
    var dir = state.sort.direction === "asc" ? 1 : -1;
    var ci = state.sort.col;
    var sorted = src.slice().sort(function (a, b) {
      var va = a[ci], vb = b[ci];
      if (va === vb) return 0;
      if (va === null || va === undefined || va === "") return 1;
      if (vb === null || vb === undefined || vb === "") return -1;
      var na = Number(va), nb = Number(vb);
      if (!isNaN(na) && !isNaN(nb)) return dir * (na - nb);
      return dir * String(va).localeCompare(String(vb));
    });
    return sorted;
  }
  var q = state.searchQuery.trim().toLowerCase();
  if (!q) return src;
  return src.filter(function (row) {
    for (var i = 0; i < row.length; i++) if (String(row[i] || "").toLowerCase().indexOf(q) >= 0) return true;
    return false;
  });
}

/* ---------- notifications ---------- */
function notify(text, type) {
  var id = Date.now() + Math.random();
  state.notes.push({ id: id, text: text, type: type || "info" });
  renderToasts();
  setTimeout(function () {
    state.notes = state.notes.filter(function (n) { return n.id !== id; });
    renderToasts();
  }, 4000);
}

/* ---------- rendering ---------- */
function applyI18n() {
  var els = document.querySelectorAll("[data-i18n]");
  for (var i = 0; i < els.length; i++) els[i].textContent = t(els[i].getAttribute("data-i18n"));
  var phs = document.querySelectorAll("[data-i18n-ph]");
  for (var j = 0; j < phs.length; j++) phs[j].setAttribute("placeholder", t(phs[j].getAttribute("data-i18n-ph")));
}

function renderAll() {
  applyI18n();
  renderHeaderBrand();
  renderTabs();
  renderGridHeader();
  renderVisible();
  renderStatus();
  renderDataMenu();
  renderPanel();
  renderPalette();
  renderMarket();
  renderManage();
  renderSettingsUI();
}

function renderHeaderBrand() {
  var an = activeSheet();
  $("brand-sheet-name").textContent = an ? an.name : "";
}

function renderTabs() {
  var box = $("tabs");
  box.innerHTML = "";
  for (var i = 0; i < state.sheets.length; i++) {
    (function (sheet) {
      var d = document.createElement("div");
      d.className = "tab" + (sheet.id === state.activeId ? " active" : "");
      var n = document.createElement("span");
      n.className = "tname";
      n.textContent = sheet.name;
      d.appendChild(n);
      if (state.sheets.length > 1) {
        var c = document.createElement("button");
        c.className = "tclose";
        c.textContent = "\u00d7";
        c.setAttribute("data-act", "close-tab");
        c.setAttribute("data-id", sheet.id);
        d.appendChild(c);
      }
      d.setAttribute("data-tab", sheet.id);
      box.appendChild(d);
    })(state.sheets[i]);
  }
}

function renderGridHeader() {
  var hd = $("grid-header");
  hd.innerHTML = "";
  var corner = document.createElement("div");
  corner.className = "corner";
  corner.textContent = "#";
  hd.appendChild(corner);
  var an = activeSheet();
  if (!an) return;
  for (var i = 0; i < an.headers.length; i++) {
    (function (ci) {
      var c = document.createElement("div");
      c.className = "colh" + (state.selCols[ci] ? " sel" : "");
      c.setAttribute("data-colh", ci);
      if (state.settings.hasHeader && !isPaged(an) && !isPreview(an)) {
        var inp = document.createElement("input");
        inp.value = an.headers[ci];
        inp.addEventListener("focus", function () { state.editing = true; });
        inp.addEventListener("blur", function () { state.editing = false; if (inp.value !== an.headers[ci]) renameCol(ci, inp.value); });
        inp.addEventListener("keydown", function (e) { if (e.key === "Enter") inp.blur(); });
        c.appendChild(inp);
      } else {
        c.textContent = an.headers[ci];
      }
      hd.appendChild(c);
    })(i);
  }
}

function renderVisible() {
  var box = $("vbody");
  var scroller = $("scroll");
  var an = activeSheet();
  if (!an) { box.innerHTML = ""; return; }
  var rows = filteredRows(an);
  var count = rows.length;
  if (state.settings.hasHeader === false && !isPaged(an)) { /* headerless: keep display as-is */ }
  state.viewH = scroller.clientHeight || state.viewH || 600;
  var vp = state.viewH;
  box.style.height = vp + "px";
  var start = Math.max(0, Math.floor(state.scrollTop / ROW_HEIGHT) - VISIBLE_BUFFER);
  var end = Math.min(count, Math.ceil((state.scrollTop + vp) / ROW_HEIGHT) + VISIBLE_BUFFER);
  if (state.editing) return;
  box.innerHTML = "";
  var frag = document.createDocumentFragment();
  for (var i = start; i < end; i++) {
    (function (idx) {
      var row = rows[idx];
      var el = document.createElement("div");
      el.className = "rowelt" + (state.selRows[idx] ? " selrow" : "");
      el.style.top = (idx * ROW_HEIGHT - state.scrollTop) + "px";
      el.style.height = ROW_HEIGHT + "px";
      var ridx = document.createElement("div");
      ridx.className = "rowidx" + (state.selRows[idx] ? " sel" : "");
      ridx.textContent = idx + 1;
      el.appendChild(ridx);
      for (var j = 0; j < an.headers.length; j++) {
        (function (ci) {
          var ce = document.createElement("div");
          ce.className = "ce" + (state.selCols[ci] ? " selcol" : "");
          var inp = document.createElement("input");
          inp.value = (row && row[ci] !== undefined && row[ci] !== null) ? String(row[ci]) : "";
          var isUnloaded = (isPaged(an) && idx >= an.loaded) || isPreview(an);
          if (isUnloaded) inp.setAttribute("readonly", "true");
          inp.addEventListener("focus", function () {
            state.editing = true;
            setActiveCell(idx, ci);
          });
          inp.addEventListener("blur", function () { state.editing = false; });
          inp.addEventListener("input", function () { cellInput(idx, ci, inp.value); });
          inp.addEventListener("change", function () { cellInput(idx, ci, inp.value); });
          ce.appendChild(inp);
          el.appendChild(ce);
        })(j);
      }
      frag.appendChild(el);
    })(i);
  }
  box.appendChild(frag);
  updateScrollbar();
  maybeLoadMore(start, end);
}

function maxScrollPx() {
  var an = activeSheet();
  if (!an) return 0;
  var n = filteredRows(an).length;
  var vp = (state.viewH || $("scroll").clientHeight) || 600;
  return Math.max(0, n * ROW_HEIGHT - vp);
}

function scrollToPx(px) {
  var mx = maxScrollPx();
  state.scrollTop = Math.max(0, Math.min(mx, px));
  renderVisible();
}

function updateScrollbar() {
  var sb = $("scrollbar");
  var th = $("thumb");
  if (!sb || !th) return;
  var vp = state.viewH || ($("scroll").clientHeight || 600);
  var mx = maxScrollPx();
  if (mx <= 0) { sb.style.visibility = "hidden"; return; }
  sb.style.visibility = "visible";
  var trackH = sb.clientHeight || vp;
  var thH = Math.max(24, (vp / (mx + vp)) * trackH);
  th.style.height = thH + "px";
  th.style.top = ((trackH - thH) * (state.scrollTop / mx)) + "px";
}

function setActiveCell(row, col) {
  state.activeCell = { row: row, col: col };
  state.selRows = {}; state.selCols = {};
  state.selRowCount = 0; state.selColCount = 0;
  renderRowClasses();
  renderGridHeader();
  renderStatus();
}

function renderRowClasses() {
  var box = $("vbody");
  var it = box.children;
  for (var i = 0; i < it.length; i++) {
    var el = it[i];
    var idx = Math.round((Number(el.style.top) + state.scrollTop) / ROW_HEIGHT);
    el.className = el.className.replace(/\bselrow\b/g, "");
    if (state.selRows[idx]) el.className += " selrow";
    var rn = el.querySelector(".rowidx");
    if (rn) { rn.className = "rowidx"; if (state.selRows[idx]) rn.className += " sel"; }
  }
}

function maybeLoadMore(startNonce, endNonce) {
  var an = activeSheet();
  if (!an || !isPaged(an)) return;
  if (an.loaded >= an.totalRows) return;
  var viewport = $("scroll").clientHeight || 600;
  var nearBottom = state.scrollTop + viewport >= an.loaded * ROW_HEIGHT - 600;
  if (nearBottom) {
    var chunk = Math.min(PAGE, an.totalRows - an.loaded);
    var res = JSON.parse(xcall("read_rows", an.session, an.loaded, chunk));
    if (res.ok) {
      an.rows = an.rows.concat(res.data);
      an.loaded = an.rows.length;
      renderStatus();
      renderVisible();
    }
  }
}

function cellInput(idx, ci, val) {
  var an = activeSheet();
  if (!an) return;
  if (isPreview(an)) return;
  if (isPaged(an)) {
    if (idx >= an.loaded) return;
    if (!an.rows[idx]) an.rows[idx] = [];
    an.rows[idx][ci] = val;
    an.edits[idx] = JSON.parse(JSON.stringify(an.rows[idx]));
  } else {
    if (!an.rows[idx]) an.rows[idx] = [];
    an.rows[idx][ci] = val;
  }
  an.dirty = true;
  if (state.activeCell && state.activeCell.row === idx && state.activeCell.col === ci) renderStatus();
}

function renderStatus() {
  var an = activeSheet();
  if (!an) { return; }
  if (state.processing) { $("status-dot").className = "busy"; $("status-text").textContent = t("processing"); }
  else { $("status-dot").className = ""; $("status-text").textContent = t("idle"); }
  $("st-file").textContent = an.name;
  $("st-lang").textContent = state.lang;
  $("st-rows").textContent = fmtNum(an.totalRows);
  $("st-cols").textContent = an.headers.length;
  $("st-format").textContent = "[" + (state.settings.delimiter === "\t" ? "TAB" : state.settings.delimiter) + "] / UTF-8 / HDR:" + (state.settings.hasHeader ? "ON" : "OFF");
  var info = $("st-info");
  if (state.selRowCount > 0) info.textContent = t("rowsSelected").replace("{n}", state.selRowCount) + "  " + (an.mode === "paged" ? t("pagedMode") : t("dataMode"));
  else if (state.selColCount > 0) info.textContent = t("colsSelected").replace("{n}", state.selColCount);
  else if (state.activeCell) {
    var v = cellAt(an, state.activeCell.row, state.activeCell.col);
    info.textContent = t("cellActive").replace("{col}", String(an.headers[state.activeCell.col] || "?").toUpperCase()).replace("{row}", state.activeCell.row + 1).replace("{len}", v ? String(v).length : 0);
  } else info.textContent = t("gridEngine");
  $("brand-sheet-name").textContent = an.name;
}

function cellAt(an, row, col) {
  var r = an.rows[row];
  return r ? r[col] : "";
}

function renderDataMenu() {
  var box = $("data-addon-menu");
  box.innerHTML = "";
  var list = pyAddonsFor("data");
  for (var i = 0; i < list.length; i++) (function (a) {
    var b = document.createElement("button");
    b.setAttribute("data-act", "run-addon");
    b.setAttribute("data-id", a.id);
    b.innerHTML = "<span class=\"emoji\">" + (ICONS[a.icon] || ICON_FALLBACK) + "</span>" + a.name;
    box.appendChild(b);
  })(list[i]);
  var b2 = document.createElement("button");
  b2.setAttribute("data-act", "toggle-panel");
  b2.innerHTML = "<i class=\"ic ic-puzzle\"></i>" + t("pluginsPanel");
  box.appendChild(b2);
  var tools = $("tools-addon-menu");
  tools.innerHTML = "";
  var toolsList = pyAddonsFor("tools");
  for (var j = 0; j < toolsList.length; j++) (function (a) {
    var b = document.createElement("button");
    b.setAttribute("data-act", "run-addon");
    b.setAttribute("data-id", a.id);
    b.innerHTML = "<span class=\"emoji\">" + (ICONS[a.icon] || ICON_FALLBACK) + "</span>" + a.name;
    tools.appendChild(b);
  })(toolsList[j]);
}

function pyAddonsFor(which) {
  return state.pyAddons.filter(function (a) {
    if (which === "data") return a.category === "Data" || a.category === "Format";
    if (which === "tools") return a.category === "AI" || a.category === "Analysis";
    return true;
  });
}

function isInstalled(id) {
  for (var i = 0; i < state.pyAddons.length; i++) if (state.pyAddons[i].id === id) return true;
  return state.demoInstalled.indexOf(id) >= 0;
}
function installedAddon(id) {
  for (var i = 0; i < state.pyAddons.length; i++) if (state.pyAddons[i].id === id) return state.pyAddons[i];
  for (var j = 0; j < state.demoInstalled.length; j++) if (state.demoInstalled[j].id === id) return state.demoInstalled[j];
  for (var k = 0; k < MARKETPLACE.length; k++) if (MARKETPLACE[k].id === id) return MARKETPLACE[k];
  return null;
}

function renderPanel() {
  $("addon-panel").className = "closed";
  if (state.panelOpen) $("addon-panel").className = "";
  var box = $("panel-addons");
  box.innerHTML = "";
  var list = [];
  for (var i = 0; i < state.pyAddons.length; i++) list.push(state.pyAddons[i]);
  for (var j = 0; j < state.demoInstalled.length; j++) list.push(state.demoInstalled[j]);
  if (!list.length) {
    var empty = document.createElement("p");
    empty.textContent = t("notInstalledError");
    box.appendChild(empty);
  }
  for (var k = 0; k < list.length; k++) (function (a) {
    var d = document.createElement("div");
    d.className = "panel-addon";
    var h = document.createElement("h3");
    h.textContent = (ICONS[a.icon] || ICON_FALLBACK) + " " + a.name;
    var p = document.createElement("p");
    p.textContent = a.description || "";
    var b = document.createElement("button");
    b.className = "run";
    b.textContent = state.processing ? t("working") : t("execute");
    b.setAttribute("data-act", "run-addon");
    b.setAttribute("data-id", a.id);
    if (state.processing) b.disabled = true;
    d.appendChild(h); d.appendChild(p); d.appendChild(b);
    box.appendChild(d);
  })(list[k]);
  var more = document.createElement("button");
  more.className = "browse-more";
  more.setAttribute("data-act", "open-addon");
  more.innerHTML = "<i class=\"ic ic-plus\"></i>" + t("browseMarket");
  box.appendChild(more);
}

function renderMarket() {
  var box = $("market-list");
  box.innerHTML = "";
  var q = state.marketQuery.toLowerCase();
  for (var i = 0; i < MARKETPLACE.length; i++) {
    (function (a) {
      if (a.name.toLowerCase().indexOf(q) < 0) return;
      var d = document.createElement("div");
      d.className = "addon-tile";
      if (isInstalled(a.id)) {
        var tag = document.createElement("div");
        tag.className = "installed-tag";
        tag.textContent = t("installed");
        d.appendChild(tag);
      }
      var ic = document.createElement("div");
      ic.className = "tile-icon";
      ic.textContent = (ICONS[a.icon] || ICON_FALLBACK);
      var h = document.createElement("h4");
      h.textContent = a.name;
      var pr = document.createElement("span");
      pr.className = "price " + (String(a.price).indexOf("$") >= 0 ? "paid" : "free");
      pr.textContent = a.price;
      var p = document.createElement("p");
      p.textContent = a.desc;
      var meta = document.createElement("div");
      meta.className = "tile-meta";
      var d1 = document.createElement("div");
      d1.innerHTML = "<span>" + t("installs") + "</span><b>" + a.installs + "</b>";
      var sep = document.createElement("i");
      var d2 = document.createElement("div");
      d2.innerHTML = "<span>" + t("category") + "</span><b>" + a.category + "</b>";
      meta.appendChild(d1); meta.appendChild(sep); meta.appendChild(d2);
      var ins = document.createElement("button");
      ins.className = "install " + (isInstalled(a.id) ? "done" : "go");
      ins.textContent = isInstalled(a.id) ? t("readyToUse") : t("installPlugin");
      ins.setAttribute("data-act", isInstalled(a.id) ? "run-addon" : "install-addon");
      ins.setAttribute("data-id", a.id);
      d.appendChild(ic); d.appendChild(h); d.appendChild(pr); d.appendChild(p); d.appendChild(meta); d.appendChild(ins);
      box.appendChild(d);
    })(MARKETPLACE[i]);
  }
}

function renderManage() {
  var box = $("manage-list");
  box.innerHTML = "";
  var hint = document.createElement("p");
  hint.style.cssText = "font-size:12px;color:#a1a1aa;margin:0 0 16px;";
  hint.textContent = t("manageHint");
  box.appendChild(hint);
  var list = [];
  for (var i = 0; i < state.pyAddons.length; i++) list.push({ a: state.pyAddons[i], canRemove: false });
  for (var j = 0; j < state.demoInstalled.length; j++) list.push({ a: state.demoInstalled[j], canRemove: true });
  if (!list.length) {
    var e = document.createElement("p");
    e.textContent = t("notInstalledError");
    box.appendChild(e);
    return;
  }
  for (var k = 0; k < list.length; k++) (function (item) {
    var d = document.createElement("div");
    d.className = "manage-item";
    d.innerHTML = "<div class=\"tile-icon\" style=\"width:40px;height:40px;font-size:20px;border-radius:12px;background:#fafafa;display:flex;align-items:center;justify-content:center;\">" + (ICONS[item.a.icon] || "\u{1F512}") + "</div>";
    var txt = document.createElement("div");
    txt.style.cssText = "flex:1;";
    var h = document.createElement("h4");
    h.textContent = item.a.name;
    var p = document.createElement("p");
    p.textContent = item.a.description || "";
    txt.appendChild(h); txt.appendChild(p);
    d.appendChild(txt);
    if (item.canRemove) {
      var rm = document.createElement("button");
      rm.className = "remove";
      rm.textContent = t("remove");
      rm.setAttribute("data-act", "uninstall-addon");
      rm.setAttribute("data-id", item.a.id);
      d.appendChild(rm);
    }
    box.appendChild(d);
  })(list[k]);
}

/* palette */
function commands() {
  var an = activeSheet();
  var list = [
    { name: t("addRow"), desc: "Insert new blank row at top", icon: "plus", action: addRow, disabled: isPaged(an) || isPreview(an) },
    { name: t("addCol"), desc: "Append a new column to the grid", icon: "plus", action: addColumn, disabled: isPaged(an) || isPreview(an) },
    { name: t("sortActive"), desc: "Sort by currently active column", icon: "sort", action: sortByActive, disabled: !state.activeCell || isPaged(an) || isPreview(an) },
    { name: t("delete"), desc: "Remove all selected rows/cols", icon: "trash", action: bulkDelete, disabled: isPaged(an) || isPreview(an) || (!state.selRowCount && !state.selColCount && !state.activeCell) },
    { name: "Export CSV", desc: "Download as standard CSV", icon: "table", action: function () { exportAs("csv"); } },
    { name: "Export Excel", desc: "Download as XLSX Worksheet", icon: "file", action: function () { exportAs("xlsx"); } },
    { name: "Export JSON", desc: "Download as JSON objects", icon: "json", action: function () { exportAs("json"); } },
    { name: t("save"), desc: "Persist current workspace", icon: "save", action: handleSave },
    { name: t("marketplace"), desc: "Browse available plugins", icon: "puzzle", action: function () { openAddonModal("marketplace"); } },
    { name: t("clearSelect"), desc: "Reset all active highlights", icon: "spark", action: clearSelection }
  ];
  var addons = [];
  for (var i = 0; i < state.pyAddons.length; i++) addons.push(state.pyAddons[i]);
  for (var j = 0; j < state.demoInstalled.length; j++) addons.push(state.demoInstalled[j]);
  for (var k = 0; k < addons.length; k++) (function (a) {
    list.push({ name: t("execute") + " " + a.name, desc: a.description || "", icon: a.icon, action: function () { runAddon(a.id); } });
  })(addons[k]);
  return list;
}

function renderPalette() {
  var box = $("palette-list");
  var input = $("palette-input").value.toLowerCase();
  var cmds = commands().filter(function (c) { return !input || c.name.toLowerCase().indexOf(input) >= 0; });
  box.innerHTML = "";
  if (!cmds.length) {
    var e = document.createElement("div");
    e.style.cssText = "padding:40px;text-align:center;color:#a1a1aa;";
    e.textContent = "No matching commands found.";
    box.appendChild(e);
    return;
  }
  if (state.cmdIdx >= cmds.length) state.cmdIdx = 0;
  for (var i = 0; i < cmds.length; i++) (function (c) {
    var b = document.createElement("button");
    b.className = "pcmd" + (c.disabled ? " disabled" : "") + (state.cmdIdx === i ? " on" : "");
    b.style.cssText += (i === 0 && !c.disabled ? "background:#eef2ff;" : "");
    var ic = document.createElement("div");
    ic.className = "pic";
    ic.innerHTML = "<span style=\"font-size:16px;\">" + (ICONS[c.icon] || c.icon || "\u276f") + "</span>";
    var txt = document.createElement("div");
    txt.style.cssText = "flex:1;";
    var h = document.createElement("h4");
    h.textContent = c.name;
    var p = document.createElement("p");
    p.textContent = c.desc;
    txt.appendChild(h); txt.appendChild(p);
    b.appendChild(ic); b.appendChild(txt);
    b.setAttribute("data-cmd", i);
    box.appendChild(b);
  })(cmds[i]);
  state._cmds = cmds;
}

/* ---------- settings UI ---------- */
function renderSettingsUI() {
  var l1 = $("lang-en"), l2 = $("lang-vi");
  if (state.lang === "vi") { l1.className = ""; l2.className = "on"; }
  else { l1.className = "on"; l2.className = ""; }
  var d = state.settings.delimiter;
  var btns = document.querySelectorAll("#settings .btn-grid4 button");
  for (var i = 0; i < btns.length; i++) {
    var want = btns[i].getAttribute("data-act").replace("delim-", "");
    btns[i].className = (want === d || (want === "tab" && d === "\t")) ? "on" : "";
  }
  var sw = $("switch-hdr");
  sw.className = "switch" + (state.settings.hasHeader ? " on" : "");
}

/* ---------- actions ---------- */
function switchSheet(id) { state.activeId = id; clearSelection(); renderAll(); }

function addRow() {
  var an = activeSheet();
  if (!an || isPaged(an) || isPreview(an)) { notify(t("addRowFail"), "error"); return; }
  var blank = []; for (var i = 0; i < an.headers.length; i++) blank.push("");
  an.rows.unshift(blank);
  an.totalRows = an.rows.length; an.loaded = an.rows.length; an.dirty = true;
  renderVisible(); renderStatus(); notify(t("addRowTop"), "info");
}

function addColumn() {
  var an = activeSheet();
  if (!an || isPaged(an) || isPreview(an)) { notify(t("addColFail"), "error"); return; }
  simplePrompt(t("promptCol"), t("cols") + " " + (an.headers.length + 1), function (name) {
    if (name === null) return;
    var trimmed = String(name || "").trim();
    if (!trimmed) { notify(t("colEmptyError"), "error"); return; }
    if (an.headers.indexOf(trimmed) >= 0) { notify(t("colExistsError"), "error"); return; }
    an.headers.push(trimmed);
    for (var i = 0; i < an.rows.length; i++) an.rows[i].push("");
    an.dirty = true;
    renderAll(); notify(t("cols") + " \"" + trimmed + "\" added", "success");
  });
}

function renameCol(ci, newName) {
  var an = activeSheet();
  if (!an) return;
  var old = an.headers[ci];
  var trimmed = newName.trim();
  if (!trimmed) { notify(t("colEmptyError"), "error"); renderGridHeader(); return; }
  if (trimmed !== old && an.headers.indexOf(trimmed) >= 0) { notify(t("colExistsError"), "error"); renderGridHeader(); return; }
  if (trimmed !== old) {
    an.headers[ci] = trimmed;
    an.dirty = true;
    notify(t("renamed").replace("{a}", old).replace("{b}", trimmed), "info");
  }
  renderGridHeader();
}

function sortByActive() {
  var an = activeSheet();
  if (!an || !state.activeCell) { notify(t("sort") + " ...", "info"); return; }
  if (isPaged(an) || isPreview(an)) { notify(t("sortFailPaged"), "error"); return; }
  sortData(state.activeCell.col);
}
function sortData(ci) {
  var an = activeSheet();
  var dir = "asc";
  if (state.sort && state.sort.col === ci && state.sort.direction === "asc") dir = "desc";
  state.sort = { col: ci, direction: dir };
  renderVisible();
  if (state.activeCell) state.activeCell.col = ci;
  notify(t("sortBy").replace("{c}", an.headers[ci]).replace("{d}", dir), "info");
}

function bulkDelete() {
  var an = activeSheet();
  if (!an) return;
  if (isPaged(an) || isPreview(an)) { notify(t("deleteFailPaged"), "error"); return; }
  var rows0 = filteredRows(an);
  var toDelete = {};
  if (state.selRowCount > 0) {
    var keys = Object.keys(state.selRows);
    for (var i = 0; i < keys.length; i++) {
      var obj = rows0[Number(keys[i])];
      var oi = an.rows.indexOf(obj);
      if (oi >= 0) toDelete[oi] = true;
    }
  }
  if (state.selColCount > 0) {
    var cols = Object.keys(state.selCols).map(Number);
    for (var c = cols.length - 1; c >= 0; c--) {
      an.headers.splice(cols[c], 1);
      for (var r = 0; r < an.rows.length; r++) an.rows[r].splice(cols[c], 1);
    }
  }
  if (state.selRowCount === 0 && state.selColCount === 0 && state.activeCell) {
    var obj2 = rows0[state.activeCell.row];
    var oi2 = an.rows.indexOf(obj2);
    if (oi2 >= 0) toDelete[oi2] = true;
  }
  var dk = Object.keys(toDelete).map(Number).sort(function (a, b) { return b - a; });
  for (var j = 0; j < dk.length; j++) an.rows.splice(dk[j], 1);
  an.totalRows = an.rows.length; an.loaded = an.rows.length;
  an.edits = {}; an.dirty = true;
  clearSelection();
  renderAll();
  notify(t("selectedDeleted"), "info");
}

function clearSelection() {
  state.selRows = {}; state.selCols = {}; state.selRowCount = 0; state.selColCount = 0;
  state.activeCell = null;
  renderAll();
}

function closeTab(id) {
  if (state.sheets.length <= 1) return;
  var idx = -1;
  for (var i = 0; i < state.sheets.length; i++) if (state.sheets[i].id === id) { idx = i; break; }
  if (idx < 0) return;
  state.sheets.splice(idx, 1);
  if (state.activeId === id) state.activeId = state.sheets[Math.min(idx, state.sheets.length - 1)].id;
  renderAll();
  notify(t("tabClosed"), "info");
}

function handleSave() {
  var an = activeSheet();
  var payload = {
    activeSheetId: state.activeId,
    csvSettings: state.settings,
    sheets: []
  };
  for (var i = 0; i < state.sheets.length; i++) {
    var s = state.sheets[i];
    var rec = { id: s.id, name: s.name, mode: s.mode, session: s.session, path: s.path, headers: s.headers, totalRows: s.totalRows, dirty: s.dirty };
    if (s.mode === "mem" && s.path) rec.edits = hashRows(s.rows);
    else if (s.mode === "mem") {
      if (s.rows.length <= 2000) rec.rows = s.rows;
      else rec.rows = [];
    } else rec.edits = s.edits;
    payload.sheets.push(rec);
  }
  var res = JSON.parse(xcall("save_workspace", JSON.stringify(payload)));
  if (res.ok) notify(t("saveSuccess"), "success");
  else notify(t("fileNotSaved"), "error");
}
function hashRows(rows) {
  var out = {};
  for (var i = 0; i < rows.length; i++) out[String(i)] = rows[i].slice();
  return out;
}

function loadWorkspace() {
  var raw = xcall("load_workspace");
  var data = null;
  try { data = JSON.parse(raw); } catch (err) { data = null; }
  if (!data || (!data.sheets && !data.csvSettings)) return false;
  if (data.csvSettings) state.settings = data.csvSettings;
  if (data.activeSheetId && sheetExists(data.activeSheetId)) state.activeId = data.activeSheetId;
  var restored = false;
  if (data.sheets && data.sheets.length) {
    state.sheets = [];
    for (var i = 0; i < data.sheets.length; i++) {
      (function (rec) {
        var s = newSheet(rec.name, rec.headers && rec.headers.slice(), []);
        s.id = rec.id; s.mode = rec.mode; s.session = rec.session || null; s.path = rec.path || null;
        s.totalRows = rec.totalRows != null ? rec.totalRows : 0;
        s.edits = rec.edits || {};
        if (rec.rows) { s.rows = rec.rows; s.totalRows = rec.rows.length; s.loaded = rec.rows.length; }
        if (s.path) {
          s.mode = "preview";
          restored = true;
          /* Async restore: preview fills the sheet instantly, then the ready
             payload (session id + mode + total rows) upgrades it in place. */
          openPathAsync(s.path, function (res) {
            if (!res || !res.ok) return;
            if (s.edits) {
              var rek = Object.keys(s.edits);
              for (var e = 0; e < rek.length; e++) {
                var idx = Number(rek[e]);
                if (idx < s.loaded) { s.rows[idx] = s.edits[rek[e]].slice(); }
              }
            }
            if (state.activeId === s.id) renderAll();
          }, state.settings.delimiter, state.settings.hasHeader ? "1" : "0", { placeholder: s });
        }
        state.sheets.push(s);
      })(data.sheets[i]);
    }
    if (!state.sheets.length) state.sheets.push(initialSheet());
  } else {
    state.sheets = [initialSheet()];
  }
  if (!state.activeId || !sheetExists(state.activeId)) state.activeId = state.sheets[0].id;
  return restored;
}
function sheetExists(id) {
  for (var i = 0; i < state.sheets.length; i++) if (state.sheets[i].id === id) return true;
  return false;
}

function handleSaveToFile() {
  var an = activeSheet();
  if (!an) return;
  if (isPreview(an)) { notify(t("loading"), "error"); return; }
  if (!isPaged(an)) {
    if (an.path) {
      var res = JSON.parse(xcall("write_path", an.path, JSON.stringify(an.headers), JSON.stringify(an.rows), state.settings.hasHeader ? "1" : "0", state.settings.delimiter));
      if (res.ok) { notify(t("fileSaved").replace("{p}", an.path), "success"); an.dirty = false; }
      else notify(res.err || t("fileNotSaved"), "error");
    } else {
      var res2 = JSON.parse(xcall("save_as", an.name.replace(/\.[^.]+$/, "") + ".csv", JSON.stringify(an.headers), JSON.stringify(an.rows), state.settings.hasHeader ? "1" : "0", state.settings.delimiter));
      if (res2.ok && !res2.cancelled) notify(t("fileSaved").replace("{p}", res2.data ? res2.data.path : ""), "success");
    }
  } else {
    var job = JSON.parse(xcall("save_async", an.session, JSON.stringify(Object.keys(an.edits).length ? an.edits : {})));
    if (!job.ok) { notify(job.err || t("fileNotSaved"), "error"); return; }
    showSpinner(t("saving"));
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      var st = JSON.parse(xcall("save_tick", job.job));
      if (st.pending) { if (tries > 60000) notify(t("fileNotSaved"), "error"); return; }
      clearInterval(timer);
      hideSpinner();
      if (st.ok) {
        notify(t("fileSaved").replace("{p}", st.data && st.data.path ? st.data.path : an.path), "success");
        an.dirty = false;
      } else notify(st.err || t("fileNotSaved"), "error");
    }, 120);
  }
}

function exportAs(format) {
  var an = activeSheet();
  if (!an) return;
  if (isPaged(an) || isPreview(an)) { notify(t("unsupportedPaged"), "error"); return; }
  if (format === "xlsx") { notify(t("unsupportedFormat"), "error"); return; }
  var base = (an.name || "export").split(".")[0] || "export";
  var content = null, ext = format, name = base + "." + ext;
  if (format === "csv" || format === "tsv") {
    content = unparseCSV(an.headers, an.rows, format === "tsv" ? "\t" : state.settings.delimiter, state.settings.hasHeader);
  } else if (format === "json") {
    content = JSON.stringify(an.rows, null, 2);
  } else if (format === "md") {
    var lines = ["| " + an.headers.join(" | ") + " |"];
    lines.push("| " + an.headers.map(function () { return "---"; }).join(" | ") + " |");
    for (var i = 0; i < an.rows.length; i++) {
      lines.push("| " + an.headers.map(function (h, ci) { return cellAt(an, i, ci) || ""; }).join(" | ") + " |");
    }
    content = lines.join("\n");
  }
  if (content === null) return;
  var res = JSON.parse(xcall("export", name, content));
  if (res.ok && !res.cancelled) notify("Exported as " + format.toUpperCase(), "success");
  else if (res.err) notify(res.err, "error");
}
function unparseCSV(headers, rows, delim, withHeader) {
  function q(f) { f = String(f === null || f === undefined ? "" : f); if (/[",\n\r]/.test(f) || f.indexOf(delim) >= 0) return "\"" + f.replace(/"/g, "\"\"") + "\""; return f; }
  var out = [];
  if (withHeader) out.push(headers.map(q).join(delim));
  for (var i = 0; i < rows.length; i++) out.push(rows[i].map(q).join(delim));
  return out.join("\n");
}

/* ---------- file open ---------- */
function showSpinner(text) {
  var el = $("spinner");
  if (el) { $("spinner-text").textContent = text || t("loading"); el.setAttribute("class", ""); }
}
function hideSpinner() {
  var el = $("spinner");
  if (el) el.setAttribute("class", "hidden");
}

/* Async open (two-phase): the Rust worker first streams a preview of the file head
   (instant, no whole-file scan), then builds the full offset index and produces the
   "ready" payload. `openPathAsync` shows the preview sheet immediately and upgrades
   it in place when the ready payload arrives — so even a 10GB file never freezes. */
function openPathAsync(path, cb, delim, hdr, opts) {
  var d = delim != null ? delim : state.settings.delimiter;
  var h = hdr != null ? hdr : (state.settings.hasHeader ? "1" : "0");
  showSpinner(t("loading"));
  var jobRes = JSON.parse(xcall("open_async", path, d, h));
  if (!jobRes.ok) { hideSpinner(); notify(jobRes.err || t("openErr"), "error"); return; }
  var target = opts && opts.placeholder ? opts.placeholder : null;
  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    var st = JSON.parse(xcall("open_tick", jobRes.job));
    if (st.pending) {
      if (tries > 3000) { clearInterval(timer); hideSpinner(); notify(t("openErr"), "error"); }
      return;
    }
    if (!st.ok) { clearInterval(timer); hideSpinner(); notify(st.err || t("openErr"), "error"); xcall("log", "open_tick err=" + (st.err || "unknown")); return; }
    if (st.preview) {
      hideSpinner();
      state.processing = true;
      xcall("log", "open preview rows=" + (st.rows ? st.rows.length : 0));
      if (!target) target = addFileSheetPreview(st);
      else fillSheetPreview(target, st);
      renderStatus();
      return; /* keep polling for the ready payload */
    }
    clearInterval(timer);
    hideSpinner();
    state.processing = false;
    xcall("log", "open ready rowTotal=" + st.total_rows + " mode=" + st.mode);
    try {
      if (target) finishFileSheet(target, st);
      else addFileSheet(st);
      renderStatus();
    } catch (e) { xcall("log", "open ready render threw: " + e); }
    if (cb) { try { cb(st); } catch (e2) { xcall("log", "open cb threw: " + e2); } }
  }, 120);
}

function addFileSheetPreview(st) {
  var s = newSheet(st.name, st.headers, st.rows);
  s.session = null; s.path = st.path; s.mode = "preview";
  s.totalRows = s.rows.length; s.loaded = s.rows.length;
  state.sheets.push(s);
  state.activeId = s.id;
  clearSelection();
  renderAll();
  return s;
}

function fillSheetPreview(s, st) {
  s.headers = (st.headers || []).slice();
  s.rows = st.rows || [];
  s.totalRows = s.rows.length; s.loaded = s.rows.length;
  s.path = st.path; s.mode = "preview";
}

function finishFileSheet(s, st) {
  s.session = st.id; s.path = st.path; s.mode = st.mode; s.headers = st.headers;
  s.totalRows = st.total_rows; s.rows = st.rows; s.loaded = st.rows.length;
  renderAll();
}

function openFile() {
  var res = JSON.parse(xcall("open_file", state.settings.delimiter, state.settings.hasHeader ? "1" : "0"));
  if (res && res.cancelled) return;
  if (!res.ok || !res.path) { notify(res.err || t("importFailed"), "error"); return; }
  openPathAsync(res.path, function () { notify(t("fileImported"), "success"); });
}
function addFileSheet(res) {
  var s = newSheet(res.name, res.headers, res.rows);
  s.session = res.id; s.path = res.path; s.mode = res.mode; s.totalRows = res.total_rows; s.loaded = res.rows.length;
  state.sheets.push(s);
  state.activeId = s.id;
  clearSelection();
  renderAll();
}

/* ---------- addons ---------- */
function refreshAddons() {
  var res = JSON.parse(xcall("list_addons"));
  if (res.ok) { state.pyAddons = res.data || []; }
  renderDataMenu(); renderPanel(); renderManage();
}
function runAddon(id) {
  var an = activeSheet();
  var addon = installedAddon(id);
  if (!addon) { notify(t("notInstalledError"), "error"); return; }
  if (addon.demo) { notify(t("addonDemo").replace("{a}", addon.name), "info"); return; }
  if (!an) return;
  if (isPreview(an)) { notify(t("loading"), "error"); return; }
  if (addon.kind === "big") {
    if (!an.path) { notify(t("noFileBacked"), "error"); return; }
    state.processing = true; renderStatus(); renderPanel();
    var res = JSON.parse(xcall("run_big", addon.id, addon.name, an.path));
    state.processing = false;
    if (res.ok) {
      var msg = (res.data && res.data.message) || "";
      var failed = res.data && res.data.ok === false;
      msg ? notify(msg, failed ? "error" : "success") : notify(t("addonRun").replace("{a}", addon.name), failed ? "error" : "success");
      refreshAddons();
    } else notify(t("addonErr").replace("{a}", addon.name) + ": " + (res.err || ""), "error");
    renderStatus(); renderPanel();
    return;
  }
  /* small */
  var rows = an.rows;
  if (isPaged(an) && an.loaded < an.totalRows) notify(t("searchPagedHint"), "info");
  state.processing = true; renderStatus(); renderPanel();
  var res2 = JSON.parse(xcall("run_small", addon.id, addon.name, JSON.stringify(an.headers), JSON.stringify(rows)));
  state.processing = false;
  if (res2.ok && res2.data && res2.data.rows) {
    var newRows = res2.data.rows;
    if (!isPaged(an)) {
      if (newRows.length > 0 && Array.isArray(newRows[0]) && newRows[0].length === an.headers.length) {
        an.rows = newRows;
      } else {
        notify("Row shape mismatch - keeping current data", "error");
        renderStatus(); renderPanel();
        return;
      }
      an.totalRows = an.rows.length; an.loaded = an.rows.length;
    } else {
      for (var i = 0; i < newRows.length && i < an.loaded; i++) {
        an.rows[i] = newRows[i].slice();
        an.edits[i] = newRows[i].slice();
      }
    }
    an.dirty = true;
    state.sort = null;
    renderVisible(); renderStatus(); renderPanel();
    notify(res2.data.message || t("addonRun").replace("{a}", addon.name), "success");
  } else {
    notify(t("addonErr").replace("{a}", addon.name) + (res2.err ? ": " + res2.err : ""), "error");
    renderStatus(); renderPanel();
  }
}
function uninstallAddon(id) {
  state.demoInstalled = state.demoInstalled.filter(function (a) { return a.id !== id; });
  renderManage(); renderPanel(); renderDataMenu();
  notify("Addon removed", "info");
}
function installAddon(id) {
  if (isInstalled(id)) { notify("already installed", "info"); return; }
  var a = installedAddon(id);
  if (a && a.demo) state.demoInstalled.push(a);
  renderManage(); renderPanel(); renderMarket(); renderDataMenu();
  notify((a ? a.name : id) + " added to your workspace!", "success");
}

/* ---------- modals ---------- */
function showModal(id) { $(id).style.display = "flex"; }
function hideModal(id) { $(id).style.display = "none"; }
function openAddonModal(tab) {
  closeAllDropdowns();
  state.addonTab = tab || "marketplace";
  state.showAddon = true;
  $("addon-modal").style.display = "flex";
  setAddonTab(state.addonTab);
}
function setAddonTab(tab) {
  state.addonTab = tab;
  $("tab-market").className = "on";
  $("tab-manage").className = "";
  $("tab-doc").className = "";
  var tgt = null;
  if (tab === "management") { $("tab-manage").className = "on"; tgt = "addon-manage"; }
  else if (tab === "documentation") { $("tab-doc").className = "on"; tgt = "addon-doc"; }
  else { $("tab-market").className = "on"; tgt = "addon-market"; if (state.marketQuery) $("market-list").style.display = "flex"; }
  $("addon-market").className = tgt === "addon-market" ? "" : "tab-pane";
  $("addon-manage").className = tgt === "addon-manage" ? "" : "tab-pane";
  $("addon-doc").className = tgt === "addon-doc" ? "" : "tab-pane";
  renderManage();
}

function closeAllDropdowns() {
  var dds = document.querySelectorAll(".dropdown.open");
  for (var i = 0; i < dds.length; i++) dds[i].className = "dropdown";
}

/* ---------- events ---------- */
document.addEventListener("click", function (e) {
  var target = e.target;
  /* dropdown toggle */
  var dd = closest(target, ".dropdown-wrap");
  var inDropdown = !!closest(target, ".dropdown");
  closeAllDropdowns();
  if (dd && !inDropdown) {
    var d = dd.querySelector(".dropdown");
    if (d) { d.className = "dropdown open"; return; }
  }
  /* tab switch */
  var tab = closest(target, "[data-tab]");
  if (tab && !closest(target, ".tclose")) { switchSheet(tab.getAttribute("data-tab")); return; }

  var actEl = closest(target, "[data-act]");
  if (actEl) {
    var act = actEl.getAttribute("data-act");
    var id = actEl.getAttribute("data-id") || "";
    handleAct(act, id);
  }
});

function handleAct(act, id) {
  switch (act) {
    case "open-file": closeAllDropdowns(); openFile(); break;
    case "new-sheet": closeAllDropdowns(); { var s = initialSheet(); state.sheets.push(s); state.activeId = s.id; clearSelection(); renderAll(); notify(t("newSheetCreated"), "info"); } break;
    case "save": closeAllDropdowns(); handleSave(); break;
    case "save-file": closeAllDropdowns(); handleSaveToFile(); break;
    case "reset": resetEnv(); break;
    case "open-settings": closeAllDropdowns(); $("settings").style.display = "flex"; break;
    case "open-addon": openAddonModal(id || "marketplace"); break;
    case "close-overlay": hideModal("settings"); hideModal("addon-modal"); closeAllDropdowns(); break;
    case "open-palette": openPalette(); break;
    case "close-tab": closeTab(id); break;
    case "close-tab-x": closeTab(id); break;
    case "add-row": addRow(); break;
    case "add-col": addColumn(); break;
    case "delete": bulkDelete(); break;
    case "clear-sel": clearSelection(); break;
    case "sort": sortByActive(); break;
    case "export-csv": exportAs("csv"); break;
    case "export-xlsx": exportAs("xlsx"); break;
    case "export-json": exportAs("json"); break;
    case "export-md": exportAs("md"); break;
    case "toggle-panel": state.panelOpen = !state.panelOpen; renderPanel(); break;
    case "run-addon": runAddon(id); break;
    case "install-addon": installAddon(id); break;
    case "uninstall-addon": uninstallAddon(id); break;
    case "addon-tab:marketplace": setAddonTab("marketplace"); break;
    case "addon-tab:management": setAddonTab("management"); break;
    case "addon-tab:documentation": setAddonTab("documentation"); break;
    case "lang-en": state.lang = "en"; renderSettingsUI(); renderAll(); break;
    case "lang-vi": state.lang = "vi"; renderSettingsUI(); renderAll(); break;
    case "toggle-hdr": state.settings.hasHeader = !state.settings.hasHeader; renderSettingsUI(); renderGridHeader(); renderStatus(); break;
    case "help-doc": openAddonModal("documentation"); break;
    case "about": notify(t("appTitle") + " v3.0.0", "info"); break;
    case "input-ok": { var cb2 = promptCallback; var v2 = $("input-value").value; closePrompt(); if (cb2) cb2(v2); } break;
    case "input-cancel": { var cb3 = promptCallback; closePrompt(); if (cb3) cb3(null); } break;
    default:
      if (act.indexOf("delim-") === 0) {
        var dl = act.slice(6);
        state.settings.delimiter = dl === "tab" ? "\t" : dl;
        renderSettingsUI();
      }
      break;
  }
}

/* grid header click: column selection (delegated via data-colh click on headers built by render) */
document.addEventListener("click", function (e) {
  var colEl = closest(e.target, "[data-colh]");
  if (colEl && !closest(e.target, "input")) {
    handleColClick(Number(colEl.getAttribute("data-colh")), e);
  }
});

document.addEventListener("click", function (e) {
  var idxEl = closest(e.target, ".rowidx");
  if (idxEl) { handleRowClick(rowIndexFromEl(idxEl), e); }
});

function rowIndexFromEl(el) {
  var parent = el.parentElement;
  if (!parent) return 0;
  return Math.round(Number(parent.style.top) / ROW_HEIGHT);
}

function handleRowClick(index, e) {
  var an = activeSheet();
  if (!an) return;
  var multi = e.ctrlKey || e.metaKey;
  var sel = {};
  if (multi) sel = JSON.parse(JSON.stringify(state.selRows));
  if (e.shiftKey && state.lastRow !== null) {
    var s = Math.min(state.lastRow, index), en2 = Math.max(state.lastRow, index);
    for (var i = s; i <= en2; i++) sel[i] = true;
  } else {
    if (sel[index]) delete sel[index];
    else sel[index] = true;
    state.lastRow = index;
  }
  state.selRows = sel; state.selCols = {}; state.selColCount = 0;
  state.selRowCount = Object.keys(sel).length;
  state.activeCell = null;
  renderRowClasses(); renderGridHeader(); renderStatus();
}

function handleColClick(ci, e) {
  var multi = e.ctrlKey || e.metaKey;
  var sel = {};
  if (multi) sel = JSON.parse(JSON.stringify(state.selCols));
  if (e.shiftKey && state.lastCol !== null) {
    var s = Math.min(state.lastCol, ci), en2 = Math.max(state.lastCol, ci);
    for (var i = s; i <= en2; i++) sel[i] = true;
  } else {
    if (sel[ci]) delete sel[ci];
    else sel[ci] = true;
    state.lastCol = ci;
  }
  state.selCols = sel; state.selRows = {}; state.selRowCount = 0;
  state.selColCount = Object.keys(sel).length;
  state.activeCell = null;
  renderRowClasses(); renderGridHeader(); renderStatus();
}

function openPalette() {
  state.showPalette = true; state.paletteQuery = ""; state.cmdIdx = 0;
  $("palette").style.display = "flex";
  $("palette-input").value = "";
  renderPalette();
  setTimeout(function () { try { $("palette-input").focus(); } catch (err) {} }, 10);
}

document.addEventListener("keydown", function (e) {
  var k = e.key || String.fromCharCode(e.keyCode || 0);
  var ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && k.toLowerCase() === "k") { e.preventDefault(); openPalette(); return; }
  if (ctrl && k.toLowerCase() === "s") { e.preventDefault(); handleSave(); return; }
  if (ctrl && k.toLowerCase() === "f") { e.preventDefault(); $("search-input").focus(); return; }
  if (k === "Escape") {
    if ($("input-modal").style.display === "flex") { closePrompt(); return; }
    if ($("palette").style.display === "flex") { hideModal("palette"); state.showPalette = false; return; }
    if ($("settings").style.display === "flex") hideModal("settings");
    if ($("addon-modal").style.display === "flex") { hideModal("addon-modal"); state.showAddon = false; }
    return;
  }
  if ($("palette").style.display === "flex") {
    var input = $("palette-input");
    if (k === "Enter") { e.preventDefault(); execPaletteCmd(); return; }
    if (k === "ArrowDown") { e.preventDefault(); state.cmdIdx++; renderPalette(); return; }
    if (k === "ArrowUp") { e.preventDefault(); state.cmdIdx = Math.max(0, state.cmdIdx - 1); renderPalette(); return; }
  }
  if ($("input-modal").style.display === "flex") {
    if (k === "Enter") { e.preventDefault(); setImmediate_ok(); return; }
  }
  if (state.editing) return;
  var vp = state.viewH || 600;
  if (k === "ArrowDown") { e.preventDefault(); scrollToPx(state.scrollTop + ROW_HEIGHT); }
  else if (k === "ArrowUp") { e.preventDefault(); scrollToPx(state.scrollTop - ROW_HEIGHT); }
  else if (k === "PageDown") { e.preventDefault(); scrollToPx(state.scrollTop + vp); }
  else if (k === "PageUp") { e.preventDefault(); scrollToPx(state.scrollTop - vp); }
  else if (k === "Home") { e.preventDefault(); scrollToPx(0); }
  else if (k === "End") { e.preventDefault(); scrollToPx(Number.MAX_SAFE_INTEGER); }
});

function setImmediate_ok() {
  var cb = promptCallback; var v = $("input-value").value; closePrompt(); if (cb) cb(v);
}

function execPaletteCmd() {
  var cmds = state._cmds || [];
  if (!cmds.length) return;
  var c = cmds[0];
  for (var i = 0; i < cmds.length; i++) if (!cmds[i].disabled) { c = cmds[i]; break; }
  hideModal("palette"); state.showPalette = false;
  if (!c.disabled && c.action) c.action();
}

$("palette-input").addEventListener("input", function () { state.paletteQuery = this.value; state.cmdIdx = 0; renderPalette(); });
$("market-search").addEventListener("input", function () { state.marketQuery = this.value; renderMarket(); });
$("search-input").addEventListener("input", function () { state.searchQuery = this.value; renderVisible(); renderStatus(); });

function scrollByPx(dy) {
  var k = 1;
  if (Math.abs(dy) <= 3) k = 3;
  scrollToPx(state.scrollTop + dy * k);
}

function scrollToRowPx(rowIndex) {
  scrollToPx(rowIndex * ROW_HEIGHT);
}

$("scroll").addEventListener("wheel", function (e) {
  if (state.editing) return;
  var dy = e.deltaY;
  if ($("scrollbar").style.visibility === "hidden" && !dy) return;
  if (typeof dy === "undefined" || dy === null) {
    if (e.wheelDelta) dy = -e.wheelDelta;
  }
  scrollByPx(Math.round(dy));
});
if (typeof $("scroll").addEventListener === "function") {
  $("scroll").addEventListener("mousewheel", function (e) {
    var dy = Math.round(e.deltaY || -e.wheelDelta || 0);
    scrollByPx(dy);
  });
}

(function () {
  var scroller, dragging, startY, startTop, lastY;
  function onDown(e) {
    dragging = true; scroller = $("scroll");
    startY = e.y; lastY = e.y;
    startTop = state.scrollTop;
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    e.preventDefault();
    updateScrollbar();
  }
  function posToScroll(y) {
    var sb = $("scrollbar");
    var vp = state.viewH || scroller.clientHeight || 600;
    var trackH = sb.clientHeight || vp;
    var mx = maxScrollPx();
    var thH = Math.max(24, (vp / (mx + vp)) * trackH);
    var range = trackH - thH;
    var frac = (y - sb.getBoundingClientRect().top - thH / 2) / range;
    return Math.max(0, Math.min(1, frac)) * mx;
  }
  function onMove(e) {
    if (!dragging) return;
    lastY = e.y;
    scrollToPx(posToScroll(e.y));
    e.preventDefault();
  }
  function onUp(e) {
    if (!dragging) return;
    dragging = false;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    e.preventDefault();
  }
  $("thumb").addEventListener("mousedown", onDown);
  $("scrollbar").addEventListener("mousedown", function (e) {
    if (dragging) return;
    scrollToPx(posToScroll(e.y));
  });
})();

window.addEventListener("resize", function () {
  fitWindow();
  renderVisible();
  renderGridHeader();
});

/* toasts */
function renderToasts() {
  var box = $("toasts");
  box.innerHTML = "";
  for (var i = 0; i < state.notes.length; i++) {
    var n = state.notes[i];
    var d = document.createElement("div");
    d.className = "toast " + n.type;
    var ic = document.createElement("div");
    ic.className = "tic";
    ic.textContent = n.type === "success" ? "\u2713" : n.type === "error" ? "!" : "\u2139";
    d.appendChild(ic);
    d.appendChild(document.createTextNode(n.text));
    box.appendChild(d);
  }
}

/* reset */
function resetEnv() {
  closeAllDropdowns();
  var res = JSON.parse(xcall("reset_workspace"));
  state.sheets = [initialSheet()];
  state.activeId = state.sheets[0].id;
  state.settings = { delimiter: ",", hasHeader: true };
  state.selRows = {}; state.selCols = {}; state.selRowCount = 0; state.selColCount = 0;
  state.activeCell = null; state.sort = null; state.searchQuery = ""; state.demoInstalled = [];
  renderAll();
  notify(t("reset"), "info");
}

/* init */
function init() {
  if (state.inited) return;
  state.inited = true;
  xcall("log", "init start");
  state.sheets = [initialSheet()];
  state.activeId = state.sheets[0].id;
  xcall("log", "sheets init'd");
  loadWorkspace();
  xcall("log", "workspace loaded: sheets=" + state.sheets.length + " active=" + state.activeId);

  var an = activeSheet();
  xcall("log", "active=" + (an ? an.name : "none") + " mode=" + (an ? an.mode : "?"));

  refreshAddons();
  xcall("log", "addons=" + state.pyAddons.length);
  renderAll();
  xcall("log", "rendered");

  /* layout sizing: force explicit px (Sciter percent-height is unreliable) */
  setTimeout(fitWindow, 50);
}

function fitWindow() {
  var h = (document.documentElement && document.documentElement.clientHeight) || 600;
  document.body.style.height = h + "px";
  var app = $("app");
  if (app) app.style.height = h + "px";
  function hg(id) { var el = $(id); if (!el) return 0; try { return el.getBoundingClientRect().height; } catch (e) { return el.clientHeight || 0; } }
  var used = hg("brand-bar") + hg("menu-bar") + hg("tab-bar") + hg("status-bar");
  var main = $("main-row");
  if (main) {
    var mainH = Math.max(120, h - used);
    main.style.flex = "0 0 " + mainH + "px";
    main.style.height = mainH + "px";
    var sw = $("sheet-wrap");
    if (sw) sw.style.height = mainH + "px";
    var gm = $("grid-main");
    var scrH = Math.max(80, mainH - (hg("grid-header") || 38));
    if (gm) { gm.style.flex = "0 0 " + mainH + "px"; gm.style.height = mainH + "px"; }
    var sc = $("scroll");
    if (sc) { sc.style.flex = "0 0 " + scrH + "px"; sc.style.height = scrH + "px"; }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}