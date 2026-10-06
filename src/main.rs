#[macro_use] extern crate sciter;

struct Handler;

impl Handler {
    fn ping(&mut self, msg: String) -> String {
        format!("pong: {}", msg)
    }
}

impl sciter::EventHandler for Handler {
    dispatch_script_call! {
        fn ping(String);
    }
}

fn main() {
    let dll = r"C:\Users\Administrator\Projects\sciter-js-sdk-main\bin\windows\x64\sciter.dll";
    sciter::set_library(dll).expect("sciter dll");
    println!("sciter {}", sciter::version());

    let mut frame = sciter::Window::new();
    frame.event_handler(Handler);
    let uri = std::fs::canonicalize("ui/test.htm").unwrap();
    frame.load_file(&uri.to_string_lossy());
    frame.run_app();
}
