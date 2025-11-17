# アーキテクチャ概要

## システム設計

Laravel Database MCPサーバーは、明確な関心の分離を持つモジュラーアーキテクチャに従っています。

```
┌─────────────────────────────────────────────────────────┐
│                    MCPクライアント                        │
│              (Claude Desktop / Cursor)                   │
└────────────────────┬────────────────────────────────────┘
                     │ MCPプロトコル (stdio/http)
                     │
┌────────────────────▼────────────────────────────────────┐
│              MCPサーバー (server.ts)                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │           リクエストハンドラ                      │   │
│  │  • ListResources  • ReadResource                │   │
│  │  • ListTools      • CallTool                    │   │
│  └────────────┬─────────────────┬───────────────────┘   │
└───────────────┼─────────────────┼───────────────────────┘
                │                 │
        ┌───────▼──────┐   ┌─────▼──────────┐
        │  Resources   │   │     Tools      │
        │  Module      │   │    Module      │
        └───────┬──────┘   └─────┬──────────┘
                │                 │
                └────────┬────────┘
                         │
                ┌────────▼────────────┐
                │   Base Connector    │
                │    (base.ts)        │
                └────────┬────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐ ┌──────▼─────┐ ┌───────▼──────┐
│MySQL/MariaDB │ │ PostgreSQL │ │   SQLite     │
│  Connector   │ │ Connector  │ │  Connector   │
└───────┬──────┘ └──────┬─────┘ └───────┬──────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
                    ┌────▼────┐
                    │Database │
                    └─────────┘
```

## コアコンポーネント

### 1. エントリポイント（`index.ts`）

- コマンドライン引数の解析
- 設定の構築
- サーバーの初期化
- シグナル処理（SIGINT、SIGTERM）
- エラーハンドリング

### 2. 設定（`config.ts`）

**責務:**
- yargsを使用したコマンドライン引数の解析
- .envファイルの読み取りとマージ
- 統一された設定の構築
- Laravel Sail環境の検出

**設定優先順位:**
1. コマンドライン引数（最高）
2. `--env` で指定した .env ファイルの値
3. 環境変数

### 3. MCPサーバー（`server.ts`）

**責務:**
- MCPプロトコルハンドラの実装
- 適切なモジュールへのリクエストのルーティング
- データベース接続の管理
- SSHトンネリングの処理

**MCPプロトコルハンドラ:**
- `ListResources`: 利用可能なデータベースリソースを返す
- `ReadResource`: 特定のリソースデータを取得
- `ListTools`: 利用可能なツールを返す
- `CallTool`: ツール操作を実行

### 4. データベースコネクタ

#### ベースコネクタ（`connectors/base.ts`）

インターフェースを定義する抽象基底クラス：

```typescript
abstract class BaseConnector {
  // 接続管理
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  // クエリ実行
  abstract executeQuery(sql: string): Promise<QueryResult>;

  // スキーマ操作
  abstract getSchemas(): Promise<SchemaInfo[]>;
  abstract getTables(schema: string): Promise<TableInfo[]>;
  abstract getTableStructure(schema: string, table: string): Promise<ColumnInfo[]>;

  // インデックス操作
  abstract getIndexes(schema: string, table: string): Promise<IndexInfo[]>;

  // プロシージャ操作
  abstract getProcedures(schema: string): Promise<ProcedureInfo[]>;
  abstract getProcedureDetails(schema: string, proc: string): Promise<ProcedureInfo>;

  // ヘルスチェック
  abstract ping(): Promise<boolean>;
}
```

#### データベース固有のコネクタ

- **MySQLコネクタ**: `mysql2`パッケージを使用
- **PostgreSQLコネクタ**: `pg`パッケージを使用
- **MariaDBコネクタ**: `mariadb`パッケージを使用
- **SQLiteコネクタ**: `better-sqlite3`パッケージを使用

各コネクタはデータベース固有のSQLクエリと接続処理を実装します。

### 5. リソースモジュール

データベース情報取得用のMCPリソースを実装：

| リソース | URIパターン | 実装 |
|----------|-------------|----------------|
| スキーマ | `db://schemas` | `schemas.ts` |
| テーブル | `db://schemas/{schema}/tables` | `tables.ts` |
| テーブル構造 | `db://schemas/{schema}/tables/{table}` | `tables.ts` |
| インデックス | `db://schemas/{schema}/tables/{table}/indexes` | `indexes.ts` |
| プロシージャ | `db://schemas/{schema}/procedures` | `procedures.ts` |
| プロシージャ詳細 | `db://schemas/{schema}/procedures/{proc}` | `procedures.ts` |

### 6. ツールモジュール

データベース操作用のMCPツールを実装：

**execute_sql ツール:**
- SQLクエリの実行
- ページネーションのサポート（page/per_pageまたはoffset/max_rows）
- 読み取り専用モードの強制
- マークダウンテーブル形式で結果を返す

