<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';

	import { TcpClient } from '$lib/tcp-client.js';
	import type { TcpReceivedMessage, TcpConnection } from '$lib/types/tcp.js';
	import { onMount, onDestroy } from 'svelte';
	import { listen, type UnlistenFn } from '@tauri-apps/api/event';
	import { fontSize, loadSettings } from '$lib/stores/settings.js';
	import { SettingsWindow } from '$lib/settings-window.js';

	// 接続管理の状態
	let host = $state('localhost');
	let port = $state(8080);
	let connection: TcpConnection | null = $state(null);
	let isConnected = $state(false);
	let connecting = $state(false);
	let connectionError = $state('');
	let connectionResult = $state('');

	// 送信機能の状態
	let message = $state('');
	let sending = $state(false);
	let sendResult = $state('');
	let sendError = $state('');

	// 受信機能の状態
	let receivedMessages: TcpReceivedMessage[] = $state([]);
	let messageEventUnlisten: UnlistenFn | null = null;

	// 送信履歴の状態
	interface SentMessage {
		id: string;
		message: string;
		timestamp: string;
		success: boolean;
	}
	let sentMessages: SentMessage[] = $state([]);

	// キーボードイベントリスナーの管理
	let keyboardUnlisten: (() => void) | null = null;

	// 履歴コンテナの参照
	let historyContainer: HTMLDivElement;

	// フォントサイズ設定
	let currentFontSize = $state(14);

	// Rustから取得したRFC 3339タイムスタンプをフォーマット
	function formatTimestampFromRust(timestamp: string): string {
		// RFC 3339形式: "2025-08-13T10:46:22.123Z" から時刻部分を抽出
		const match = timestamp.match(/T(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
		if (match) {
			const [, hour, minute, second, millisecond] = match;
			return `${hour}:${minute}:${second}.${millisecond}`;
		}
		// フォールバック: 通常のDate変換
		return new Date(timestamp).toLocaleTimeString('ja-JP', { hour12: false });
	}

	// 自動スクロール機能
	function scrollToBottom() {
		if (historyContainer) {
			setTimeout(() => {
				historyContainer.scrollTop = historyContainer.scrollHeight;
			}, 50);
		}
	}

	// 設定ウィンドウを開く
	async function openSettings() {
		try {
			await SettingsWindow.open();
		} catch (error) {
			console.error('設定ウィンドウを開く際にエラー:', error);
		}
	}

	async function connectTcp() {
		if (connecting || isConnected) return;

		connecting = true;
		connectionError = '';
		connectionResult = '';

		try {
			const response = await TcpClient.connect(host, port);

			if (response.success && response.connection) {
				connection = response.connection;
				isConnected = true;
				connectionResult = `接続確立: ${response.connection.host}:${response.connection.port}`;
				setupMessageEventListener();
			} else {
				connectionError = response.error || '接続に失敗しました';
			}
		} catch (e) {
			connectionError = e instanceof Error ? e.message : '予期しないエラーが発生しました';
		} finally {
			connecting = false;
		}
	}

	async function disconnectTcp() {
		if (!isConnected || !connection) return;

		try {
			stopMessageEventListener();
			const response = await TcpClient.disconnect(connection.id);

			if (response.success) {
				connectionResult = response.message;
			} else {
				connectionError = response.error || '切断に失敗しました';
			}
		} catch (e) {
			connectionError = e instanceof Error ? e.message : '予期しないエラーが発生しました';
		} finally {
			connection = null;
			isConnected = false;
			receivedMessages = [];
			sentMessages = [];
		}
	}

	async function sendMessage() {
		if (sending || !isConnected || !connection) return;

		sending = true;
		sendResult = '';
		sendError = '';

		const messageToSend = message;
		const sentMessage: SentMessage = {
			id: Date.now().toString(),
			message: messageToSend,
			timestamp: '', // Rustから取得するタイムスタンプで後から設定
			success: false
		};

		try {
			const response = await TcpClient.sendMessageOnConnection(connection.id, messageToSend);

			if (response.success) {
				sentMessage.success = true;
				sentMessage.timestamp = response.timestamp || new Date().toISOString(); // Rustからのタイムスタンプを使用、フォールバックでJavaScript時刻
				sentMessages = [...sentMessages, sentMessage];
				sendResult = response.message;
				message = ''; // 成功時はメッセージをクリア
				scrollToBottom();
			} else {
				sentMessage.timestamp = response.timestamp || new Date().toISOString(); // 失敗時もタイムスタンプを設定
				sentMessages = [...sentMessages, sentMessage];
				sendError = response.error || '送信に失敗しました';
				scrollToBottom();
			}
		} catch (e) {
			sentMessage.timestamp = new Date().toISOString(); // catch時はJavaScript時刻でフォールバック
			sentMessages = [...sentMessages, sentMessage];
			sendError = e instanceof Error ? e.message : '予期しないエラーが発生しました';
			scrollToBottom();
		} finally {
			sending = false;
		}
	}

	function validateAndConnect() {
		const validation = TcpClient.validateConnection(host, port);
		if (!validation.valid) {
			connectionError = validation.error || '入力値に問題があります';
			return;
		}

		connectTcp();
	}

	function validateAndSend() {
		if (!message.trim()) {
			sendError = 'メッセージを入力してください';
			return;
		}

		sendMessage();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && event.shiftKey) {
			event.preventDefault();

			if (!isConnected || !message.trim() || sending) {
				return;
			}

			validateAndSend();
		}
	}

	// イベントリスナー設定
	async function setupMessageEventListener() {
		if (!connection) return;

		try {
			// 既存のメッセージを取得
			const response = await TcpClient.getReceivedMessagesFromConnection(connection.id);
			if (response.success) {
				receivedMessages = response.messages;
			}

			// イベントリスナーを設定
			messageEventUnlisten = await listen('tcp_message_received', (event) => {
				const payload = event.payload as { connection_id: string; message: TcpReceivedMessage };

				// 現在の接続からのメッセージかチェック
				if (connection && payload.connection_id === connection.id) {
					receivedMessages = [...receivedMessages, payload.message];
					scrollToBottom();
				}
			});
		} catch (error) {
			console.error('イベントリスナー設定エラー:', error);
		}
	}

	// イベントリスナー停止
	function stopMessageEventListener() {
		if (messageEventUnlisten) {
			messageEventUnlisten();
			messageEventUnlisten = null;
		}
	}

	// Tauriキーボードショートカットハンドラー
	async function setupKeyboardListeners() {
		try {
			keyboardUnlisten = await listen('tauri://menu', (event) => {
				// Tauriのメニューイベント処理
				const payload = event.payload as { id: string };
				if (payload.id === 'connect') {
					if (!isConnected && !connecting && connectionIsValid) {
						connectTcp();
					}
				} else if (payload.id === 'disconnect') {
					if (isConnected && !connecting) {
						disconnectTcp();
					}
				}
			});
		} catch (error) {
			console.warn('キーボードリスナーのセットアップに失敗しました:', error);
		}
	}

	// フォールバック用のブラウザキーボードハンドラー
	function handleGlobalKeydown(event: KeyboardEvent) {
		// Ctrl+N: 接続
		if (event.ctrlKey && event.key === 'n') {
			event.preventDefault();
			if (!isConnected && !connecting && connectionIsValid) {
				connectTcp();
			}
			return;
		}

		// Ctrl+I: 切断
		if (event.ctrlKey && event.key === 'i') {
			event.preventDefault();
			if (isConnected && !connecting) {
				disconnectTcp();
			}
			return;
		}
	}

	// クリーンアップ
	onMount(() => {
		// 設定を読み込み
		loadSettings().catch((error) => {
			console.warn('設定の読み込みに失敗しました:', error);
		});

		// Tauriキーボードリスナーをセットアップ
		setupKeyboardListeners().catch((error) => {
			console.warn('キーボードリスナーのセットアップに失敗しました:', error);
		});

		// フォールバック用ブラウザキーボードイベントリスナー追加
		if (typeof window !== 'undefined') {
			window.addEventListener('keydown', handleGlobalKeydown);
		}

		return () => {
			stopMessageEventListener();
			if (keyboardUnlisten) {
				keyboardUnlisten();
			}
			if (typeof window !== 'undefined') {
				window.removeEventListener('keydown', handleGlobalKeydown);
			}
		};
	});

	onDestroy(() => {
		stopMessageEventListener();
		if (keyboardUnlisten) {
			keyboardUnlisten();
		}
		if (typeof window !== 'undefined') {
			window.removeEventListener('keydown', handleGlobalKeydown);
		}
	});

	// リアルタイムバリデーション
	const connectionIsValid = $derived(TcpClient.validateConnection(host, port).valid);
	const sendIsValid = $derived(isConnected && message.trim().length > 0);

	// フォントサイズストアとの同期
	$effect(() => {
		if ($fontSize !== currentFontSize) {
			currentFontSize = $fontSize;
		}
	});
</script>

<div
	class="flex h-screen flex-col bg-gray-900 font-mono text-green-400"
	style="--app-font-size: {currentFontSize}px;"
>
	<!-- ヘッダー: 接続情報 -->
	<div class="flex-shrink-0 border-b border-gray-700 bg-gray-800 p-2">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-4">
				<h1 class="text-lg font-bold">TCP Terminal</h1>
				<div class="flex items-center space-x-2">
					<input
						bind:value={host}
						placeholder="host"
						class="w-24 rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-white"
						disabled={isConnected || connecting}
					/>
					<span class="text-gray-400">:</span>
					<input
						type="number"
						bind:value={port}
						placeholder="port"
						min="1"
						max="65535"
						class="w-20 rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-white"
						disabled={isConnected || connecting}
					/>
				</div>
			</div>

			<div class="flex items-center space-x-4">
				<!-- 設定ボタン -->
				<Button
					size="sm"
					variant="ghost"
					onclick={openSettings}
					class="text-gray-400 hover:bg-gray-700 hover:text-white"
					title="設定を開く"
				>
					⚙️ 設定
				</Button>
			</div>

			<div class="flex items-center space-x-3">
				<Badge
					variant={isConnected ? 'default' : 'secondary'}
					class={isConnected ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}
				>
					{isConnected ? 'CONNECTED' : 'DISCONNECTED'}
				</Badge>

				{#if !isConnected}
					<Button
						size="sm"
						onclick={validateAndConnect}
						disabled={!connectionIsValid || connecting}
						class="bg-blue-600 text-white hover:bg-blue-700"
					>
						{connecting ? 'Connecting...' : 'Connect'}
					</Button>
				{:else}
					<Button
						size="sm"
						onclick={disconnectTcp}
						variant="destructive"
						class="bg-red-600 hover:bg-red-700"
					>
						Disconnect
					</Button>
				{/if}
			</div>
		</div>

		<!-- エラー・成功メッセージ -->
		{#if connectionError}
			<div class="mt-2 text-sm text-red-400">
				ERROR: {connectionError}
			</div>
		{/if}
		{#if connectionResult}
			<div class="mt-2 text-sm text-green-400">
				{connectionResult}
			</div>
		{/if}
	</div>

	<!-- メッセージ履歴エリア -->
	<div
		class="flex-1 space-y-1 overflow-y-auto p-2"
		bind:this={historyContainer}
		style="font-size: var(--app-font-size); min-height: 0;"
	>
		{#if isConnected}
			<!-- 統合されたメッセージ履歴 -->
			{@const allMessages = [
				...sentMessages.map((m) => ({ type: 'sent', ...m })),
				...receivedMessages.map((m) => ({ type: 'received', ...m }))
			].sort((a, b) => {
				// シンプルなタイムスタンプソート（古い→新しい）
				return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
			})}

			{#each allMessages as msg (msg.type === 'sent' ? `sent-${(msg as SentMessage).id}` : `received-${msg.timestamp}-${(msg as TcpReceivedMessage).client_addr}`)}
				{#if msg.type === 'sent'}
					<div class="flex">
						<span class="mr-2 text-blue-400">[{formatTimestampFromRust(msg.timestamp)}]</span>
						<span class="mr-2 text-blue-300">→</span>
						<span class="break-all text-white">{msg.message}</span>
						{#if !(msg as SentMessage).success}
							<span class="ml-2 text-red-400">(FAILED)</span>
						{/if}
					</div>
				{:else}
					<div class="flex">
						<span class="mr-2 text-green-400">[{formatTimestampFromRust(msg.timestamp)}]</span>
						<span class="mr-2 text-green-300">←</span>
						<span class="break-all text-green-100">{msg.message}</span>
						<span class="ml-2 text-xs text-gray-400"
							>({(msg as TcpReceivedMessage).client_addr})</span
						>
					</div>
				{/if}
			{/each}
		{:else}
			<div class="flex h-full flex-col items-center justify-center space-y-4 text-gray-500">
				<div class="text-lg">TCP Terminal Ready</div>
				<div class="text-center text-sm">
					Enter host:port above and click Connect to start<br />
					<span class="text-xs text-gray-600"
						>Shortcuts: Ctrl+N (Connect), Ctrl+I (Disconnect), Shift+Enter (Send)</span
					>
				</div>
			</div>
		{/if}
	</div>

	<!-- 送信エリア（固定底部） -->
	{#if isConnected}
		<div class="flex-shrink-0 border-t border-gray-700 bg-gray-800 p-2">
			{#if sendError}
				<div class="mb-2 text-sm text-red-400">
					ERROR: {sendError}
				</div>
			{/if}
			{#if sendResult}
				<div class="mb-2 text-sm text-green-400">
					{sendResult}
				</div>
			{/if}

			<div class="flex space-x-2">
				<div class="flex-shrink-0 self-end pb-2 text-green-400">$</div>
				<textarea
					bind:value={message}
					placeholder="Type message and press Shift+Enter to send..."
					rows="1"
					class="flex-1 resize-none rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-green-500 focus:outline-none"
					onkeydown={handleKeydown}
					style="field-sizing: content; min-height: 40px; max-height: 120px; font-size: var(--app-font-size);"
					aria-label="Message input"
				></textarea>
				<Button
					onclick={validateAndSend}
					disabled={!sendIsValid || sending}
					size="sm"
					class="self-end bg-green-600 text-white hover:bg-green-700"
					aria-label="Send message"
					title="Send message (Shift+Enter)"
				>
					{sending ? 'Sending...' : 'Send'}
				</Button>
			</div>
		</div>
	{/if}
</div>
