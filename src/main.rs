//! Plainsheet — Rust + PyO3 core, Sciter.JS frontend.
//!
//! JavaScript in `ui/app.htm` talks to this core through `Window.this.xcall(...)`.

#[macro_use]
extern crate sciter;

mod addons;
mod csvfile;

use sciter::Element;
use serde_json::{json, Value as Json};
use std::collections::{BTreeMap, HashMap};
use std::path::PathBuf;
use std::sync::mpsc::{self, TryRecvError};
use std::thread;

struct FileSession {
    manager: csvfile::LargeFileManager,
}

struct OpenPayload {
    manager: csvfile::LargeFileManager,
    path: String,
    name: String,
    mode: String,
    rows: Vec<Vec<String>>,
}

struct PreviewPayload {
    name: String,
    path: String,
    headers: Vec<String>,
    rows: Vec<Vec<String>>,
}

/// A two-phase open job: the worker first streams a quick preview of the file
/// head, then keeps going to build the full offset index. `sent_preview` records
/// which phase the JS side has already consumed via `open_tick`.
struct OpenJob {
    rx: mpsc::Receiver<JobPayload>,
    sent_preview: bool,
}

enum JobPayload {
    OpenPreview(PreviewPayload),
    Open(Result<OpenPayload, String>),
    Save(Result<(String, csvfile::LargeFileManager), String>),
}

struct AppState {
    next_id: usize,
    sessions: HashMap<String, FileSession>,
    jobs: HashMap<String, mpsc::Receiver<JobPayload>>,
    open_jobs: HashMap<String, OpenJob>,
    workspace_path: PathBuf,
}

impl AppState {
    fn new() -> Self {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        let ps_dir = home.join(".plainsheet");
        let _ = std::fs::create_dir_all(&ps_dir);
        Self {
            next_id: 1,
            sessions: HashMap::new(),
            jobs: HashMap::new(),
            open_jobs: HashMap::new(),
            workspace_path: ps_dir.join("workspace.json"),
        }
    }

    fn next_id(&mut self) -> String {
        let id = format!("f{}", self.next_id);
        self.next_id += 1;
        id
    }

    fn register(&mut self, manager: csvfile::LargeFileManager) -> String {
        let id = self.next_id();
        self.sessions.insert(id.clone(), FileSession { manager });
        id
    }

    fn manager(&self, id: &str) -> Option<&csvfile::LargeFileManager> {
        self.sessions.get(id).map(|s| &s.manager)
    }
}

fn ok(value: Json) -> String {
    json!({ "ok": true, "data": value }).to_string()
}

fn err(msg: &str) -> String {
    json!({ "ok": false, "err": msg }).to_string()
}

struct Handler {
    _root: Option<Element>,
    state: AppState,
}

impl Handler {
    fn open_path(&mut self, path_str: &str, has_header: bool, delimiter: u8) -> String {
        let manager = match csvfile::LargeFileManager::new(PathBuf::from(path_str), has_header, delimiter) {
            Ok(m) => m,
            Err(e) => return err(&e),
        };
        self.respond_open(manager, path_str)
    }

