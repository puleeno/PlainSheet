slint::include_modules!();

use rfd::FileDialog;
use slint::{ComponentHandle, ModelRc, SharedString, StandardListViewItem, VecModel};
use std::sync::{Arc, Mutex};

mod big_data;
mod embedded_py;
mod extensions;

struct AppState {
    file_manager: Option<big_data::LargeFileManager>,
    original_data: Vec<Vec<String>>,
    original_headers: Vec<String>,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let _ = embedded_py::init_extensions();

    let ui = AppWindow::new()?;
    let ui_handle = ui.as_weak();

    let state = Arc::new(Mutex::new(AppState {
        file_manager: None,
        original_data: Vec::new(),
        original_headers: Vec::new(),
    }));

    pyo3::prepare_freethreaded_python();

    match extensions::discover_extensions() {
        Ok(exts) => {
            let items: Vec<StandardListViewItem> = exts
                .into_iter()
                .map(|name| {
                    let mut item = StandardListViewItem::default();
                    item.text = name.into();
                    item
                })
                .collect();
            ui.set_extensions_list(ModelRc::new(VecModel::from(items)));
        }
        Err(e) => ui.set_status_text(format!("Extension Error: {}", e).into()),
    }

    // Window close
    ui.on_window_close({
        let ui_handle = ui_handle.clone();
        move || {
            if let Some(ui) = ui_handle.upgrade() {
                ui.hide().unwrap();
            }
        }
    });

    // Window minimize
    ui.on_window_minimize({
        let ui_handle = ui_handle.clone();
        move || {
            if let Some(ui) = ui_handle.upgrade() {
                ui.window().set_minimized(true);
            }
        }
    });

    // Window maximize
    ui.on_window_maximize({
        let ui_handle = ui_handle.clone();
        move || {
            if let Some(ui) = ui_handle.upgrade() {
                let is_maximized = ui.window().is_maximized();
                ui.window().set_maximized(!is_maximized);
            }
        }
    });

    // Window drag
    ui.on_drag_window({
        let ui_handle = ui_handle.clone();
        move |dx, dy| {
            if let Some(ui) = ui_handle.upgrade() {
                let pos = ui.window().position();
                let new_x = pos.x + dx as i32;
                let new_y = pos.y + dy as i32;
                ui.window().set_position(slint::PhysicalPosition::new(new_x, new_y));
            }
        }
    });

    // Sort callback
    ui.on_sort_clicked({
        let ui_handle = ui_handle.clone();
        let state = state.clone();
        move |col, ascending| {
            let ui = match ui_handle.upgrade() {
                Some(u) => u,
                None => return,
            };
            let state_lock = state.lock().unwrap();

            if col < 0 || state_lock.original_data.is_empty() {
                // Unsorted - restore original
                let data = &state_lock.original_data;
                update_table_data(&ui, data);
                return;
            }

            let col = col as usize;
            let mut sorted_data = state_lock.original_data.clone();

            sorted_data.sort_by(|a, b| {
                let a_val = a.get(col).map(|s| s.as_str()).unwrap_or("");
                let b_val = b.get(col).map(|s| s.as_str()).unwrap_or("");

                // Try numeric comparison first
                if let (Ok(a_num), Ok(b_num)) = (a_val.parse::<f64>(), b_val.parse::<f64>()) {
                    let cmp = a_num.partial_cmp(&b_num).unwrap_or(std::cmp::Ordering::Equal);
                    if ascending { cmp } else { cmp.reverse() }
                } else {
                    // String comparison
                    let cmp = a_val.cmp(b_val);
                    if ascending { cmp } else { cmp.reverse() }
                }
            });

            drop(state_lock);
            update_table_data(&ui, &sorted_data);
        }
    });

    ui.on_open_file({
        let ui_handle = ui_handle.clone();
        let state = state.clone();
        move || {
            let ui = ui_handle.unwrap();
            if let Some(path) = FileDialog::new()
                .add_filter("CSV", &["csv"])
                .pick_file()
            {
                ui.set_is_loading(true);
                ui.set_status_text("Indexing file...".into());

                let path_clone = path.clone();
                let ui_handle_inner = ui_handle.clone();
                let state_inner = state.clone();

                std::thread::spawn(move || {
                    match big_data::LargeFileManager::new(path_clone) {
                        Ok(manager) => {
                            let total_rows = manager.get_total_rows();
                            let headers = manager.headers.clone();
                            let first_chunk = manager.read_lines(1, 100).unwrap_or_default();

                            {
                                let mut state = state_inner.lock().unwrap();
                                state.original_data = first_chunk.clone();
                                state.original_headers = headers.clone();
                                state.file_manager = Some(manager);
                            }

                            let ui_handle_final = ui_handle_inner.clone();
                            slint::invoke_from_event_loop(move || {
                                if let Some(ui) = ui_handle_final.upgrade() {
                                    setup_ui_data(&ui, &headers, &first_chunk, total_rows);
                                    ui.set_is_loading(false);
                                    ui.set_selected_column(-1);
                                    ui.set_sorted_column(-1);
                                    ui.set_sort_ascending(true);
                                    ui.set_status_text(format!("Indexed {} rows.", total_rows).into());
                                }
                            }).unwrap();
                        }
                        Err(e) => {
                            let ui_handle_final = ui_handle_inner.clone();
                            let err_msg = e.to_string();
                            slint::invoke_from_event_loop(move || {
                                if let Some(ui) = ui_handle_final.upgrade() {
                                    ui.set_is_loading(false);
                                    ui.set_status_text(format!("Error: {}", err_msg).into());
                                }
                            }).unwrap();
                        }
                    }
                });
            }
        }
    });

    ui.on_run_extension({
        let ui_handle = ui_handle.clone();
        let state = state.clone();
        move |ext_name| {
            let ui = ui_handle.unwrap();
            let state_lock = state.lock().unwrap();

            if let Some(ref manager) = state_lock.file_manager {
                ui.set_is_loading(true);
                let file_path = manager.path.to_str().unwrap().to_string();

                match extensions::run_python_big_data_extension(ext_name.as_str(), &file_path) {
                    Ok(_) => {
                        ui.set_status_text(format!("Job '{}' executed.", ext_name).into());
                    }
                    Err(e) => ui.set_status_text(format!("Error: {}", e).into()),
                }
                ui.set_is_loading(false);
            } else {
                ui.set_status_text("Please open a CSV file first.".into());
            }
        }
    });

    ui.run()?;
    Ok(())
}

fn update_table_data(ui: &AppWindow, data: &[Vec<String>]) {
    let mut rows_vec = Vec::new();
    for record in data {
        let row: Vec<SharedString> = record.iter().map(|s| s.as_str().into()).collect();
        rows_vec.push(ModelRc::new(VecModel::from(row)));
    }
    ui.set_table_data(ModelRc::new(VecModel::from(rows_vec)));
}

fn setup_ui_data(ui: &AppWindow, headers: &[String], data: &[Vec<String>], total_rows: usize) {
    let header_model: Vec<SharedString> = headers.iter().map(|h| h.as_str().into()).collect();
    ui.set_table_header(ModelRc::new(VecModel::from(header_model)));

    update_table_data(ui, data);
    ui.set_row_count(total_rows as i32);
}
