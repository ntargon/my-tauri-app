import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SettingsWindow } from './settings-window.js';
import { invoke } from '@tauri-apps/api/core';

// Tauriのinvokeをモック
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

describe('SettingsWindow', () => {
	const mockInvoke = vi.mocked(invoke);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('open', () => {
		it('設定ウィンドウを正常に開く', async () => {
			mockInvoke.mockResolvedValue(undefined);

			await expect(SettingsWindow.open()).resolves.toBeUndefined();
			expect(mockInvoke).toHaveBeenCalledWith('open_settings_window');
		});

		it('エラーが発生した場合、例外を再スローする', async () => {
			const errorMessage = 'Failed to open settings window';
			const error = new Error(errorMessage);
			mockInvoke.mockRejectedValue(error);

			await expect(SettingsWindow.open()).rejects.toThrow(errorMessage);
			expect(mockInvoke).toHaveBeenCalledWith('open_settings_window');
		});
	});

	describe('close', () => {
		it('設定ウィンドウを正常に閉じる', async () => {
			mockInvoke.mockResolvedValue(undefined);

			await expect(SettingsWindow.close()).resolves.toBeUndefined();
			expect(mockInvoke).toHaveBeenCalledWith('close_settings_window');
		});

		it('エラーが発生した場合、例外を再スローする', async () => {
			const errorMessage = 'Failed to close settings window';
			const error = new Error(errorMessage);
			mockInvoke.mockRejectedValue(error);

			await expect(SettingsWindow.close()).rejects.toThrow(errorMessage);
			expect(mockInvoke).toHaveBeenCalledWith('close_settings_window');
		});
	});

	describe('isOpen', () => {
		it('設定ウィンドウが開いている場合、trueを返す', async () => {
			mockInvoke.mockResolvedValue(true);

			const result = await SettingsWindow.isOpen();

			expect(result).toBe(true);
			expect(mockInvoke).toHaveBeenCalledWith('is_settings_window_open');
		});

		it('設定ウィンドウが閉じている場合、falseを返す', async () => {
			mockInvoke.mockResolvedValue(false);

			const result = await SettingsWindow.isOpen();

			expect(result).toBe(false);
			expect(mockInvoke).toHaveBeenCalledWith('is_settings_window_open');
		});

		it('エラーが発生した場合、falseを返す', async () => {
			const errorMessage = 'Failed to check settings window status';
			const error = new Error(errorMessage);
			mockInvoke.mockRejectedValue(error);

			const result = await SettingsWindow.isOpen();

			expect(result).toBe(false);
			expect(mockInvoke).toHaveBeenCalledWith('is_settings_window_open');
		});
	});
});
