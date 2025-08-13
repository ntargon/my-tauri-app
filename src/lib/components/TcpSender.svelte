<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
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

	// キーボードイベントリスナーの管理
	let keyboardUnlisten: (() => void) | null = null;

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
		}
	}

	async function sendMessage() {
		if (sending || !isConnected || !connection) return;

		sending = true;
		sendResult = '';
		sendError = '';

		try {
			const response = await TcpClient.sendMessageOnConnection(connection.id, message);

			if (response.success) {
				sendResult = response.message;
				message = ''; // 成功時はメッセージをクリア
			} else {
				sendError = response.error || '送信に失敗しました';
			}
		} catch (e) {
			sendError = e instanceof Error ? e.message : '予期しないエラーが発生しました';
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

	function clearResults() {
		sendResult = '';
		sendError = '';
		connectionResult = '';
		connectionError = '';
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
					receivedMessages = response.messages;
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
				const payload = event.payload as any;
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

<div class="space-y-6">
	<!-- TCP接続管理 -->
	<Card class="w-full max-w-2xl">
		<CardHeader>
			<CardTitle>TCP接続管理</CardTitle>
			<CardDescription
				>TCP接続を確立してメッセージの送受信を行います • Ctrl+N：接続 • Ctrl+I：切断</CardDescription
			>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="host">ホスト</Label>
					<Input
						id="host"
						bind:value={host}
						placeholder="localhost または IPアドレス"
						on:input={clearResults}
						disabled={isConnected || connecting}
					/>
				</div>
				<div class="space-y-2">
					<Label for="port">ポート</Label>
					<Input
						id="port"
						type="number"
						bind:value={port}
						min="1"
						max="65535"
						placeholder="8080"
						on:input={clearResults}
						disabled={isConnected || connecting}
					/>
				</div>
			</div>

			<div class="flex gap-2">
				{#if !isConnected}
					<Button
						onclick={validateAndConnect}
						disabled={!connectionIsValid || connecting}
						class="flex-1"
					>
						{connecting ? '接続中...' : 'TCP接続 (Ctrl+N)'}
					</Button>
				{:else}
					<Button onclick={disconnectTcp} variant="destructive" class="flex-1"
						>接続切断 (Ctrl+I)</Button
					>
				{/if}
				<Badge variant={isConnected ? 'default' : 'secondary'}>
					{isConnected ? '接続中' : '切断中'}
				</Badge>
			</div>

			{#if connectionResult}
				<div class="rounded-md border border-green-200 bg-green-50 p-3">
					<p class="text-sm font-medium text-green-800">成功</p>
					<p class="text-sm text-green-700">{connectionResult}</p>
				</div>
			{/if}

			{#if connectionError}
				<div class="rounded-md border border-red-200 bg-red-50 p-3">
					<p class="text-sm font-medium text-red-800">エラー</p>
					<p class="text-sm text-red-700">{connectionError}</p>
				</div>
			{/if}

			<div class="space-y-2">
				<Label>接続情報</Label>
				<div class="text-sm text-muted-foreground">
					{#if isConnected && connection}
						<p>接続先: {connection.host}:{connection.port}</p>
						<p>接続ID: {connection.id}</p>
						<p>接続時刻: {connection.connectedAt}</p>
						<p>状態: ✓ 接続中</p>
						<p>受信数: {receivedMessages.length} 件</p>
					{:else}
						<p>接続先: {host}:{port}</p>
						<p>状態: ⚠ 未接続</p>
					{/if}
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- TCP送信 -->
	{#if isConnected}
		<Card class="w-full max-w-2xl">
			<CardHeader>
				<CardTitle>TCP メッセージ送信</CardTitle>
				<CardDescription>接続上でメッセージを送信します（CRデリミタ付き）</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-2">
					<Label for="message">メッセージ</Label>
					<textarea
						id="message"
						bind:value={message}
						placeholder="送信するメッセージを入力してください（Shift+Enterで送信）..."
						rows="4"
						class="flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40"
						on:input={clearResults}
						on:keydown={handleKeydown}
					></textarea>
					<p class="text-sm text-muted-foreground">
						メッセージの末尾に自動的にCR（\r）が追加されます • Shift+Enterで送信、Enterで改行
					</p>
				</div>

				<div class="flex gap-2">
					<Button onclick={validateAndSend} disabled={!sendIsValid || sending} class="flex-1">
						{sending ? '送信中...' : 'メッセージ送信'}
					</Button>
					<Button
						variant="outline"
						onclick={() => {
							message = '';
							clearResults();
						}}
						disabled={sending}
					>
						クリア
					</Button>
				</div>

				{#if sendResult}
					<div class="rounded-md border border-green-200 bg-green-50 p-3">
						<p class="text-sm font-medium text-green-800">成功</p>
						<p class="text-sm text-green-700">{sendResult}</p>
					</div>
				{/if}

				{#if sendError}
					<div class="rounded-md border border-red-200 bg-red-50 p-3">
						<p class="text-sm font-medium text-red-800">エラー</p>
						<p class="text-sm text-red-700">{sendError}</p>
					</div>
				{/if}

				<div class="space-y-2">
					<Label>送信情報</Label>
					<div class="text-sm text-muted-foreground">
						<p>送信先: {connection?.host}:{connection?.port}</p>
						<p>メッセージ長: {message.length} 文字</p>
						<p>状態: {sendIsValid ? '✓ 送信可能' : '⚠ 入力確認が必要'}</p>
					</div>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- 受信メッセージ履歴 -->
	{#if receivedMessages.length > 0}
		<Card class="w-full max-w-2xl">
			<CardHeader>
				<CardTitle>受信メッセージ履歴</CardTitle>
				<CardDescription>受信したメッセージの一覧（最新順）</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="max-h-96 space-y-3 overflow-y-auto">
					{#each receivedMessages
						.slice()
						.reverse() as msg (msg.timestamp + msg.client_addr + msg.message)}
						<div class="rounded-md border border-blue-200 bg-blue-50 p-3">
							<div class="mb-2 flex items-start justify-between">
								<Badge variant="outline" class="text-xs">
									{msg.client_addr}
								</Badge>
								<span class="text-xs text-blue-600">{msg.timestamp}</span>
							</div>
							<p class="font-mono text-sm break-all text-blue-800">{msg.message}</p>
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>
	{/if}
</div>
