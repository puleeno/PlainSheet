use memchr::memchr_iter;
use memmap2::Mmap;
use std::fs::File;
use std::io::{BufReader, Seek, SeekFrom};
use std::path::PathBuf;

pub struct LargeFileManager {
    pub path: PathBuf,
    pub line_offsets: Vec<u64>,
    pub headers: Vec<String>,
}

impl LargeFileManager {
    pub fn new(path: PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        let file = File::open(&path)?;
        let mmap = unsafe { Mmap::map(&file)? };

        let mut line_offsets = Vec::new();
        line_offsets.push(0); // First line starts at 0

        // Fast indexing using memchr
        for pos in memchr_iter(b'\n', &mmap) {
            line_offsets.push((pos + 1) as u64);
        }

        // Extract headers from the first line
        let mut reader = csv::Reader::from_path(&path)?;
        let headers = reader.headers()?.iter().map(|s| s.to_string()).collect();

        Ok(Self {
            path,
            line_offsets,
            headers,
        })
    }

    pub fn get_total_rows(&self) -> usize {
        // Total rows (including header, minus one if file ends with newline)
        if self.line_offsets.is_empty() {
            0
        } else {
            self.line_offsets.len() - 1
        }
    }

    pub fn read_lines(
        &self,
        start_row: usize,
        count: usize,
    ) -> Result<Vec<Vec<String>>, Box<dyn std::error::Error>> {
        let mut file = File::open(&self.path)?;
        let start_offset = self.line_offsets.get(start_row).cloned().unwrap_or(0);
        file.seek(SeekFrom::Start(start_offset))?;

        let reader = BufReader::new(file);
        let mut csv_reader = csv::ReaderBuilder::new()
            .has_headers(false)
            .from_reader(reader);

        let mut records = Vec::new();
        for result in csv_reader.records().take(count) {
            let record = result?;
            records.push(record.iter().map(|s| s.to_string()).collect());
        }

        Ok(records)
    }
}