    fn respond_open(&mut self, manager: csvfile::LargeFileManager, path_str: &str) -> String {
        let total = manager.total_rows;
        let headers = manager.headers.clone();
        let (mode, rows) = if total <= csvfile::IN_MEMORY_LIMIT {
            let all = manager.read_lines(0, total).unwrap_or_default();
            ("mem", all)
        } else {
            let first = manager.read_lines(0, 500).unwrap_or_default();
            ("paged", first)
        };
        let name = PathBuf::from(path_str)
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| path_str.to_string());
        let id = self.state.register(manager);
        json!({
            "ok": true, "err": Json::Null,
            "id": id, "path": path_str,
            "name": name,
            "headers": headers,
            "total_rows": total,
            "mode": mode,
            "rows": rows,
        })
        .to_string()
    }

    fn respond_open_payload(&mut self, p: OpenPayload) -> String {
        let total = p.manager.total_rows;
        let headers = p.manager.headers.clone();
        let id = self.state.register(p.manager);
        json!({
            "ok": true, "err": Json::Null,
            "id": id, "path": p.path,
            "name": p.name,
            "headers": headers,
            "total_rows": total,
            "mode": p.mode,
            "rows": p.rows,
        })
        .to_string()
    }

    fn open_file(&mut self, delimiter: String, has_header_str: String) -> String {
        let _ = (delimiter, has_header_str);
        match rfd::FileDialog::new()
            .add_filter("CSV / Text", &["csv", "tsv", "txt"])
            .pick_file()
        {
            Some(path) => json!({ "ok": true, "path": path.to_string_lossy().to_string() }).to_string(),
            None => json!({ "ok": false, "cancelled": true }).to_string(),
        }
    }

    /// Start opening a file on a background thread. Two phases:
    ///   1. a streaming preview of the file head is sent first (instant, no
    ///      whole-file scan), so the UI can show rows right away;
    ///   2. the full mmap + memchr line index is built, then the ready payload
    ///      (session id + mode + total rows) is sent.
    /// The JS side polls `open_tick`.
    fn open_async(&mut self, path_str: String, delimiter: String, has_header_str: String) -> String {
        let has_header = has_header_str == "1" || has_header_str == "true";
        let delim = delim_byte(&delimiter);
        let (tx, rx) = mpsc::channel::<JobPayload>();
        let job = self.state.next_id();
        self.state.open_jobs.insert(job.clone(), OpenJob { rx, sent_preview: false });
        thread::spawn(move || {
            // Phase 1: streamed preview from the head (no full scan).
            match csvfile::preview(std::path::Path::new(&path_str), 500, has_header, delim) {
                Ok((headers, rows)) => {
                    let name = PathBuf::from(&path_str)
                        .file_name()
                        .map(|s| s.to_string_lossy().to_string())
                        .unwrap_or_else(|| path_str.clone());
                    let _ = tx.send(JobPayload::OpenPreview(PreviewPayload {
                        name,
                        path: path_str.clone(),
                        headers,
                        rows,
                    }));
                }
                Err(e) => {
                    let _ = tx.send(JobPayload::Open(Err(e)));
                    return;
                }
            }
            // Phase 2: full index build + first page.
            let res: Result<OpenPayload, String> = (|| {
                let manager = csvfile::LargeFileManager::new(PathBuf::from(&path_str), has_header, delim)?;
                let total = manager.total_rows;
                let mode = if total <= csvfile::IN_MEMORY_LIMIT { "mem" } else { "paged" };
                let want = if total <= csvfile::IN_MEMORY_LIMIT { total } else { 500 };
                let rows = manager.read_lines(0, want.min(total))?;
                Ok(OpenPayload {
                    manager,
                    path: path_str.clone(),
                    name: PathBuf::from(&path_str)
                        .file_name()
                        .map(|s| s.to_string_lossy().to_string())
                        .unwrap_or_else(|| path_str.clone()),
                    mode: mode.to_string(),
                    rows,
                })
            })();
            let _ = tx.send(JobPayload::Open(res));
        });
        json!({ "ok": true, "job": job }).to_string()
    }

    fn open_tick(&mut self, job: String) -> String {
        let mut oj = match self.state.open_jobs.remove(&job) {
            Some(oj) => oj,
            None => return err("unknown job"),
        };
        if !oj.sent_preview {
            match oj.rx.try_recv() {
                Err(TryRecvError::Empty) => {
                    self.state.open_jobs.insert(job, oj);
                    json!({ "pending": true }).to_string()
                }
                Err(TryRecvError::Disconnected) => err("background task failed"),
                Ok(JobPayload::OpenPreview(p)) => {
                    oj.sent_preview = true;
                    self.state.open_jobs.insert(job, oj);
                    json!({
                        "ok": true, "preview": true,
                        "path": p.path, "name": p.name,
                        "headers": p.headers, "rows": p.rows,
                    })
                    .to_string()
                }
                Ok(JobPayload::Open(Ok(p))) => self.respond_open_payload(p),
                Ok(JobPayload::Open(Err(e))) => err(&e),
                Ok(JobPayload::Save(_)) => err("unexpected save result for open job"),
            }
        } else {
            match oj.rx.try_recv() {
                Err(TryRecvError::Empty) => {
                    self.state.open_jobs.insert(job, oj);
                    json!({ "pending": true }).to_string()
                }
                Err(TryRecvError::Disconnected) => err("background task failed"),
                Ok(JobPayload::Open(Ok(p))) => self.respond_open_payload(p),
                Ok(JobPayload::Open(Err(e))) => err(&e),
                Ok(JobPayload::OpenPreview(_)) => err("unexpected preview in ready phase"),
                Ok(JobPayload::Save(_)) => err("unexpected save result for open job"),
            }
        }
    }

    fn open_file_path(&mut self, path_str: String, delimiter: String, has_header_str: String) -> String {
        let has_header = has_header_str == "1" || has_header_str == "true";
        self.open_path(&path_str, has_header, delim_byte(&delimiter))
    }

    fn write_path(&self, path_str: String, headers_json: String, rows_json: String, has_header_str: String, delimiter: String) -> String {
        let headers: Vec<String> = serde_json::from_str(&headers_json).unwrap_or_default();
        let rows: Vec<Vec<String>> = serde_json::from_str(&rows_json).unwrap_or_default();
        let has_header = has_header_str == "1" || has_header_str == "true";
        match csvfile::LargeFileManager::write_csv(
            std::path::Path::new(&path_str),
            &headers,
            &rows,
            has_header,
            delim_byte(&delimiter),
        ) {
            Ok(()) => ok(json!({ "path": path_str })),
            Err(e) => err(&e),
        }
    }

    fn read_rows(&self, id: String, start: i32, count: i32) -> String {
        let start = start.max(0) as usize;
        let count = count.max(0) as usize;
        match self.state.manager(&id) {
            Some(m) => match m.read_lines(start, count) {
                Ok(rows) => ok(json!(rows)),
                Err(e) => err(&e),
            },
            None => err("unknown session"),
        }
    }

    fn save_edits(&mut self, id: String, edits_json: String) -> String {
        let parsed: Json = match serde_json::from_str(&edits_json) {
            Ok(v) => v,
            Err(e) => return err(&format!("bad edit payload: {}", e)),
        };
        let edits = parse_edits(&parsed);
        match self.state.sessions.get_mut(&id) {
            Some(s) => match s.manager.apply_edits(&edits) {
                Ok(()) => ok(json!({ "path": s.manager.path.to_string_lossy().to_string() })),
                Err(e) => err(&e),
            },
            None => err("unknown session"),
        }
    }

    /// Save edits on a background thread (streaming rewrite of large files stays
    /// off the UI thread). Session id is returned with the result so `save_tick`
    /// can swap the refreshed manager back in.
    fn save_async(&mut self, id: String, edits_json: String) -> String {
        let parsed: Json = match serde_json::from_str(&edits_json) {
            Ok(v) => v,
            Err(e) => return err(&format!("bad edit payload: {}", e)),
        };
        let edits = parse_edits(&parsed);
        let session = match self.state.sessions.get(&id) {
            Some(s) => (s.manager.path.clone(), s.manager.has_header, s.manager.delimiter),
            None => return err("unknown session"),
        };
        let (tx, rx) = mpsc::channel::<JobPayload>();
        let job = self.state.next_id();
        self.state.jobs.insert(job.clone(), rx);
        thread::spawn(move || {
            let (path, has_header, delimiter) = session;
            let res: Result<(String, csvfile::LargeFileManager), String> = (|| {
                let mut m = csvfile::LargeFileManager::new(path, has_header, delimiter)?;
                m.apply_edits(&edits)?;
                Ok((id, m))
            })();
            let _ = tx.send(JobPayload::Save(res));
        });
        json!({ "ok": true, "job": job }).to_string()
    }

    fn save_tick(&mut self, job: String) -> String {
        let rx = match self.state.jobs.remove(&job) {
            Some(rx) => rx,
            None => return err("unknown job"),
        };
        match rx.try_recv() {
            Err(TryRecvError::Empty) => {
                self.state.jobs.insert(job, rx);
                json!({ "pending": true }).to_string()
            }
            Err(TryRecvError::Disconnected) => err("background task failed"),
            Ok(JobPayload::Save(Ok((id, manager)))) => {
                if let Some(s) = self.state.sessions.get_mut(&id) {
                    s.manager = manager;
                    ok(json!({ "path": s.manager.path.to_string_lossy().to_string() }))
                } else {
                    err("unknown session")
                }
            }
            Ok(JobPayload::Save(Err(e))) => err(&e),
            Ok(JobPayload::Open(_)) => err("unexpected open result for save job"),
            Ok(JobPayload::OpenPreview(_)) => err("unexpected open result for save job"),
        }
    }

    fn save_as(&self, default_name: String, headers_json: String, rows_json: String, has_header_str: String, delimiter: String) -> String {
        let headers: Vec<String> = serde_json::from_str(&headers_json).unwrap_or_default();
        let rows: Vec<Vec<String>> = serde_json::from_str(&rows_json).unwrap_or_default();
        let has_header = has_header_str == "1" || has_header_str == "true";
        let path = match rfd::FileDialog::new()
            .add_filter("CSV", &["csv"])
            .set_file_name(&default_name)
            .save_file()
        {
            Some(p) => p,
            None => return json!({ "ok": false, "cancelled": true }).to_string(),
        };
        match csvfile::LargeFileManager::write_csv(&path, &headers, &rows, has_header, delim_byte(&delimiter)) {
            Ok(()) => ok(json!({ "path": path.to_string_lossy().to_string() })),
            Err(e) => err(&e),
        }
    }

    fn export(&self, default_name: String, content: String) -> String {
        let path = match rfd::FileDialog::new()
            .set_file_name(&default_name)
            .save_file()
        {
            Some(p) => p,
            None => return json!({ "ok": false, "cancelled": true }).to_string(),
        };
        match std::fs::write(&path, &content) {
            Ok(()) => ok(json!({ "path": path.to_string_lossy().to_string() })),
            Err(e) => err(&e.to_string()),
        }
    }

    fn save_workspace(&self, data: String) -> String {
        match std::fs::write(&self.state.workspace_path, &data) {
            Ok(()) => ok(json!({ "path": self.state.workspace_path.to_string_lossy().to_string() })),
            Err(e) => err(&e.to_string()),
        }
    }

    fn load_workspace(&self) -> String {
        match std::fs::read_to_string(&self.state.workspace_path) {
            Ok(s) => s,
            Err(_) => "null".to_string(),
        }
    }

    fn reset_workspace(&mut self) -> String {
        let _ = std::fs::remove_file(&self.state.workspace_path);
        ok(json!({}))
    }

    fn list_addons(&self) -> String {
        match addons::list_addons() {
            Ok(list) => json!({ "ok": true, "data": list }).to_string(),
            Err(e) => err(&e),
        }
    }

    fn run_small(&self, addon_id: String, name: String, headers_json: String, rows_json: String) -> String {
        match addons::run_small(&addon_id, &name, &headers_json, &rows_json) {
            Ok(value) => json!({ "ok": true, "data": value }).to_string(),
            Err(e) => err(&e),
        }
    }

    fn run_big(&self, addon_id: String, name: String, file_path: String) -> String {
        match addons::run_big(&addon_id, &name, &file_path) {
            Ok(value) => json!({ "ok": true, "data": value }).to_string(),
            Err(e) => err(&e),
        }
    }

    fn log(&self, msg: String) -> String {
        eprintln!("[JS] {}", msg);
        String::new()
    }
}

