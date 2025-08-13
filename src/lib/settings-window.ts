import { invoke } from '@tauri-apps/api/core';

export class SettingsWindow {
	/**
	 * 設定ウィンドウを開く
	 */
	static async open(): Promise<void> {
		try {
			await invoke('open_settings_window');
		} catch (error) {
			console.error('設定ウィンドウを開く際にエラー:', error);
			throw error;
		}
	}

	/**
	 * 設定ウィンドウを閉じる
	 */
	static async close(): Promise<void> {
		try {
			await invoke('close_settings_window');
		} catch (error) {
			console.error('設定ウィンドウを閉じる際にエラー:', error);
			throw error;
		}
	}

	/**
	 * 設定ウィンドウが開いているかチェック
	 */
	static async isOpen(): Promise<boolean> {
		try {
			return await invoke('is_settings_window_open');
		} catch (error) {
			console.error('設定ウィンドウの状態確認でエラー:', error);
			return false;
		}
	}
}
