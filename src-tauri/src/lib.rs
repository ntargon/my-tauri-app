mod tcp;
mod settings;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_store::Builder::default().build())
    .setup(|app| {
      // TCP機能用にAppHandleを初期化
      tcp::init_app_handle(app.handle().clone());
      
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        tcp::send_tcp_message,
        tcp::start_tcp_server,
        tcp::stop_tcp_server,
        tcp::get_received_messages,
        tcp::connect_tcp,
        tcp::disconnect_tcp,
        tcp::send_tcp_message_on_connection,
        tcp::get_received_messages_from_connection,
        settings::open_settings_window,
        settings::close_settings_window,
        settings::is_settings_window_open
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
