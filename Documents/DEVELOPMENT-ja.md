# 開発ガイド

## 前提条件

- Node.js 22.0.0以上
- Yarn 4.0.0以上
- Laravelプロジェクト（テスト用）

## 開発環境のセットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/kakehashi-inc/mcp-server-laravel-database.git
cd mcp-server-laravel-database
```

### 2. 依存関係のインストール

```bash
yarn install
```

これにより以下の依存関係がインストールされます：
- MCP SDK
- データベースドライバ（MySQL、PostgreSQL、MariaDB、SQLite）
- 開発ツール（TypeScript、Vite、Vitest）

### 3. Yarnの設定

プロジェクトはYarn 4を使用し、以下の設定（`.yarnrc.yml`）を持っています：

```yaml
enableGlobalCache: true
nodeLinker: node-modules
nmMode: hardlinks-global
```

## 開発ワークフロー

### プロジェクトのビルド

Viteを使用してプロジェクトをビルド：

```bash
yarn build
```

これにより：
- TypeScriptがJavaScriptにコンパイルされます
- アプリケーションがバンドルされます
- `dist/index.js`に実行可能ファイルが生成されます
- CLI実行用のshebang（`#!/usr/bin/env node`）が追加されます

### 開発モード

ホットリロード付きで開発モードでサーバーを実行：

```bash
yarn dev
```

これは`vite-node`を使用してビルドなしで直接TypeScriptを実行します。

### テストの実行

テストスイートを実行：

```bash
yarn test
```

カバレッジ付きでテストを実行：

```bash
yarn test:coverage
```

### 実際のデータベースでテスト

1. テスト用のLaravelプロジェクトを作成するか、既存のものを使用
2. `.env`ファイルでデータベースを設定
3. Laravel `.env`ファイルを指定してサーバーを実行：

```bash
yarn dev -- --env /path/to/laravel/.env
```

## プロジェクト構造

```
mcp-server-laravel-database/
├── src/
│   ├── index.ts              # エントリポイント
│   ├── server.ts             # MCPサーバー実装
│   ├── config.ts             # 設定管理
│   ├── connectors/           # データベースコネクタ
│   │   ├── base.ts           # 基底コネクタインターフェース
│   │   ├── mysql.ts          # MySQLコネクタ
│   │   ├── postgres.ts       # PostgreSQLコネクタ
│   │   ├── mariadb.ts        # MariaDBコネクタ
│   │   └── sqlite.ts         # SQLiteコネクタ
│   ├── resources/            # MCPリソース
│   │   ├── schemas.ts        # スキーマ一覧
│   │   ├── tables.ts         # テーブル操作
│   │   ├── indexes.ts        # インデックス操作
│   │   └── procedures.ts     # プロシージャ操作
│   ├── tools/                # MCPツール
│   │   └── execute-sql.ts    # SQL実行ツール
│   ├── utils/                # ユーティリティモジュール
│   │   ├── env-parser.ts     # .envファイルパーサー
│   │   ├── logger.ts         # ロギングユーティリティ
│   │   ├── sail-detector.ts  # Laravel Sail検出
│   │   ├── query-validator.ts # 読み取り専用クエリ検証
│   │   ├── pagination.ts     # ページネーションユーティリティ
│   │   ├── ssh-tunnel.ts     # SSHトンネルサポート
│   │   └── dsn-builder.ts    # DSNビルダー
│   └── types/                # TypeScript型定義
│       ├── database.ts       # データベース型
│       ├── config.ts         # 設定型
│       └── mcp.ts            # MCP型
├── tests/                    # テストファイル
├── examples/                 # サンプル設定
└── Documents/                # 開発者向けドキュメント
```

## 新しいデータベースコネクタの追加

新しいデータベースタイプのサポートを追加するには：

1. `src/connectors/`に新しいコネクタを作成：

```typescript
import { BaseConnector } from './base.js';
import { DatabaseConfig, QueryResult, ... } from '../types/index.js';

export class NewDBConnector extends BaseConnector {
  async connect(): Promise<void> {
    // 実装
  }

  async disconnect(): Promise<void> {
    // 実装
  }

  async executeQuery(sql: string): Promise<QueryResult> {
    // 実装
  }

  // 他の必須メソッドを実装...
}
```

2. `src/server.ts`を更新して新しいコネクタを含める：

```typescript
private createConnector(): BaseConnector {
  const { database } = this.config;

  switch (database.type) {
    // ... 既存のケース
    case 'newdb':
      return new NewDBConnector(database, this.config.readonly);
    // ...
  }
}
```

3. `src/types/database.ts`にデータベースタイプを追加：

```typescript
export type DatabaseType = 'mysql' | 'pgsql' | 'mariadb' | 'sqlite' | 'newdb';
```

## コードスタイル

- TypeScriptのstrictモードを使用
- ESMモジュール形式に従う
- 非同期操作にはasync/awaitを使用
- 意味のある変数名と関数名を使用
- パブリックAPIにはJSDocコメントを追加
- 関数は小さく、焦点を絞って記述

## デバッグ

デバッグログを有効化：

```bash
yarn dev -- --env /path/to/.env --log-level debug
```

## よくある問題

### モジュール解決エラー

すべてのインポートに`.js`拡張子を使用してください：

```typescript
// 正しい
import { BaseConnector } from './base.js';

// 間違い
import { BaseConnector } from './base';
```

### データベース接続エラー

確認事項：
- データベース認証情報が正しい
- データベースサーバーが起動している
- ポートがファイアウォールでブロックされていない
- SSL設定が正しい

### ビルドエラー

ビルドをクリーンして再試行：

```bash
rm -rf dist
yarn build
```

## コントリビューション

1. フィーチャーブランチを作成
2. 変更を加える
3. 新機能のテストを追加
4. すべてのテストが成功することを確認
5. プルリクエストを提出

## リソース

- [Model Context Protocolドキュメント](https://modelcontextprotocol.io/)
- [MCP SDK GitHub](https://github.com/modelcontextprotocol/sdk)
- [Viteドキュメント](https://vitejs.dev/)
- [TypeScriptドキュメント](https://www.typescriptlang.org/)
