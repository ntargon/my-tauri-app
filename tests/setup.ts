import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Tauriのモック設定
global.window = Object.assign(global.window, {
	__TAURI_INTERNALS__: {
		plugins: {},
		invoke: vi.fn(),
		transformCallback: vi.fn(),
		convertFileSrc: vi.fn()
	}
});

// Tauri APIのモック
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(),
	emit: vi.fn()
}));

vi.mock('@tauri-apps/api/window', () => ({
	WebviewWindow: vi.fn(),
	getCurrentWindow: vi.fn(() => ({
		close: vi.fn(),
		setSize: vi.fn(),
		setPosition: vi.fn(),
		show: vi.fn(),
		hide: vi.fn()
	}))
}));
