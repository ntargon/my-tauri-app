import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TcpClient } from './tcp-client.js';
import { invoke } from '@tauri-apps/api/core';

// Tauriのinvokeをモック
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

describe('TcpClient', () => {
	const mockInvoke = vi.mocked(invoke);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('validateConnection', () => {
		it('有効なホスト名とポート番号の場合、validがtrueになる', () => {
			const result = TcpClient.validateConnection('localhost', 8080);
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('空のホスト名の場合、エラーメッセージが返される', () => {
			const result = TcpClient.validateConnection('', 8080);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('ホスト名は必須です');
		});

		it('無効なポート番号（0以下）の場合、エラーメッセージが返される', () => {
			const result = TcpClient.validateConnection('localhost', 0);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('ポート番号は1-65535の範囲で指定してください');
		});

		it('無効なポート番号（65535超過）の場合、エラーメッセージが返される', () => {
			const result = TcpClient.validateConnection('localhost', 65536);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('ポート番号は1-65535の範囲で指定してください');
		});

		it('IPアドレスが有効な場合、validがtrueになる', () => {
			const result = TcpClient.validateConnection('127.0.0.1', 8080);
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('無効なホスト名の場合、エラーメッセージが返される', () => {
			const result = TcpClient.validateConnection('invalid..hostname', 8080);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('無効なホスト名またはIPアドレスです');
		});
	});

	describe('sendMessage', () => {
		it('有効なパラメータでメッセージ送信が成功する', async () => {
			const mockResponse = 'Message sent successfully';
			mockInvoke.mockResolvedValue(mockResponse);

			const result = await TcpClient.sendMessage('localhost', 8080, 'Hello World');

			expect(result.success).toBe(true);
			expect(result.message).toBe(mockResponse);
			expect(result.error).toBeUndefined();
			expect(mockInvoke).toHaveBeenCalledWith('send_tcp_message', {
				tcpMessage: {
					host: 'localhost',
					port: 8080,
					message: 'Hello World'
				}
			});
		});

		it('空のホスト名の場合、エラーが返される', async () => {
			const result = await TcpClient.sendMessage('', 8080, 'Hello World');

			expect(result.success).toBe(false);
			expect(result.error).toBe('ホスト名は必須です');
			expect(mockInvoke).not.toHaveBeenCalled();
		});

		it('無効なポート番号の場合、エラーが返される', async () => {
			const result = await TcpClient.sendMessage('localhost', 0, 'Hello World');

			expect(result.success).toBe(false);
			expect(result.error).toBe('ポート番号は1-65535の範囲で指定してください');
			expect(mockInvoke).not.toHaveBeenCalled();
		});

		it('空のメッセージの場合、エラーが返される', async () => {
			const result = await TcpClient.sendMessage('localhost', 8080, '');

			expect(result.success).toBe(false);
			expect(result.error).toBe('メッセージは必須です');
			expect(mockInvoke).not.toHaveBeenCalled();
		});

		it('Tauriコマンド呼び出しでエラーが発生した場合、エラーが返される', async () => {
			const errorMessage = 'Connection failed';
			mockInvoke.mockRejectedValue(new Error(errorMessage));

			const result = await TcpClient.sendMessage('localhost', 8080, 'Hello World');

			expect(result.success).toBe(false);
			expect(result.error).toBe(errorMessage);
		});
	});

	describe('connect', () => {
		it('有効なパラメータで接続が成功する', async () => {
			const mockResponse = {
				success: true,
				connection: { id: 'conn-123', host: 'localhost', port: 8080 }
			};
			mockInvoke.mockResolvedValue(mockResponse);

			const result = await TcpClient.connect('localhost', 8080);

			expect(result.success).toBe(true);
			expect(result.connection).toEqual(mockResponse.connection);
			expect(mockInvoke).toHaveBeenCalledWith('connect_tcp', {
				request: {
					host: 'localhost',
					port: 8080
				}
			});
		});

		it('無効なホスト名の場合、エラーが返される', async () => {
			const result = await TcpClient.connect('', 8080);

			expect(result.success).toBe(false);
			expect(result.error).toBe('ホスト名は必須です');
			expect(mockInvoke).not.toHaveBeenCalled();
		});
	});

	describe('disconnect', () => {
		it('接続IDを指定して切断が成功する', async () => {
			const mockResponse = 'Disconnected successfully';
			mockInvoke.mockResolvedValue(mockResponse);

			const result = await TcpClient.disconnect('conn-123');

			expect(result.success).toBe(true);
			expect(result.message).toBe(mockResponse);
			expect(mockInvoke).toHaveBeenCalledWith('disconnect_tcp', {
				connectionId: 'conn-123'
			});
		});
	});

	describe('sendMessageOnConnection', () => {
		it('接続上でメッセージ送信が成功する', async () => {
			const mockResponse = { success: true, message: 'Message sent' };
			mockInvoke.mockResolvedValue(mockResponse);

			const result = await TcpClient.sendMessageOnConnection('conn-123', 'Hello');

			expect(result.success).toBe(true);
			expect(mockInvoke).toHaveBeenCalledWith('send_tcp_message_on_connection', {
				messageRequest: {
					connection_id: 'conn-123',
					message: 'Hello'
				}
			});
		});

		it('空のメッセージの場合、エラーが返される', async () => {
			const result = await TcpClient.sendMessageOnConnection('conn-123', '');

			expect(result.success).toBe(false);
			expect(result.error).toBe('メッセージは必須です');
			expect(mockInvoke).not.toHaveBeenCalled();
		});
	});

	describe('startServer', () => {
		it('サーバー開始が成功する', async () => {
			const mockResponse = 'Server started successfully';
			mockInvoke.mockResolvedValue(mockResponse);

			const result = await TcpClient.startServer('localhost', 8080);

			expect(result.success).toBe(true);
			expect(result.message).toBe(mockResponse);
			expect(mockInvoke).toHaveBeenCalledWith('start_tcp_server', {
				config: {
					host: 'localhost',
					port: 8080
				}
			});
		});
	});

	describe('stopServer', () => {
		it('サーバー停止が成功する', async () => {
			const mockResponse = 'Server stopped successfully';
			mockInvoke.mockResolvedValue(mockResponse);

			const result = await TcpClient.stopServer();

			expect(result.success).toBe(true);
			expect(result.message).toBe(mockResponse);
			expect(mockInvoke).toHaveBeenCalledWith('stop_tcp_server');
		});
	});

	describe('getReceivedMessages', () => {
		it('受信メッセージの取得が成功する', async () => {
			const mockResponse = {
				success: true,
				messages: ['Hello', 'World']
			};
			mockInvoke.mockResolvedValue(mockResponse);

			const result = await TcpClient.getReceivedMessages();

			expect(result.success).toBe(true);
			expect(result.messages).toEqual(['Hello', 'World']);
			expect(mockInvoke).toHaveBeenCalledWith('get_received_messages');
		});
	});

	describe('getReceivedMessagesFromConnection', () => {
		it('接続からの受信メッセージ取得が成功する', async () => {
			const mockResponse = {
				success: true,
				messages: ['Hello from connection']
			};
			mockInvoke.mockResolvedValue(mockResponse);

			const result = await TcpClient.getReceivedMessagesFromConnection('conn-123');

			expect(result.success).toBe(true);
			expect(result.messages).toEqual(['Hello from connection']);
			expect(mockInvoke).toHaveBeenCalledWith('get_received_messages_from_connection', {
				connectionId: 'conn-123'
			});
		});
	});
});