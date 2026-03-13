use pyo3::prelude::*;
use pyo3::types::PyList;
use slint::{Model, ModelRc, SharedString, StandardListViewItem, VecModel};

pub fn discover_extensions() -> PyResult<Vec<String>> {
    Python::with_gil(|py| {
        let sys = py.import("sys")?;
        let path = sys.getattr("path")?;
        path.call_method1("append", (crate::embedded_py::get_extensions_path(),))?;

        let ext_module = py.import("main_ext")?;
        let result = ext_module.call_method0("discover_extensions")?;

        let py_list: Bound<'_, PyList> = result.downcast_into()?;
        let mut extensions = Vec::new();
        for item in py_list.iter() {
            extensions.push(item.extract::<String>()?);
        }
        Ok(extensions)
    })
}

/// For small data (e.g. what's currently on screen)
#[allow(dead_code)]
pub fn run_python_extension(
    extension_name: &str,
    data: ModelRc<ModelRc<StandardListViewItem>>,
) -> PyResult<ModelRc<ModelRc<StandardListViewItem>>> {
    Python::with_gil(|py| {
        let py_data = PyList::empty(py);
        for i in 0..data.row_count() {
            let row_model = data.row_data(i).unwrap();
            let py_row = PyList::empty(py);
            for j in 0..row_model.row_count() {
                let cell = row_model.row_data(j).unwrap();
                py_row.append(cell.text.as_str())?;
            }
            py_data.append(py_row)?;
        }

        let sys = py.import("sys")?;
        let path = sys.getattr("path")?;
        path.call_method1("append", (crate::embedded_py::get_extensions_path(),))?;

        let ext_module = py.import("main_ext")?;
        let result = ext_module.call_method1("run_extension_by_name", (extension_name, py_data))?;

        let py_result_list: Bound<'_, PyList> = result.downcast_into()?;
        let mut rust_rows = Vec::new();
        for item in py_result_list.iter() {
            let py_row: Bound<'_, PyList> = item.downcast_into()?;
            let mut rust_row = Vec::new();
            for cell in py_row.iter() {
                let cell_str: String = cell.extract()?;
                let mut slint_item = StandardListViewItem::default();
                slint_item.text = SharedString::from(cell_str);
                rust_row.push(slint_item);
            }
            rust_rows.push(ModelRc::new(VecModel::from(rust_row)));
        }
        Ok(ModelRc::new(VecModel::from(rust_rows)))
    })
}

/// High Performance API for Big Data (15GB+)
/// Passes the file path to Python instead of raw data.
pub fn run_python_big_data_extension(extension_name: &str, file_path: &str) -> PyResult<()> {
    Python::with_gil(|py| {
        let sys = py.import("sys")?;
        let path = sys.getattr("path")?;
        path.call_method1("append", (crate::embedded_py::get_extensions_path(),))?;

        let ext_module = py.import("main_ext")?;
        ext_module.call_method1("run_big_data_job", (extension_name, file_path))?;
        Ok(())
    })
}

#[allow(dead_code)]
pub fn on_open_hook(file_path: &str) -> PyResult<()> {
    Python::with_gil(|py| {
        let sys = py.import("sys")?;
        let path = sys.getattr("path")?;
        path.call_method1("append", (crate::embedded_py::get_extensions_path(),))?;

        let ext_module = py.import("main_ext")?;
        ext_module.call_method1("on_open_intercept", (file_path,))?;
        Ok(())
    })
}
