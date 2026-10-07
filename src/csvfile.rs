//! PRow / CSV file manager: mmap byte-offset indexing for fast random access
//! into huge CSV files, plus streaming save/merge-back of edits.

use memchr::memchr_iter;
use memmap2::Mmap;
use std::collections::BTreeMap;
use std::fs::File;
use std::io::{BufRead, BufWriter, Cursor, Write};
use std::path::PathBuf;

pub const IN_MEMORY_LIMIT: usize = 50_000;

pub struct LargeFileManager {
    pub path: PathBuf,
    pub line_offsets: Vec<u64>,
    pub headers: Vec<String>,
    pub total_rows: usize,
    pub has_header: bool,
    pub delimiter: u8,
}

fn parse_csv_bytes(bytes: &[u8], delimiter: u8) -> Result<Vec<Vec<String>>, String> {
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(false)
        .flexible(true)
        .delimiter(delimiter)
        .from_reader(Cursor::new(bytes));
    let mut rows = Vec::new();
    for rec in reader.records() {
        let rec = rec.map_err(|e| e.to_string())?;
        rows.push(rec.iter().map(|s| s.to_string()).collect());
    }
    Ok(rows)
}

fn encode_one_row(cells: &[String], delimiter: u8) -> Vec<u8> {
    let mut buf = Vec::new();
    {
        let mut w = csv::WriterBuilder::new()
            .delimiter(delimiter)
            .has_headers(false)
            .from_writer(&mut buf);
        let _ = w.write_record(cells);
        let _ = w.flush();
    }
    while matches!(buf.last(), Some(b'\n') | Some(b'\r')) {
        buf.pop();
    }
    buf
}

/// Stream the first `want` data rows (plus the header line, if `has_header`)
/// straight from the head of the file, WITHOUT scanning the whole file / building
/// the offset index. Used to show content instantly while the full index is still
/// being built on a background thread.
pub fn preview(
    path: &std::path::Path,
    want: usize,
    has_header: bool,
    delimiter: u8,
) -> Result<(Vec<String>, Vec<Vec<String>>), String> {
    let file = File::open(path).map_err(|e| e.to_string())?;
    let mut reader = std::io::BufReader::new(file);
    let mut headers: Vec<String> = Vec::new();
    let mut rows: Vec<Vec<String>> = Vec::new();
    let mut first = true;
    let mut buf: Vec<u8> = Vec::with_capacity(64 * 1024);
    while rows.len() < want {
        buf.clear();
        let n = reader.read_until(b'\n', &mut buf).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        let rec = parse_csv_bytes(&buf, delimiter)
            .unwrap_or_default()
            .first()
            .cloned()
            .unwrap_or_default();
        if first {
            first = false;
            if has_header {
                headers = rec;
            } else {
                rows.push(rec);
            }
        } else {
            rows.push(rec);
        }
    }
    Ok((headers, rows))
}

/// Byte span of line `k`, with its trailing CRLF/LF terminator stripped.
/// `offsets` holds the start of every line; the final line extends to `file_len`.
fn line_span(offsets: &[u64], k: usize, file_len: usize, buf: &[u8]) -> (usize, usize) {
    let start = offsets[k] as usize;
    let mut end = if k + 1 < offsets.len() {
        offsets[k + 1] as usize
    } else {
        file_len
    };
    while end > start && (buf[end - 1] == b'\n' || buf[end - 1] == b'\r') {
        end -= 1;
    }
    (start, end)
}

