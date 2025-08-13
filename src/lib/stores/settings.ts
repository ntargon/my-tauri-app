import { Store } from '@tauri-apps/plugin-store';
import { writable } from 'svelte/store';

export interface AppSettings {
	fontSize: number;
}

const DEFAULT_SETTINGS: AppSettings = {
	fontSize: 14
};

const SETTINGS_FILE = 'settings.json';

let store: Store | null = null;

export const fontSize = writable<number>(DEFAULT_SETTINGS.fontSize);

async function getStore(): Promise<Store> {
	if (!store) {
		store = await Store.load(SETTINGS_FILE, { autoSave: true });
	}
	return store;
}

export async function loadSettings(): Promise<void> {
	try {
		const storeInstance = await getStore();
		const savedFontSize = await storeInstance.get<number>('fontSize');

		const actualFontSize = savedFontSize ?? DEFAULT_SETTINGS.fontSize;
		fontSize.set(actualFontSize);
	} catch (error) {
		console.warn('設定の読み込みに失敗しました:', error);
		fontSize.set(DEFAULT_SETTINGS.fontSize);
	}
}

export async function saveFontSize(newFontSize: number): Promise<void> {
	try {
		if (newFontSize < 12 || newFontSize > 24) {
			throw new Error('フォントサイズは12px〜24pxの範囲で指定してください');
		}

		const storeInstance = await getStore();
		await storeInstance.set('fontSize', newFontSize);
		fontSize.set(newFontSize);
	} catch (error) {
		console.error('フォントサイズの保存に失敗しました:', error);
		throw error;
	}
}

export async function resetSettings(): Promise<void> {
	try {
		const storeInstance = await getStore();
		await storeInstance.set('fontSize', DEFAULT_SETTINGS.fontSize);
		fontSize.set(DEFAULT_SETTINGS.fontSize);
	} catch (error) {
		console.error('設定のリセットに失敗しました:', error);
		throw error;
	}
}
