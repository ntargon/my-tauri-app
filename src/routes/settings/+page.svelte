<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { Slider } from '$lib/components/ui/slider/index.js';
	import { fontSize, loadSettings, saveFontSize, resetSettings } from '$lib/stores/settings.js';
	import { onMount } from 'svelte';
	import { invoke } from '@tauri-apps/api/core';

	// フォントサイズ設定
	let currentFontSize = $state(14);
	let fontSizeSliderValue = $state(14);
	let saving = $state(false);
	let saveMessage = $state('');

	// フォントサイズ変更ハンドラー
	async function handleFontSizeChange(value: number) {
		if (saving) return;

		saving = true;
		saveMessage = '';

		try {
			await saveFontSize(value);
			currentFontSize = value;
			saveMessage = '保存しました';
			// 2秒後にメッセージを消す
			setTimeout(() => {
				saveMessage = '';
			}, 2000);
		} catch (error) {
			console.error('フォントサイズの保存に失敗:', error);
			saveMessage = '保存に失敗しました';
			// エラー時はスライダーを元の値に戻す
			fontSizeSliderValue = currentFontSize;
			setTimeout(() => {
				saveMessage = '';
			}, 3000);
		} finally {
			saving = false;
		}
	}

	// 設定をリセット
	async function handleReset() {
		if (saving) return;

		saving = true;
		saveMessage = '';

		try {
			await resetSettings();
			currentFontSize = 14;
			fontSizeSliderValue = 14;
			saveMessage = 'リセットしました';
			setTimeout(() => {
				saveMessage = '';
			}, 2000);
		} catch (error) {
			console.error('設定のリセットに失敗:', error);
			saveMessage = 'リセットに失敗しました';
			setTimeout(() => {
				saveMessage = '';
			}, 3000);
		} finally {
			saving = false;
		}
	}

	// 設定ウィンドウを閉じる
	async function closeSettings() {
		try {
			await invoke('close_settings_window');
		} catch (error) {
			console.error('設定ウィンドウを閉じる際にエラー:', error);
		}
	}

	onMount(() => {
		// 設定を読み込み
		loadSettings().catch((error) => {
			console.warn('設定の読み込みに失敗しました:', error);
		});
	});

	// フォントサイズストアとの同期
	$effect(() => {
		if ($fontSize !== currentFontSize) {
			currentFontSize = $fontSize;
			fontSizeSliderValue = $fontSize;
		}
	});
</script>

<svelte:head>
	<title>設定 - TCP Terminal</title>
</svelte:head>

<div class="min-h-screen bg-gray-900 p-6" style="--app-font-size: {currentFontSize}px;">
	<div class="mx-auto max-w-2xl">
		<!-- ヘッダー -->
		<div class="mb-6 flex items-center justify-between">
			<h1 class="text-2xl font-bold text-white">設定</h1>
			<Button variant="ghost" onclick={closeSettings} class="text-gray-400 hover:text-white">
				✕
			</Button>
		</div>

		<!-- フォント設定 -->
		<Card class="mb-6 border-gray-700 bg-gray-800">
			<CardHeader>
				<CardTitle class="text-white">フォント設定</CardTitle>
				<CardDescription class="text-gray-400">
					アプリケーション全体のフォントサイズを調整できます
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-300">フォントサイズ</span>
						<span class="font-mono text-sm text-green-400">{currentFontSize}px</span>
					</div>

					<div class="flex items-center space-x-4">
						<span class="text-xs text-gray-500">8px</span>
						<div class="flex-1">
							<Slider
								type="single"
								bind:value={fontSizeSliderValue}
								onValueChange={handleFontSizeChange}
								min={8}
								max={32}
								step={1}
								class="text-green-400"
								disabled={saving}
							/>
						</div>
						<span class="text-xs text-gray-500">32px</span>
					</div>

					<!-- プレビューテキスト -->
					<div
						class="rounded border border-gray-600 bg-gray-700 p-3 font-mono text-green-400"
						style="font-size: var(--app-font-size);"
					>
						<div class="text-blue-400">[12:34:56.789] →</div>
						<div class="text-white">Hello, TCP Terminal!</div>
						<div class="text-green-400">[12:34:56.790] ←</div>
						<div class="text-green-100">Echo: Hello, TCP Terminal!</div>
					</div>

					{#if saveMessage}
						<div
							class="text-center text-sm"
							class:text-green-400={saveMessage.includes('保存') ||
								saveMessage.includes('リセット')}
							class:text-red-400={saveMessage.includes('失敗')}
						>
							{saveMessage}
						</div>
					{/if}
				</div>
			</CardContent>
		</Card>

		<!-- 将来の設定セクションのプレースホルダー -->
		<Card class="mb-6 border-gray-700 bg-gray-800 opacity-50">
			<CardHeader>
				<CardTitle class="text-gray-500">その他の設定</CardTitle>
				<CardDescription class="text-gray-600">
					将来のバージョンで追加予定の設定項目
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-2 text-sm text-gray-600">
					<div>• テーマ設定（ダーク/ライトモード）</div>
					<div>• 接続履歴の管理</div>
					<div>• キーボードショートカット設定</div>
					<div>• ログ保存設定</div>
				</div>
			</CardContent>
		</Card>

		<!-- アクションボタン -->
		<div class="flex justify-between">
			<Button
				variant="destructive"
				onclick={handleReset}
				disabled={saving}
				class="bg-red-600 hover:bg-red-700"
			>
				{saving ? '処理中...' : '設定をリセット'}
			</Button>

			<Button onclick={closeSettings} class="bg-blue-600 hover:bg-blue-700">閉じる</Button>
		</div>
	</div>
</div>
