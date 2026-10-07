//! Python (PyO3) addon system:
//! - extensions live in `~/.plainsheet/extensions/main_ext.py`
//! - a default copy is embedded into the binary and extracted on first run
//! - addons can transform in-memory data (small) or process a file path (big)

#![allow(deprecated)] // pyo3 0.26: Python::with_gil is deprecated in favor of Python::attach

use pyo3::prelude::*;
use serde_json::{json, Value as Json};
use std::fs;
use std::path::PathBuf;

const DEFAULT_MAIN_EXT: &str = include_str!("../extensions/main_ext.py");

pub fn extensions_dir() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join(".plainsheet").join("extensions")
}

pub fn init() -> Result<PathBuf, String> {
    let dir = extensions_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    for name in ["main_ext.py"] {
        let p = dir.join(name);
        if !p.exists() {
            fs::write(&p, DEFAULT_MAIN_EXT).map_err(|e| e.to_string())?;
        }
    }
    Ok(dir)
}

fn with_module<R>(f: impl FnOnce(Bound<'_, PyModule>, Python<'_>) -> PyResult<R>) -> Result<R, String> {
    Python::with_gil(|py| {
        let sys = py.import("sys").map_err(|e| e.to_string())?;
        let dir = extensions_dir();
        let dir_str = dir.to_string_lossy().to_string();
        let path = sys.getattr("path").map_err(|e| e.to_string())?;
        let path_list = path.downcast::<pyo3::types::PyList>().map_err(|e| e.to_string())?;
        let cur: Vec<String> = path_list
            .iter()
            .filter_map(|p| p.extract().ok())
            .collect();
        if !cur.contains(&dir_str) {
            path_list.append(dir_str).map_err(|e| e.to_string())?;
        }
        let module = py.import("main_ext").map_err(|e| e.to_string())?;
        f(module, py).map_err(|e| e.to_string())
    })
}

fn py_to_json(v: &Bound<'_, PyAny>) -> Result<Json, String> {
    if v.is_none() {
        return Ok(Json::Null);
    }
    // Cheap path: ask Python to json.dumps the value.
    v.extract::<String>()
        .ok()
        .and_then(|s| serde_json::from_str::<Json>(&s).ok())
        .or_else(|| {
            let json_mod = pyo3::Python::with_gil(|py| -> Option<Json> {
                let m = py.import("json").ok()?;
                let dumped = m.call_method1("dumps", (v,)).ok()?;
                let s: String = dumped.extract().ok()?;
                serde_json::from_str::<Json>(&s).ok()
            });
            json_mod
        })
        .ok_or_else(|| "could not serialize python value".to_string())
}

/// Returns JSON array: [{id,name,description,category,icon}]
pub fn list_addons() -> Result<Json, String> {
    with_module(|module, py| {
        let result = module.call_method0("discover_extensions")?;
        let list = result.downcast::<pyo3::types::PyList>()?;
        let mut out: Vec<Json> = Vec::new();
        for item in list.iter() {
            if let Ok(map) = item.downcast::<pyo3::types::PyList>() {
                // legacy tuple form: [id, name, ...]
                out.push(json!({
                    "id": map.get_item(0).map(|v| v.extract::<String>().unwrap_or_default()).unwrap_or_default(),
                    "name": map.get_item(1).map(|v| v.extract::<String>().unwrap_or_default()).unwrap_or_default(),
                }));
            } else {
                out.push(py_to_json(&item).map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e))?);
            }
        }
        let _ = py;
        Ok(Json::Array(out))
    })
}

/// Small-data addon: pass headers + rows (arrays of arrays of strings), return transformed rows JSON.
pub fn run_small(
    addon_id: &str,
    name: &str,
    headers_json: &str,
    rows_json: &str,
) -> Result<Json, String> {
    let headers: Vec<String> = serde_json::from_str(headers_json).unwrap_or_default();
    let rows: Vec<Vec<String>> = serde_json::from_str(rows_json).unwrap_or_default();

    with_module(|module, py| {
        let py_headers = pyo3::types::PyList::empty(py);
        for h in &headers {
            py_headers.append(h)?;
        }
        let py_rows = pyo3::types::PyList::empty(py);
        for row in &rows {
            let py_row = pyo3::types::PyList::empty(py);
            for cell in row {
                py_row.append(cell)?;
            }
            py_rows.append(py_row)?;
        }
        let result = module.call_method1("run_extension_by_name", (name, addon_id, py_headers, py_rows))?;
        let value = py_to_json(&result).map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e))?;
        Ok(value)
    })
}

/// Big-data addon: pass the file path to Python.
pub fn run_big(addon_id: &str, name: &str, file_path: &str) -> Result<Json, String> {
    with_module(|module, _py| {
        let result = module.call_method1("run_big_data_job", (name, addon_id, file_path))?;
        let value = py_to_json(&result).map_err(|e| pyo3::exceptions::PyRuntimeError::new_err(e))?;
        Ok(value)
    })
}