impl LargeFileManager {
    pub fn new(path: PathBuf, has_header: bool, delimiter: u8) -> Result<Self, String> {
        if !path.exists() {
            return Err(format!("file not found: {}", path.display()));
        }
        let file = File::open(&path).map_err(|e| e.to_string())?;
        let mmap = unsafe { Mmap::map(&file) }.map_err(|e| e.to_string())?;
        let len = mmap.len();

        let mut offsets = vec![0u64];
        for pos in memchr_iter(b'\n', &mmap) {
            offsets.push((pos + 1) as u64);
        }
        // drop trailing offset that points exactly past EOF (file ends with \n)
        if offsets.len() > 1 {
            let last = offsets[offsets.len() - 1] as usize;
            if last >= len {
                offsets.pop();
            }
        }

        let headers = if len == 0 {
            Vec::new()
        } else if offsets.is_empty() {
            Vec::new()
        } else {
            let (hs, he) = line_span(&offsets, 0, len, &mmap);
            parse_csv_bytes(&mmap[hs..he], delimiter).unwrap_or_default().first().cloned().unwrap_or_default()
        };

        let total_lines = offsets.len();
        let total_rows = if has_header && total_lines > 0 { total_lines - 1 } else { total_lines };

        Ok(Self { path, line_offsets: offsets, headers, total_rows, has_header, delimiter })
    }

    fn mmap(&self) -> Result<Mmap, String> {
        let file = File::open(&self.path).map_err(|e| e.to_string())?;
        unsafe { Mmap::map(&file) }.map_err(|e| e.to_string())
    }

    /// line index (into line_offsets) for a given data row index
    fn line_idx(&self, row: usize) -> usize {
        if self.has_header { row + 1 } else { row }
    }

    pub fn read_lines(&self, start_row: usize, count: usize) -> Result<Vec<Vec<String>>, String> {
        if self.line_offsets.is_empty() {
            return Ok(Vec::new());
        }
        let mmap = self.mmap()?;
        let start = self.line_idx(start_row);
        let available = self.line_offsets.len().saturating_sub(start);
        if available == 0 {
            return Ok(Vec::new());
        }
        let take = count.min(available);
        let last = start + take - 1;
        let begin = self.line_offsets[start] as usize;
        let finish = line_span(&self.line_offsets, last, mmap.len(), &mmap).1;
        let chunk = &mmap[begin..finish];
        parse_csv_bytes(chunk, self.delimiter)
    }

    /// Stream original file to a new path, replacing edited rows (keyed by data-row index).
    pub fn apply_edits(&mut self, edits: &BTreeMap<usize, Vec<String>>) -> Result<(), String> {
        let mmap = self.mmap()?;
        let len = mmap.len();
        let temp = self.path.with_extension("tmp");
        let file = File::create(&temp).map_err(|e| e.to_string())?;
        let mut out = BufWriter::new(file);

        let n = self.line_offsets.len();
        for k in 0..n {
            let is_header = self.has_header && k == 0;
            let data_idx = if self.has_header { k.saturating_sub(1) } else { k };

            if !is_header {
                if let Some(cells) = edits.get(&data_idx) {
                    out.write_all(&encode_one_row(cells, self.delimiter)).map_err(|e| e.to_string())?;
                    out.write_all(b"\n").map_err(|e| e.to_string())?;
                    continue;
                }
            }
            let (start, end) = line_span(&self.line_offsets, k, len, &mmap);
            out.write_all(&mmap[start..end]).map_err(|e| e.to_string())?;
            out.write_all(b"\n").map_err(|e| e.to_string())?;
        }
        out.flush().map_err(|e| e.to_string())?;
        drop(out);

        std::fs::rename(&temp, &self.path).map_err(|e| e.to_string())?;

        // The byte offsets are now stale (the file on disk was replaced).
        // Rebuild the whole index from the fresh file.
        let fresh = Self::new(self.path.clone(), self.has_header, self.delimiter)?;
        *self = fresh;
        Ok(())
    }

