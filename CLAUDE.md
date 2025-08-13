# Claude Code Project Configuration

## Project Overview

SvelteKit + Tauri デスクトップアプリケーション（Tauri統合済み）

## Development Commands

```bash
# 開発サーバー起動
yarn dev

# ビルド
yarn build

# コード品質チェック
yarn lint
yarn format
yarn check

# プレビュー
yarn preview

# Tauri デスクトップアプリ開発
yarn tauri:dev

# Tauri デスクトップアプリビルド
yarn tauri:build
```

## Development Best Practices

### Tauri開発サーバーの継続実行

Tauri開発時は `yarn tauri:dev` をバックグラウンドで起動しっぱなしにすることを推奨：

```bash
# バックグラウンドでTauri開発サーバーを起動
yarn tauri:dev &
```

**メリット**：

- Rustコードの変更時に即座にコンパイルエラーを検出
- TypeScript/Svelteの変更もホットリロードで即座に反映
- デバッグ情報やログをリアルタイムで確認可能
- 開発効率の大幅向上

**運用方法**：

- 開発開始時にバックグラウンド起動
- コード変更後はターミナルでエラー有無を確認
- 必要に応じて `fg` でフォアグラウンドに戻してデバッグ

## Code Quality Requirements

タスク完了時に必ず実行すること：

1. `yarn format` - コードフォーマット
2. `yarn lint` - リント・型チェック
3. `yarn build` - ビルド確認
4. 必要に応じてPlaywrightツールでブラウザ動作確認を実行

## Tech Stack

- SvelteKit (v2.22.0) + Svelte 5.0
- Tauri v2
- TypeScript (strict mode)
- Tailwind CSS v4
- shadcn-svelte (UI コンポーネントライブラリ)
- Vite
- ESLint + Prettier
- Playwright (ブラウザテスト)

## Code Style

- タブインデント
- シングルクォート
- 行幅: 100文字
- TypeScript strict mode有効

## Project Structure

- `src/routes/` - ページコンポーネント
- `src/lib/` - 再利用可能コンポーネント・ユーティリティ
- `src/app.css` - グローバルスタイル（Tailwind）
- `static/` - 静的ファイル

## UI Components (shadcn-svelte)

```bash
# 新しいコンポーネント追加
npx shadcn-svelte@latest add [component-name]

# 例: Buttonコンポーネント追加済み
npx shadcn-svelte@latest add button
```

設定ファイル: `components.json`
コンポーネント配置: `src/lib/components/ui/`

## Debug Tools

### TCP テストサーバー

TCP通信機能のテスト用サーバーが `tools/tcp-server/` に用意されています：

```bash
# TCPテストサーバー起動
cd tools/tcp-server && cargo run

# または、プロジェクトルートから
cd tools/tcp-server
cargo run
```

**サーバー仕様**：

- アドレス: `127.0.0.1:8080` (localhost:8080)
- プロトコル: TCP
- 機能: エコーサーバー（受信したメッセージをそのまま返信）
- 停止: Ctrl+C

**デバッグ手順**：

1. TCPサーバー起動: `cd tools/tcp-server && cargo run`
2. Tauriアプリ起動: `yarn tauri:dev`
3. アプリでlocalhost:8080に接続してテスト
4. ショートカットキー動作確認:
   - Ctrl+N: TCP接続
   - Ctrl+I: TCP切断
   - Enter: メッセージ送信

## Notes

- Tauri統合済み、デスクトップアプリとして動作可能
- WebアプリとしてもTauriアプリとしても動作可能
- shadcn-svelte導入済み、UIコンポーネントライブラリが利用可能
- TCP通信機能実装済み（接続管理、メッセージ送受信、ショートカットキー対応）
