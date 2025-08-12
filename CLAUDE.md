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

## Notes

- Tauri統合済み、デスクトップアプリとして動作可能
- WebアプリとしてもTauriアプリとしても動作可能
- shadcn-svelte導入済み、UIコンポーネントライブラリが利用可能
