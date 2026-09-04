#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 监听文件关联打开
            #[cfg(any(target_os = "windows", target_os = "linux"))]
            {
                // 处理启动参数中的文件路径
                let args: Vec<String> = std::env::args().collect();
                if args.len() > 1 {
                    let _file_path = args[1].clone();
                    // 前端通过事件接收
                }
            }
            let window = app.get_webview_window("main").unwrap();
            window.set_title("JSON助手 - json.cn 桌面版").unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