impl sciter::EventHandler for Handler {
    dispatch_script_call! {
        fn list_addons();
        fn log(String);
        fn run_big(String, String, String);
        fn run_small(String, String, String, String);
        fn open_file(String, String);
        fn open_file_path(String, String, String);
        fn open_async(String, String, String);
        fn open_tick(String);
        fn save_async(String, String);
        fn save_tick(String);
        fn write_path(String, String, String, String, String);
        fn read_rows(String, i32, i32);
        fn save_edits(String, String);
        fn save_as(String, String, String, String, String);
        fn export(String, String);
        fn save_workspace(String);
        fn load_workspace();
        fn reset_workspace();
    }

    fn attached(&mut self, root: sciter::HELEMENT) {
        self._root = Some(Element::from(root));
    }
}

/// Parse a delimiter string like "," ";" "\t" "|" into a byte.
fn delim_byte(s: &str) -> u8 {
    match s {
        "\t" => b'\t',
        "\\t" => b'\t',
        "tab" => b'\t',
        "" => b',',
        _ => s.chars().next().map(|c| c as u8).unwrap_or(b','),
    }
}

fn parse_edits(parsed: &Json) -> BTreeMap<usize, Vec<String>> {
    let mut edits: BTreeMap<usize, Vec<String>> = BTreeMap::new();
    if let Some(obj) = parsed.as_object() {
        for (k, v) in obj {
            let idx: usize = match k.parse() {
                Ok(i) => i,
                Err(_) => continue,
            };
            let cells: Vec<String> = v
                .as_array()
                .map(|a| a.iter().map(|c| c.as_str().unwrap_or("").to_string()).collect())
                .unwrap_or_default();
            edits.insert(idx, cells);
        }
    }
    edits
}

