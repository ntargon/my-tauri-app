# TCP Server

動作確認用のTCPサーバーです。CRデリミタ付きメッセージの受信をサポートしています。

## 機能

- 指定ポートでTCP接続を待機
- 複数クライアントの同時接続対応
- CRデリミタ（`\r`）およびLFデリミタ（`\n`）での区切り対応
- 受信メッセージのタイムスタンプ付きログ表示
- 接続数・メッセージ数の統計情報
- Ctrl+Cでの適切な終了処理

## ビルド

```bash
cd tools/tcp-server
cargo build --release
```

## 実行

### デフォルトポート（8080）で起動

```bash
cargo run
```

### カスタムポートで起動

```bash
cargo run -- --port 9999
```

### コンパイル済み実行ファイルを使用

```bash
# デフォルトポート
./target/release/tcp-server

# カスタムポート
./target/release/tcp-server --port 9999
```

## 使用方法

1. サーバーを起動
2. TauriアプリのTCPクライアント機能でメッセージを送信
3. サーバーのコンソールで受信メッセージを確認

### 例

```bash
$ cargo run -- --port 8080
TCP Server starting on 127.0.0.1:8080
Press Ctrl+C to stop
==================================================
[14:30:15] Connection #1 established from 127.0.0.1:52301
[14:30:15] Message #1 from 127.0.0.1:52301: "Hello, World!"
[14:30:20] Message #2 from 127.0.0.1:52301: "Test message"
[14:30:25] Client 127.0.0.1:52301 disconnected
```

## コマンドラインオプション

- `-p, --port <PORT>`: リスニングポート番号（デフォルト: 8080）
- `-h, --help`: ヘルプを表示
- `-V, --version`: バージョンを表示

## Tauriアプリとの連携

このTCPサーバーは、メインのTauriアプリケーションの`send_tcp_message`機能をテストするために設計されています。

1. TCPサーバーを起動
2. Tauriアプリを起動（`yarn tauri:dev`）
3. アプリのTCP送信機能を使用してメッセージを送信
4. サーバーのコンソールで受信確認