import { invoke } from '@tauri-apps/api/core';
import type { TcpMessage, TcpSendResult } from './types/tcp.js';

export class TcpClient {
	/**
	 * TCPメッセージを送信します（CRデリミタ付き）
	 */
	static async sendMessage(host: string, port: number, message: string): Promise<TcpSendResult> {
		try {
			const tcpMessage: TcpMessage = {
				host: host.trim(),
				port,
				message: message.trim()
			};

			// 入力値の検証
			if (!tcpMessage.host) {
				return {
					success: false,
					message: '',
					error: 'ホスト名は必須です'
				};
			}

			if (tcpMessage.port <= 0 || tcpMessage.port > 65535) {
				return {
					success: false,
					message: '',
					error: 'ポート番号は1-65535の範囲で指定してください'
				};
			}

			if (!tcpMessage.message) {
				return {
					success: false,
					message: '',
					error: 'メッセージは必須です'
				};
			}

			// Tauriコマンドを呼び出し
			const result = await invoke<string>('send_tcp_message', { tcpMessage });

			return {
				success: true,
				message: result
			};
		} catch (error) {
			console.error('TCP送信エラー:', error);
			return {
				success: false,
				message: '',
				error: error instanceof Error ? error.message : '不明なエラーが発生しました'
			};
		}
	}

	/**
	 * ホスト名とポート番号の妥当性をチェックします
	 */
	static validateConnection(host: string, port: number): { valid: boolean; error?: string } {
		if (!host.trim()) {
			return { valid: false, error: 'ホスト名は必須です' };
		}

		if (port <= 0 || port > 65535) {
			return { valid: false, error: 'ポート番号は1-65535の範囲で指定してください' };
		}

		// 基本的なホスト名の形式チェック
		const hostRegex =
			/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$|^(\d{1,3}\.){3}\d{1,3}$/;
		if (!hostRegex.test(host.trim())) {
			return { valid: false, error: '無効なホスト名またはIPアドレスです' };
		}

		return { valid: true };
	}
}
