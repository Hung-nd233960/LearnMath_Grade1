// A thin desktop shell: it only shows the built web app (../dist) in a window. All logic lives in src/.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("the app could not start");
}
