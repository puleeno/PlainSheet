# Plainsheet Technical Architecture

This document describes the high-performance architecture designed to handle **15GB+ CSV files** natively using Rust, Slint, and Python.

## 1. Core Technical Stack
- **Frontend**: [Slint UI](https://slint.dev/) (Rust-based, hardware-accelerated).
- **Backend Core**: [Rust](https://www.rust-lang.org/) (Safe, concurrent, high-performance).
- **Extension Engine**: [PyO3](https://pyo3.rs/) (Native Python integration).
- **Fast Indexing**: `memmap2` and `memchr`.

## 2. Big Data Handling Strategy (The "Native 15GB" Problem)
Loading 15GB into RAM is impossible on most consumer hardware. Our solution uses a **Multi-Level Virtualization** approach:

### A. Line Offsets Indexing (Rust)
Instead of reading content, the `LargeFileManager` performs a high-speed byte scan of the file to store the **Byte Offset** (position) of every newline (`\n`).
- **RAM Usage**: ~8 bytes per line. Even a 100-million-line file only takes ~800MB of index RAM.
- **Speed**: Utilizing `memmap2` allows the OS to handle file caching, and `memchr` leverages SIMD instructions for ultra-fast scanning.

### B. Random Access Reading
When the UI needs to display rows (e.g., rows 1,000,000 to 1,000,100):
1. Rust lookups offsets at index 1,000,000.
2. Performs a `File::seek()` to that exact byte.
3. Reads only the necessary bytes for those 100 rows.

### C. Big Data Extension Bridge
For processing large data in Python:
- **Small Action**: Data is converted and passed via RAM (e.g., current screen view).
- **Big Action**: Only the **File Path** is passed to Python. Python is then expected to use high-performance streaming or lazy libraries.

## 3. Recommended Python Stack for Extensions
For 15GB files, extensions should use:
- **[Polars](https://pola-rs.github.io/polars/)**: High-performance DataFrame library (Parallel execution, Lazy API).
- **Chunked Pandas**: `pd.read_csv(chunksize=...)`.
- **Raw Streaming**: `with open(path) as f: for line in f: ...`.

## 4. Hook Points
1. `on_open_intercept`: Called before Rust indexes the file.
2. `discover_extensions`: Dynamic UI population from Python metadata.
3. `run_extension_by_name`: Screen-bound data processing.
4. `run_big_data_job`: Path-bound massive data processing.
