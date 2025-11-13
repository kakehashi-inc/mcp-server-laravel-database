# MCP Server for Laravel Database

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org/)

Laravelアプリケーションのデータベースへのシームレスなアクセスを提供するModel Context Protocol (MCP) サーバーです。Laravelの`.env`ファイルを自動的に解析し、MySQL、PostgreSQL、MariaDB、SQLiteデータベースに接続します。

[English README is here](./README.md)

## 特徴

- ✨ **自動.env解析**: Laravelの`.env`ファイルからデータベース設定を読み取り
- 🚢 **Laravel Sailサポート**: `FORWARD_DB_PORT`を自動検出して使用
- 🔒 **読み取り専用モード**: クエリ検証による安全なデータベース探索
- 📊 **データベース情報取得**: スキーマ、テーブル、カラム、インデックス、プロシージャの一覧表示
- 🔍 **SQL実行**: ページネーション対応のクエリ実行
- 🌐 **複数データベース対応**: MySQL、PostgreSQL、MariaDB、SQLiteをサポート
- 🔐 **SSHトンネリング**: リモートデータベースへの安全な接続
- 📦 **簡単な統合**: Claude DesktopとCursorで動作

## 使い方

インストール不要！npxで直接使用できます：

```bash
npx mcp-server-laravel-database --env /path/to/laravel/.env
```

## クイックスタート

### 1. 基本的な使い方

Laravelの`.env`ファイルを指定します：

```bash
npx mcp-server-laravel-database --env /path/to/your/laravel/.env
```

### 2. Claude Desktopとの使用

Claude Desktopの設定ファイル（macOSでは`~/Library/Application Support/Claude/claude_desktop_config.json`）に追加：

```json
{
  "mcpServers": {
    "laravel-database": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-server-laravel-database",
        "--env",
        "/absolute/path/to/your/laravel/.env",
        "--readonly"
      ]
    }
  }
}
```

### 3. Cursorとの使用

CursorのMCP設定に追加：

```json
{
  "mcpServers": {
    "laravel-database": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-server-laravel-database",
        "--env",
        "/absolute/path/to/your/laravel/.env",
        "--readonly"
      ]
    }
  }
}
```

## 設定オプション

### .envファイルを使用

サーバーはLaravelの`.env`ファイルから以下の変数を読み取ります：

```properties
DB_CONNECTION=mysql       # mysql, pgsql, mariadb, sqlite
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=laravel
DB_USERNAME=root
DB_PASSWORD=password
FORWARD_DB_PORT=13306    # Laravel Sailポート（オプション）
```

### コマンドラインオプション

| オプション | 説明 | デフォルト |
|--------|-------------|---------|
| `--env` | Laravel .envファイルへのパス | - |
| `--db-connection` | データベースタイプ (mysql/pgsql/mariadb/sqlite) | mysql |
| `--db-host` | データベースホスト | localhost |
| `--db-port` | データベースポート | 3306 |
| `--db-database` | データベース名 | 必須 |
| `--db-username` | データベースユーザー名 | - |
| `--db-password` | データベースパスワード | - |
| `--readonly` | 読み取り専用モードを有効化 | false |
| `--max-rows` | 返す最大行数 | - |
| `--ssl-mode` | SSLモード (disable/require/verify-ca/verify-full) | - |
| `--ssh-host` | SSHトンネルホスト | - |
| `--ssh-port` | SSHトンネルポート | 22 |
| `--ssh-user` | SSHユーザー名 | - |
| `--ssh-password` | SSHパスワード | - |
| `--ssh-key` | SSH秘密鍵パス | - |
| `--log-level` | ログレベル (error/warn/info/debug) | info |

## 使用例

### MySQL接続

```bash
npx mcp-server-laravel-database \
  --db-connection mysql \
  --db-host localhost \
  --db-port 3306 \
  --db-database myapp \
  --db-username root \
  --db-password secret \
  --readonly
```

### PostgreSQL接続

```bash
npx mcp-server-laravel-database \
  --db-connection pgsql \
  --db-host localhost \
  --db-port 5432 \
  --db-database myapp \
  --db-username postgres \
  --db-password secret \
  --readonly
```

### SQLiteデータベース

```bash
npx mcp-server-laravel-database \
  --db-connection sqlite \
  --db-database /path/to/database.sqlite \
  --readonly
```

### Laravel Sail

Laravel Sailプロジェクトの場合、`.env`ファイルを指定するだけで、サーバーが自動的に`FORWARD_DB_PORT`を検出して使用します：

```bash
npx mcp-server-laravel-database --env /path/to/laravel/.env
```

### SSHトンネル経由

リモートデータベースに安全に接続：

```bash
npx mcp-server-laravel-database \
  --env /path/to/.env \
  --ssh-host remote.example.com \
  --ssh-user deploy \
  --ssh-key ~/.ssh/id_rsa \
  --readonly
```

## MCPリソース

データベース情報取得用に以下のリソースを提供：

| リソース | URI | 説明 |
|----------|-----|-------------|
| スキーマ | `db://schemas` | 全データベーススキーマの一覧 |
| テーブル | `db://schemas/{schema}/tables` | スキーマ内のテーブル一覧 |
| テーブル構造 | `db://schemas/{schema}/tables/{table}` | テーブルのカラム定義取得 |
| インデックス | `db://schemas/{schema}/tables/{table}/indexes` | テーブルのインデックス取得 |
| プロシージャ | `db://schemas/{schema}/procedures` | ストアドプロシージャ一覧 |
| プロシージャ詳細 | `db://schemas/{schema}/procedures/{proc}` | プロシージャ定義取得 |

## MCPツール

### execute_sql

オプションのページネーション付きでSQLクエリを実行します。

**パラメータ:**

- `sql` (string, 必須): 実行するSQLクエリ
- `max_rows` (number, オプション): 返す最大行数
- `offset` (number, オプション): ページネーション用のオフセット
- `page` (number, オプション): ページ番号（1始まり）
- `per_page` (number, オプション): 1ページあたりの行数

**例:**

```json
{
  "sql": "SELECT * FROM users WHERE active = 1",
  "page": 1,
  "per_page": 20
}
```

## 読み取り専用モード

`--readonly`が有効な場合：

- SELECT、SHOW、DESCRIBE、EXPLAINクエリのみ許可
- 書き込み操作（INSERT、UPDATE、DELETE、DROPなど）はブロック
- SQLiteの場合、データベースレベルの読み取り専用モードを使用
- その他のデータベースでは、実行前にクエリを検証

本番データベースには**強く推奨**されます。

## セキュリティベストプラクティス

1. ✅ **本番データベースには必ず`--readonly`を使用**
2. ✅ リモート接続にはSSHトンネリングを使用
3. ✅ 最小限の権限を持つデータベースユーザーを使用
4. ✅ `.env`ファイルを安全に保管（Gitにコミットしない）
5. ✅ 可能な場合はデータベース接続にSSL/TLSを有効化
6. ✅ データベースアカウントに強力なパスワードを使用

## 開発

コントリビュートまたはカスタマイズしたい開発者向け：

- 開発環境のセットアップは [DEVELOPMENT-ja.md](./Documents/DEVELOPMENT-ja.md) を参照
- システム設計は [ARCHITECTURE-ja.md](./Documents/ARCHITECTURE-ja.md) を参照
- 公開ガイドは [PUBLISHING-ja.md](./Documents/PUBLISHING-ja.md) を参照

## ライセンス

MITライセンス - 詳細は [LICENSE](LICENSE) ファイルを参照
