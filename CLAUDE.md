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

## Code Quality Requirements

タスク完了時に必ず実行すること：

1. `yarn format` - コードフォーマット
2. `yarn lint` - リント・型チェック
3. `yarn build` - ビルド確認

## Tech Stack

- SvelteKit (v2.22.0) + Svelte 5.0
- Tauri v2
- TypeScript (strict mode)
- Tailwind CSS v4
- Vite
- ESLint + Prettier

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

## Notes

- Tauri統合済み、デスクトップアプリとして動作可能
- WebアプリとしてもTauriアプリとしても動作可能