fn main() {
    let sdk = std::env::var("SCITER_SDK").ok();
    if let Some(dir) = sdk {
        let candidates = [
            "bin/windows/x64/sciter.dll",
            "bin.win/x64/sciter.dll",
            "bin/win/x64/sciter.dll",
            "sciter.dll",
        ];
        for c in candidates {
            let p = PathBuf::from(&dir).join(c);
            if p.exists() {
                let _ = sciter::set_library(&p.to_string_lossy());
                break;
            }
        }
    }
    // If SCITER_SDK isn't set, try a sibling `sciter.dll` next to the executable
    // or in PATH (sciter-rs handles the latter). For dev convenience we also probe
    // the commonly used SDK location.
    if std::env::var("SCITER_SDK").ok().is_none() {
        let probes = [
            PathBuf::from("sciter.dll"),
            std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|d| d.join("sciter.dll")))
                .unwrap_or_default(),
        ];
        for p in probes {
            if p.exists() {
                let _ = sciter::set_library(&p.to_string_lossy());
                break;
            }
        }
    }
    let _ = sciter::set_options(sciter::RuntimeOptions::DebugMode(true));
    let _ = sciter::set_options(sciter::RuntimeOptions::ScriptFeatures(
        sciter::SCRIPT_RUNTIME_FEATURES::ALLOW_SYSINFO as u8 | sciter::SCRIPT_RUNTIME_FEATURES::ALLOW_FILE_IO as u8,
    ));

    let _ = addons::init();

    let mut frame = sciter::Window::new();
    frame.event_handler(Handler { _root: None, state: AppState::new() });

    // locate ui/app.htm: prefer next to the exe, fallback to manifest dir (dev)
    let mut ui_path: Option<PathBuf> = None;
    if let Some(exe) = std::env::current_exe().ok() {
        if let Some(dir) = exe.parent() {
            let p = dir.join("ui").join("app.htm");
            if p.exists() {
                ui_path = Some(p);
            }
        }
    }
    let ui_path = ui_path.unwrap_or_else(|| {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("ui").join("app.htm")
    });
    let absolute = std::fs::canonicalize(&ui_path)
        .unwrap_or(ui_path)
        .to_string_lossy()
        .trim_start_matches(r"\\?\")
        .to_string();
    frame.load_file(&absolute);
    frame.run_app();
}