use std::fs;
use std::path::Path;

/// Nội dung file Python mặc định được nhúng trực tiếp vào binary lúc biên dịch
const DEFAULT_MAIN_EXT: &str = include_str!("../extensions/main_ext.py");

pub fn init_extensions() -> Result<(), Box<dyn std::error::Error>> {
    let home_dir = dirs::home_dir().unwrap_or_else(|| Path::new(".").to_path_buf());
    let ext_dir = home_dir.join(".plainsheet").join("extensions");

    if !ext_dir.exists() {
        fs::create_dir_all(&ext_dir)?;
        println!("Created extension directory at: {:?}", ext_dir);
    }

    let main_ext_path = ext_dir.join("main_ext.py");

    // Chỉ ghi đè nếu file chưa tồn tại để không làm mất chỉnh sửa của User
    if !main_ext_path.exists() {
        fs::write(&main_ext_path, DEFAULT_MAIN_EXT)?;
        println!("Extracted default python extension to: {:?}", main_ext_path);
    }

    Ok(())
}

pub fn get_extensions_path() -> String {
    if std::env::var("PLAINSHEET_DEV").is_ok() {
        return "/home/puleeno/Projects/plainsheet/extensions".to_string();
    }
    let home_dir = dirs::home_dir().unwrap_or_else(|| Path::new(".").to_path_buf());
    home_dir
        .join(".plainsheet")
        .join("extensions")
        .to_str()
        .unwrap()
        .to_string()
}