    /// Write a brand new CSV file from headers + full rows.
    pub fn write_csv(
        path: &std::path::Path,
        headers: &[String],
        rows: &[Vec<String>],
        has_header: bool,
        delimiter: u8,
    ) -> Result<(), String> {
        let file = File::create(path).map_err(|e| e.to_string())?;
        let mut w = csv::WriterBuilder::new()
            .delimiter(delimiter)
            .has_headers(false)
            .from_writer(BufWriter::new(file));
        if has_header {
            w.write_record(headers).map_err(|e| e.to_string())?;
        }
        for row in rows {
            w.write_record(row).map_err(|e| e.to_string())?;
        }
        w.flush().map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make(path: &str, content: &str) -> LargeFileManager {
        std::fs::write(path, content).unwrap();
        LargeFileManager::new(PathBuf::from(path), true, b',').unwrap()
    }

    #[test]
    fn apply_lf_roundtrip() {
        let tmp = std::env::temp_dir().join("ps_lf.csv");
        let mut m = make(tmp.to_str().unwrap(), "h1,h2\nr0a,r0b\nr1a,r1b\nr2a,r2b");
        assert_eq!(m.read_lines(0, 3).unwrap().len(), 3);
        let mut edits = BTreeMap::new();
        edits.insert(1, vec!["NEWa".into(), "NEWb".into()]);
        m.apply_edits(&edits).unwrap();
        let after = m.read_lines(0, 3).unwrap();
        assert_eq!(after[0], vec!["r0a", "r0b"]);
        assert_eq!(after[1], vec!["NEWa", "NEWb"]);
        assert_eq!(after[2], vec!["r2a", "r2b"]);
        let disk = std::fs::read_to_string(&m.path).unwrap();
        assert_eq!(disk, "h1,h2\nr0a,r0b\nNEWa,NEWb\nr2a,r2b\n");
        assert_eq!(m.total_rows, 3);
        let _ = std::fs::remove_file(&m.path);
    }

    #[test]
    fn apply_crlf_roundtrip() {
        let tmp = std::env::temp_dir().join("ps_crlf.csv");
        let mut m = make(tmp.to_str().unwrap(), "h1,h2\r\nr0a,r0b\r\nr1a,r1b\r\nr2a,r2b");
        let mut edits = BTreeMap::new();
        edits.insert(1, vec!["NEWa".into(), "NEWb".into()]);
        m.apply_edits(&edits).unwrap();
        let after = m.read_lines(0, 3).unwrap();
        assert_eq!(after[0], vec!["r0a", "r0b"]);
        assert_eq!(after[1], vec!["NEWa", "NEWb"]);
        assert_eq!(after[2], vec!["r2a", "r2b"]);
        let disk = std::fs::read_to_string(&m.path).unwrap();
        assert_eq!(disk, "h1,h2\nr0a,r0b\nNEWa,NEWb\nr2a,r2b\n");
        assert_eq!(m.total_rows, 3);
        let _ = std::fs::remove_file(&m.path);
    }

    #[test]
    fn apply_edited_values_persist() {
        let tmp = std::env::temp_dir().join("ps_vals.csv");
        let mut m = make(tmp.to_str().unwrap(), "d,desc,amt,cat,note\n2025-06-02,d1,37,Food,has, comma\n2025-06-03,d2,74,Rent,has, comma");
        let mut edits = BTreeMap::new();
        edits.insert(1, vec!["2026-01-01".into(), "edited_x".into(), "9.99".into(), "Test".into(), "".into()]);
        m.apply_edits(&edits).unwrap();
        let after = m.read_lines(1, 1).unwrap();
        assert_eq!(after[0], vec!["2026-01-01", "edited_x", "9.99", "Test", ""]);
        let disk = std::fs::read_to_string(&m.path).unwrap();
        assert_eq!(disk.lines().count(), 3);
        let rows: Vec<String> = disk.lines().map(|s| s.to_string()).collect();
        assert_eq!(rows[0], "d,desc,amt,cat,note");
        assert_eq!(rows[1], "2025-06-02,d1,37,Food,has, comma");
        assert_eq!(rows[2], "2026-01-01,edited_x,9.99,Test,");
        let _ = std::fs::remove_file(&m.path);
    }
}