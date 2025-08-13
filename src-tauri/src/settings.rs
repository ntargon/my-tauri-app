use tauri::{command, AppHandle, Manager, Result};

#[command]
pub async fn open_settings_window(app: AppHandle) -> Result<()> {
    // 設定ウィンドウが既に存在するかチェック
    if let Some(window) = app.get_webview_window("settings") {
        // 既に存在する場合は前面に表示
        window.show()?;
        window.set_focus()?;
    } else {
        // 存在しない場合は新しいウィンドウを作成
        let _settings_window = tauri::WebviewWindowBuilder::new(
            &app,
            "settings",
            tauri::WebviewUrl::App("/settings".into())
        )
        .title("設定")
        .inner_size(500.0, 400.0)
        .min_inner_size(400.0, 300.0)
        .resizable(true)
        .center()
        .build()?;
    }
    Ok(())
}

#[command]
pub async fn close_settings_window(app: AppHandle) -> Result<()> {
    if let Some(window) = app.get_webview_window("settings") {
        window.hide()?;
    }
    Ok(())
}

#[command]
pub async fn is_settings_window_open(app: AppHandle) -> Result<bool> {
    Ok(app.get_webview_window("settings")
        .map(|w| w.is_visible().unwrap_or(false))
        .unwrap_or(false))
}