# パッケージ公開ガイド

## 前提条件

- npm公開権限を持つnpmアカウント
- リポジトリへのアクセス権
- SSHまたはHTTPSで設定されたGit

## 公開前のチェックリスト

新しいバージョンを公開する前に：

1. ✅ すべてのテストが成功：`npm test`
2. ✅ ビルドが成功：`npm run build`
3. ✅ ドキュメントが最新
4. ✅ CHANGELOG.mdが更新されている
5. ✅ `package.json`のバージョン番号が更新されている
6. ✅ READMEの例が正しく動作する

## バージョン番号付け

セマンティックバージョニング（SemVer）に従います：

- **MAJOR**: 破壊的変更（例：1.0.0 → 2.0.0）
- **MINOR**: 新機能、後方互換性あり（例：1.0.0 → 1.1.0）
- **PATCH**: バグ修正、後方互換性あり（例：1.0.0 → 1.0.1）

## 公開手順

### 1. バージョンの更新

`package.json`のバージョンを更新：

```json
{
  "version": "1.0.1"
}
```

### 2. CHANGELOGの更新

`CHANGELOG.md`にリリースノートを追加：

```markdown
## [1.0.1] - 2024-01-15

### 追加
- 新機能の説明

### 変更
- 変更の説明

### 修正
- バグ修正の説明
```

### 3. 変更のコミット

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 1.0.1"
```

### 4. Gitタグの作成

```bash
git tag -a v1.0.1 -m "Release v1.0.1"
```

### 5. プロジェクトのビルド

```bash
npm run build
```

`dist/`のビルド出力を確認：

```bash
ls -la dist/
```

### 6. ビルドのテスト

ビルドされたパッケージをローカルでテスト：

```bash
node dist/index.js --help
```

### 7. npmへの公開

まずドライランで公開内容を確認：

```bash
npm publish --dry-run
```

問題がなければ公開：

```bash
npm publish
```

### 8. 変更のプッシュ

コミットとタグをリポジトリにプッシュ：

```bash
git push origin main
git push origin v1.0.1
```

## GitHubリリースへの公開

1. GitHubのリポジトリページを開く
2. "Releases" → "Draft a new release"をクリック
3. 作成したタグを選択（v1.0.1）
4. リリースタイトルを設定："v1.0.1"
5. CHANGELOG.mdからリリースノートをコピー
6. 必要に応じて追加のアセットを添付
7. "Publish release"をクリック

## 自動公開（CI/CD）

GitHub Actionsを使用した自動公開の場合、`.github/workflows/publish.yml`を作成：

```yaml
name: Publish Package

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 公開後の確認

公開後に確認すること：

1. npmでパッケージを確認：`https://www.npmjs.com/package/mcp-server-laravel-database`
2. インストールをテスト：`npx mcp-server-laravel-database --help`
3. パッケージメタデータを確認：`npm view mcp-server-laravel-database`
4. 実際のプロジェクトでテスト

## 公開取り消し（緊急時のみ）

バージョンの公開取り消しが必要な場合（72時間以内）：

```bash
npm unpublish mcp-server-laravel-database@1.0.1
```

**注意**: 公開取り消しは推奨されません。代わりに非推奨にすることを検討：

```bash
npm deprecate mcp-server-laravel-database@1.0.1 "このバージョンには重大なバグがあります。1.0.2以上にアップグレードしてください"
```

## パッケージメンテナンス

### 古いバージョンの非推奨化

```bash
npm deprecate mcp-server-laravel-database@1.0.0 "1.0.1以上にアップグレードしてください"
```

### パッケージメタデータの更新

package.jsonを更新してパッチバージョンを公開：

```bash
# description、keywordsなどを更新
npm version patch
npm run build
npm publish
```

## トラブルシューティング

### 認証エラー

npmにログイン：

```bash
npm login
```

### 権限エラー

公開権限があることを確認：

```bash
npm owner ls mcp-server-laravel-database
```

### ビルドエラー

クリーンして再ビルド：

```bash
rm -rf dist node_modules
npm install
npm run build
```

### バージョンが既に存在

同じバージョンを再公開することはできません。バージョンを更新：

```bash
npm version patch
```

## セキュリティ

- 認証トークンを含む`.npmrc`をコミットしない
- CI/CD用にはnpm自動化トークンを使用
- npmアカウントで2FAを有効化
- 定期的に依存関係を監査：`npm audit`

## サポート

- 問題の報告：https://github.com/kakehashi-inc/mcp-server-laravel-database/issues
- セキュリティ問題：Email security@example.com（実際の連絡先に置き換えてください）
