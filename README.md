# Plainsheet

Dynamic CSV Editor with Rust (Slint) and Python (PyO3) Extension System.

## Features
- **Modern UI**: Built with Slint for a premium desktop experience.
- **Python Extensions**: Easily extend functionality using Python scripts.
- **Action Hooks**: Python code can intervene in:
  - Opening files
  - Validating data
  - Cleaning data
  - Bulk processing
  - Row-level editing
  - Saving/Exporting

## Setup

1. Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
2. Install Python 3 and development headers:
   - Ubuntu/Debian: `sudo apt install python3-dev`
3. Build and Run:
   ```bash
   cargo run
   ```

## Adding Extensions

Extensions are located in the `extensions/` directory. 
Edit `extensions/main_ext.py` to add new functions. 

Example:
```python
def my_custom_transform(data):
    # data is a list of lists of strings
    return [[cell.lower() for cell in row] for row in data]
```

Then in Rust, you can call this action by name.
