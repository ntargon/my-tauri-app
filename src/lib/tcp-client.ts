import { invoke } from '@tauri-apps/api/core';
import type {
	TcpMessage,
	TcpSendResult,
	TcpServerConfig,
	TcpReceiveResult,
	TcpConnectionRequest,
	TcpConnectionResult,
	TcpMessageOnConnection
} from './types/tcp.js';

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

	/**
	 * TCPサーバーを開始します
	 */
	static async startServer(host: string, port: number): Promise<TcpSendResult> {
		try {
			const config: TcpServerConfig = {
				host: host.trim(),
				port
			};

			// 入力値の検証
			const validation = TcpClient.validateConnection(host, port);
			if (!validation.valid) {
				return {
					success: false,
					message: '',
					error: validation.error
				};
			}

			// Tauriコマンドを呼び出し
			const result = await invoke<string>('start_tcp_server', { config });

			return {
				success: true,
				message: result
			};
		} catch (error) {
			console.error('TCPサーバー開始エラー:', error);
			return {
				success: false,
				message: '',
				error: error instanceof Error ? error.message : '不明なエラーが発生しました'
			};
		}
	}

	/**
	 * TCPサーバーを停止します
	 */
	static async stopServer(): Promise<TcpSendResult> {
		try {
			const result = await invoke<string>('stop_tcp_server');

			return {
				success: true,
				message: result
			};
		} catch (error) {
			console.error('TCPサーバー停止エラー:', error);
			return {
				success: false,
				message: '',
				error: error instanceof Error ? error.message : '不明なエラーが発生しました'
			};
		}
	}

	/**
	 * 受信したメッセージを取得します
	 */
	static async getReceivedMessages(): Promise<TcpReceiveResult> {
		try {
			const result = await invoke<TcpReceiveResult>('get_received_messages');
			return result;
		} catch (error) {
			console.error('メッセージ取得エラー:', error);
			return {
				success: false,
				messages: [],
				error: error instanceof Error ? error.message : '不明なエラーが発生しました'
			};
		}
	}

	/**
	 * TCP接続を確立します
	 */
	static async connect(host: string, port: number): Promise<TcpConnectionResult> {
		try {
			const request: TcpConnectionRequest = {
				host: host.trim(),
				port
			};

			// 入力値の検証
			const validation = TcpClient.validateConnection(host, port);
			if (!validation.valid) {
				return {
					success: false,
					connection: undefined,
					error: validation.error
				};
			}

			// Tauriコマンドを呼び出し
			const result = await invoke<TcpConnectionResult>('connect_tcp', { request });
			return result;
		} catch (error) {
			console.error('TCP接続エラー:', error);
			return {
				success: false,
				connection: undefined,
				error: error instanceof Error ? error.message : '不明なエラーが発生しました'
			};
		}
	}

	/**
	 * TCP接続を切断します
	 */
	static async disconnect(connectionId: string): Promise<TcpSendResult> {
		try {
			const result = await invoke<string>('disconnect_tcp', { connectionId });

			return {
				success: true,
				message: result
			};
		} catch (error) {
			console.error('TCP切断エラー:', error);
			return {
				success: false,
				message: '',
				error: error instanceof Error ? error.message : '不明なエラーが発生しました'
			};
		}
	}

	/**
	 * 接続上でメッセージを送信します
	 */
	static async sendMessageOnConnection(
		connectionId: string,
		message: string
	): Promise<TcpSendResult> {
		try {
			if (!message.trim()) {
				return {
					success: false,
					message: '',
					error: 'メッセージは必須です'
				};
			}

			const messageRequest: TcpMessageOnConnection = {
				connection_id: connectionId,
				message: message.trim()
			};

			// Tauriコマンドを呼び出し
			const result = await invoke<string>('send_tcp_message_on_connection', { messageRequest });

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
	 * 接続から受信したメッセージを取得します
	 */
	static async getReceivedMessagesFromConnection(connectionId: string): Promise<TcpReceiveResult> {
		try {
			const result = await invoke<TcpReceiveResult>('get_received_messages_from_connection', {
				connectionId
			});
			return result;
		} catch (error) {
			console.error('メッセージ取得エラー:', error);
			return {
				success: false,
				messages: [],
				error: error instanceof Error ? error.message : '不明なエラーが発生しました'
			};
		}
	}
}
