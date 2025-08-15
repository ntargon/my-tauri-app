import { Store } from '@tauri-apps/plugin-store';
import { writable } from 'svelte/store';

export interface AppSettings {
	fontSize: number;
}

export interface MessageHistory {
	host: string;
	port: number;
	messages: string[];
	lastUpdated: string;
}

const DEFAULT_SETTINGS: AppSettings = {
	fontSize: 14
};

const MAX_HISTORY_SIZE = 50;

const SETTINGS_FILE = 'settings.json';

let store: Store | null = null;

export const fontSize = writable<number>(DEFAULT_SETTINGS.fontSize);
export const messageHistory = writable<MessageHistory[]>([]);

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
		if (newFontSize < 8 || newFontSize > 32) {
			throw new Error('フォントサイズは8px〜32pxの範囲で指定してください');
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

export async function loadMessageHistory(): Promise<MessageHistory[]> {
	try {
		const storeInstance = await getStore();
		const savedHistory = await storeInstance.get<MessageHistory[]>('messageHistory');
		const history = savedHistory ?? [];
		messageHistory.set(history);
		return history;
	} catch (error) {
		console.warn('メッセージ履歴の読み込みに失敗しました:', error);
		messageHistory.set([]);
		return [];
	}
}

export async function saveMessageToHistory(
	host: string,
	port: number,
	message: string
): Promise<void> {
	try {
		if (!message.trim()) return; // 空メッセージは保存しない

		const storeInstance = await getStore();
		const currentHistory = (await storeInstance.get<MessageHistory[]>('messageHistory')) ?? [];

		// 対象の接続先を検索
		const targetIndex = currentHistory.findIndex((h) => h.host === host && h.port === port);

		if (targetIndex === -1) {
			// 新しい接続先の場合
			currentHistory.push({
				host,
				port,
				messages: [message],
				lastUpdated: new Date().toISOString()
			});
		} else {
			// 既存の接続先の場合
			const existing = currentHistory[targetIndex];

			// 重複メッセージを除去（最新を残す）
			const filteredMessages = existing.messages.filter((m) => m !== message);
			filteredMessages.push(message);

			// 履歴サイズ制限
			if (filteredMessages.length > MAX_HISTORY_SIZE) {
				filteredMessages.splice(0, filteredMessages.length - MAX_HISTORY_SIZE);
			}

			currentHistory[targetIndex] = {
				...existing,
				messages: filteredMessages,
				lastUpdated: new Date().toISOString()
			};
		}

		await storeInstance.set('messageHistory', currentHistory);
		messageHistory.set(currentHistory);
	} catch (error) {
		console.error('メッセージ履歴の保存に失敗しました:', error);
		throw error;
	}
}

export function getHistoryForConnection(
	host: string,
	port: number,
	currentHistory?: MessageHistory[]
): string[] {
	const history = currentHistory ?? [];
	const connection = history.find((h) => h.host === host && h.port === port);
	return connection?.messages ?? [];
}

export async function clearHistoryForConnection(host: string, port: number): Promise<void> {
	try {
		const storeInstance = await getStore();
		const currentHistory = (await storeInstance.get<MessageHistory[]>('messageHistory')) ?? [];

		const filteredHistory = currentHistory.filter((h) => !(h.host === host && h.port === port));

		await storeInstance.set('messageHistory', filteredHistory);
		messageHistory.set(filteredHistory);
	} catch (error) {
		console.error('履歴のクリアに失敗しました:', error);
		throw error;
	}
}
