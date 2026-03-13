# Python Extension Development Guide

Plainsheet allows you to write high-performance extensions in Python.

## Extension Hook API

### 1. Metadata & Discovery
To make your extension appear in the sidebar, add it to the `EXTENSIONS` dictionary in `main_ext.py`.

```python
EXTENSIONS = {
    "MyAction": {
        "id": "my_unique_id",
        "name": "🚀 My Fast Action",
        "type": "BigData" # Or "UI" for screen-only
    }
}
```

### 2. UI Hook (Small Data)
Used for actions that modify what the user sees on screen.
- **Input**: `data` (List of Lists of Strings).
- **Return**: Modified `data`.

```python
def run_extension_by_name(name, data):
    if "MyAction" in name:
        return [[cell.upper() for cell in row] for row in data]
```

### 3. Big Data Hook (Heavy Processing)
Used for 15GB+ files. Do **not** read the whole file into RAM.
- **Input**: `file_path` (String).
- **Return**: Boolean or Status.

```python
def run_big_data_job(name, file_path):
    import polars as pl
    df = pl.scan_csv(file_path)
    # Perform out-of-core computation
    result = df.filter(pl.col("column_name") > 100).collect()
    print(result)
```

## Tips for 15GB Performance
1. Use **Polars** `scan_csv` (Lazy API) for near-instant filtering and aggregation on massive files.
2. If using raw Python, use `yield` or `for line in f` to process line-by-line.
3. Use the `on_open_intercept` hook to validate if a file is safe/valid before Rust starts indexing.
