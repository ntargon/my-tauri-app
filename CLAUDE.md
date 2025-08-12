# Claude Code Project Configuration

## Project Overview
SvelteKit + Tauri アプリケーション（現在はWebアプリとして動作、Tauri統合は未実装）

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
```

## Code Quality Requirements
タスク完了時に必ず実行すること：
1. `yarn format` - コードフォーマット
2. `yarn lint` - リント・型チェック
3. `yarn build` - ビルド確認

## Tech Stack
- SvelteKit (v2.22.0) + Svelte 5.0
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
- Tauri CLIはインストール済みだが、まだ初期化されていない
- 将来的に `yarn tauri init` でデスクトップアプリ化可能