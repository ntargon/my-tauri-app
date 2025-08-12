<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { TcpClient } from '$lib/tcp-client.js';

	let host = 'localhost';
	let port = 8080;
	let message = '';
	let sending = false;
	let result = '';
	let error = '';

	async function sendMessage() {
		if (sending) return;

		sending = true;
		result = '';
		error = '';

		try {
			const response = await TcpClient.sendMessage(host, port, message);

			if (response.success) {
				result = response.message;
				message = ''; // 成功時はメッセージをクリア
			} else {
				error = response.error || '送信に失敗しました';
			}
		} catch (e) {
			error = e instanceof Error ? e.message : '予期しないエラーが発生しました';
		} finally {
			sending = false;
		}
	}

	function validateAndSend() {
		const validation = TcpClient.validateConnection(host, port);
		if (!validation.valid) {
			error = validation.error || '入力値に問題があります';
			return;
		}

		if (!message.trim()) {
			error = 'メッセージを入力してください';
			return;
		}

		sendMessage();
	}

	function clearResults() {
		result = '';
		error = '';
	}

	// リアルタイムバリデーション
	$: isValid = TcpClient.validateConnection(host, port).valid && message.trim().length > 0;
</script>

<Card class="w-full max-w-2xl">
	<CardHeader>
		<CardTitle>TCP メッセージ送信</CardTitle>
		<CardDescription>TCP接続でメッセージを送信します（CRデリミタ付き）</CardDescription>
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
				/>
			</div>
		</div>

		<div class="space-y-2">
			<Label for="message">メッセージ</Label>
			<Textarea
				id="message"
				bind:value={message}
				placeholder="送信するメッセージを入力してください..."
				rows="4"
				on:input={clearResults}
			/>
			<p class="text-sm text-muted-foreground">メッセージの末尾に自動的にCR（\r）が追加されます</p>
		</div>

		<div class="flex gap-2">
			<Button onclick={validateAndSend} disabled={!isValid || sending} class="flex-1">
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

		{#if result}
			<div class="rounded-md border border-green-200 bg-green-50 p-3">
				<p class="text-sm font-medium text-green-800">成功</p>
				<p class="text-sm text-green-700">{result}</p>
			</div>
		{/if}

		{#if error}
			<div class="rounded-md border border-red-200 bg-red-50 p-3">
				<p class="text-sm font-medium text-red-800">エラー</p>
				<p class="text-sm text-red-700">{error}</p>
			</div>
		{/if}

		<div class="space-y-2">
			<Label>接続情報</Label>
			<div class="text-sm text-muted-foreground">
				<p>送信先: {host}:{port}</p>
				<p>メッセージ長: {message.length} 文字</p>
				<p>状態: {isValid ? '✓ 送信可能' : '⚠ 入力確認が必要'}</p>
			</div>
		</div>
	</CardContent>
</Card>
