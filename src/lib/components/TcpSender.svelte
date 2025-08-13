<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { TcpClient } from '$lib/tcp-client.js';
	import type { TcpReceivedMessage, TcpConnection } from '$lib/types/tcp.js';
	import { onMount, onDestroy } from 'svelte';
	import { listen } from '@tauri-apps/api/event';

	// 接続管理の状態
	let host = 'localhost';
	let port = 8080;
	let connection: TcpConnection | null = null;
	let isConnected = false;
	let connecting = false;
	let connectionError = '';
	let connectionResult = '';

	// 送信機能の状態
	let message = '';
	let sending = false;
	let sendResult = '';
	let sendError = '';

	// 受信機能の状態
	let receivedMessages: TcpReceivedMessage[] = [];
	let messagePollingInterval: number | null = null;

	// 送信履歴の状態
	interface SentMessage {
		id: string;
		message: string;
		timestamp: string;
		success: boolean;
	}
	let sentMessages: SentMessage[] = [];

	// キーボードイベントリスナーの管理
	let keyboardUnlisten: (() => void) | null = null;

	// 履歴コンテナの参照
	let historyContainer: HTMLDivElement;

	// 自動スクロール機能
	function scrollToBottom() {
		if (historyContainer) {
			setTimeout(() => {
				historyContainer.scrollTop = historyContainer.scrollHeight;
			}, 50);
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
				startMessagePolling();
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
			stopMessagePolling();
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
			timestamp: new Date().toLocaleTimeString(),
			success: false
		};

		try {
			const response = await TcpClient.sendMessageOnConnection(connection.id, messageToSend);

			if (response.success) {
				sentMessage.success = true;
				sentMessages = [...sentMessages, sentMessage];
				sendResult = response.message;
				message = ''; // 成功時はメッセージをクリア
				scrollToBottom();
			} else {
				sentMessages = [...sentMessages, sentMessage];
				sendError = response.error || '送信に失敗しました';
				scrollToBottom();
			}
		} catch (e) {
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

	// メッセージポーリング開始
	function startMessagePolling() {
		if (messagePollingInterval || !connection) return;

		messagePollingInterval = setInterval(async () => {
			if (!connection || !isConnected) {
				stopMessagePolling();
				return;
			}

			try {
				const response = await TcpClient.getReceivedMessagesFromConnection(connection.id);
				if (response.success) {
					const oldLength = receivedMessages.length;
					receivedMessages = response.messages;
					// 新しいメッセージが追加された場合のみスクロール
					if (response.messages.length > oldLength) {
						scrollToBottom();
					}
				}
			} catch (e) {
				console.error('メッセージ取得エラー:', e);
			}
		}, 1000); // 1秒ごとにポーリング
	}

	// メッセージポーリング停止
	function stopMessagePolling() {
		if (messagePollingInterval) {
			clearInterval(messagePollingInterval);
			messagePollingInterval = null;
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
	onMount(async () => {
		// Tauriキーボードリスナーをセットアップ
		await setupKeyboardListeners();

		// フォールバック用ブラウザキーボードイベントリスナー追加
		if (typeof window !== 'undefined') {
			window.addEventListener('keydown', handleGlobalKeydown);
		}

		return () => {
			stopMessagePolling();
			if (keyboardUnlisten) {
				keyboardUnlisten();
			}
			if (typeof window !== 'undefined') {
				window.removeEventListener('keydown', handleGlobalKeydown);
			}
		};
	});

	onDestroy(() => {
		stopMessagePolling();
		if (keyboardUnlisten) {
			keyboardUnlisten();
		}
		if (typeof window !== 'undefined') {
			window.removeEventListener('keydown', handleGlobalKeydown);
		}
	});

	// リアルタイムバリデーション
	$: connectionIsValid = TcpClient.validateConnection(host, port).valid;
	$: sendIsValid = isConnected && message.trim().length > 0;
</script>

<div class="flex h-screen flex-col bg-gray-900 font-mono text-green-400">
	<!-- ヘッダー: 接続情報 -->
	<div class="flex-shrink-0 border-b border-gray-700 bg-gray-800 p-4">
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
	<div class="flex-1 space-y-1 overflow-y-auto p-4" bind:this={historyContainer}>
		{#if isConnected}
			<!-- 統合されたメッセージ履歴 -->
			{@const allMessages = [
				...sentMessages.map((m) => ({ type: 'sent', ...m })),
				...receivedMessages.map((m) => ({ type: 'received', ...m }))
			].sort((a, b) => {
				const aTime =
					a.type === 'sent'
						? new Date(`1970-01-01 ${a.timestamp}`).getTime()
						: new Date(a.timestamp).getTime();
				const bTime =
					b.type === 'sent'
						? new Date(`1970-01-01 ${b.timestamp}`).getTime()
						: new Date(b.timestamp).getTime();
				return aTime - bTime;
			})}

			{#each allMessages as msg (msg.type === 'sent' ? `sent-${msg.id}` : `received-${msg.timestamp}-${msg.client_addr}`)}
				{#if msg.type === 'sent'}
					<div class="flex">
						<span class="mr-2 text-blue-400">[{msg.timestamp}]</span>
						<span class="mr-2 text-blue-300">→</span>
						<span class="break-all text-white">{msg.message}</span>
						{#if !msg.success}
							<span class="ml-2 text-red-400">(FAILED)</span>
						{/if}
					</div>
				{:else}
					<div class="flex">
						<span class="mr-2 text-green-400">[{new Date(msg.timestamp).toLocaleTimeString()}]</span
						>
						<span class="mr-2 text-green-300">←</span>
						<span class="break-all text-green-100">{msg.message}</span>
						<span class="ml-2 text-xs text-gray-400">({msg.client_addr})</span>
					</div>
				{/if}
			{/each}
		{:else}
			<div class="py-8 text-center text-gray-500">
				Not connected. Enter host:port and click Connect to start.
			</div>
		{/if}
	</div>

	<!-- 送信エリア（固定底部） -->
	{#if isConnected}
		<div class="flex-shrink-0 border-t border-gray-700 bg-gray-800 p-4">
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
					on:keydown={handleKeydown}
					style="field-sizing: content; min-height: 40px;"
				></textarea>
				<Button
					onclick={validateAndSend}
					disabled={!sendIsValid || sending}
					size="sm"
					class="self-end bg-green-600 text-white hover:bg-green-700"
				>
					{sending ? 'Sending...' : 'Send'}
				</Button>
			</div>
		</div>
	{/if}
</div>