### 7. ユーティリティ

#### env-parser.ts
- Laravel .envファイルの解析
- データベース設定の抽出
- 引用符付き値の処理

#### logger.ts
- Winstonベースのロギング
- 機密情報のマスキング
- 設定可能なログレベル

#### sail-detector.ts
- Laravel Sail環境の検出
- FORWARD_DB_PORTが利用可能な場合に使用

#### query-validator.ts
- 読み取り専用モードでのSQLの検証
- 書き込み操作のブロック
- SELECT、SHOW、DESCRIBE、EXPLAINを許可

#### pagination.ts
- ページネーションパラメータの計算
- SQLへのLIMIT/OFFSETの適用
- 複数のページネーション形式をサポート

#### ssh-tunnel.ts
- リモートデータベース用のSSHトンネルを作成
- トンネルライフサイクルの管理
- データベース接続を転送

## データフロー

### リソースの読み取り

```
クライアント → ListResourcesリクエスト
  → サーバーが利用可能なリソースを返す

クライアント → ReadResourceリクエスト (db://schemas)
  → サーバー → schemas.ts
  → schemas.ts → connector.getSchemas()
  → connector → Database
  → Databaseがデータを返す
  → connectorがデータをフォーマット
  → サーバーがマークダウンとしてフォーマット
  → クライアントがマークダウンコンテンツを受信
```

### SQLの実行

```
クライアント → CallToolリクエスト (execute_sql)
  → サーバーがパラメータを検証
  → readonly時: クエリを検証
  → 要求があればページネーションを適用
  → execute-sql.ts → connector.executeQuery()
  → connector → Database
  → Databaseが結果を返す
  → connectorが結果をフォーマット
  → サーバーがマークダウンテーブルとしてフォーマット
  → クライアントがフォーマットされた結果を受信
```

## セキュリティアーキテクチャ

### 読み取り専用モード

`--readonly`フラグが設定されている場合：

1. 実行前のクエリ検証
2. ブロック: INSERT、UPDATE、DELETE、DROP、CREATE、ALTER、TRUNCATE
3. 許可: SELECT、SHOW、DESCRIBE、EXPLAIN

SQLiteの場合：
- `readonly: true`接続オプションを使用
- データベースレベルの強制

### SSHトンネリング

安全なリモート接続のため：

1. リモートホストへのSSHトンネルを確立
2. トンネル経由でデータベースポートを転送
3. ローカルトンネルエンドポイントに接続
4. すべてのデータベーストラフィックをSSH経由で暗号化

### 機密データ保護

- ログ内でパスワードをマスク
- 接続文字列のサニタイズ
- 秘密鍵の安全な処理
- エラーメッセージに認証情報を含めない

## エラーハンドリング

### 接続エラー

- 一時的な障害の再試行ロジック
- グレースフルデグラデーション
- 情報量の多いエラーメッセージ

### クエリエラー

- SQL構文エラーのキャッチと報告
- 読み取り専用違反を明確なメッセージでブロック
- タイムアウト処理

### シグナルハンドリング

- グレースフルシャットダウンのためのSIGINT/SIGTERM
- 接続のクリーンアップ
- SSHトンネルのクローズ
- ログのフラッシュ

## 拡張性

### 新しいデータベースタイプの追加

1. `BaseConnector`を実装したコネクタを作成
2. `server.ts`のコネクタファクトリに登録
3. `DatabaseType`列挙型にデータベースタイプを追加
4. ドキュメントを更新

### 新しいリソースの追加

1. `resources/`にリソースハンドラを作成
2. `server.ts`にURIパターンを登録
3. データ取得とフォーマットを実装
4. ドキュメントを更新

### 新しいツールの追加

1. `tools/`にツール実装を作成
2. `ListTools`ハンドラに登録
3. `CallTool`ハンドラに実装
4. 入力スキーマを定義
5. ドキュメントを更新

## パフォーマンス考慮事項

### 接続プーリング

現在はサーバーインスタンスごとに単一接続を使用。将来の機能拡張: 高同時実行シナリオ用の接続プーリング。

### クエリ最適化

- ページネーションで結果セットのサイズを制限
- information_schemaを使用した効率的なスキーマクエリ
- サポートされている場合はプリペアドステートメント

### メモリ管理

- 大きな結果セットのストリーミング（将来の機能拡張）
- ページネーションで結果セットのサイズを制限
- 切断時にリソースをクリーンアップ

## テスト戦略

### 単体テスト

- コンポーネントを個別にテスト
- データベース接続をモック
- ユーティリティ関数をテスト

### 統合テスト

- 実際のデータベースにテストコンテナを使用
- エンドツーエンドのワークフローをテスト
- MCPプロトコル準拠を検証

### 手動テスト

- Claude Desktopでテスト
- Cursorでテスト
- さまざまなLaravel設定でテスト
