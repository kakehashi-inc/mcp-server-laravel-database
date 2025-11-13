# Publishing Guide

## Prerequisites

- npm account with publishing permissions
- Access to the repository
- Git configured with SSH or HTTPS

## Pre-publish Checklist

Before publishing a new version:

1. ✅ All tests pass: `yarn test`
2. ✅ Build succeeds: `yarn build`
3. ✅ Documentation is up to date
4. ✅ CHANGELOG.md is updated
5. ✅ Version number is bumped in `package.json`
6. ✅ README examples work correctly

## Version Numbering

Follow Semantic Versioning (SemVer):

- **MAJOR**: Breaking changes (e.g., 1.0.0 → 2.0.0)
- **MINOR**: New features, backward compatible (e.g., 1.0.0 → 1.1.0)
- **PATCH**: Bug fixes, backward compatible (e.g., 1.0.0 → 1.0.1)

## Publishing Steps

### 1. Update Version

Update the version in `package.json`:

```json
{
  "version": "1.0.1"
}
```

### 2. Update CHANGELOG

Add release notes to `CHANGELOG.md`:

```markdown
## [1.0.1] - 2024-01-15

### Added
- New feature description

### Changed
- Change description

### Fixed
- Bug fix description
```

### 3. Commit Changes

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 1.0.1"
```

### 4. Create Git Tag

```bash
git tag -a v1.0.1 -m "Release v1.0.1"
```

### 5. Build the Project

```bash
yarn build
```

Verify the build output in `dist/`:

```bash
ls -la dist/
```

### 6. Test the Build

Test the built package locally:

```bash
node dist/index.js --help
```

### 7. Publish to npm

Dry run first to check what will be published:

```bash
npm publish --dry-run
```

If everything looks good, publish:

```bash
npm publish
```

### 8. Push Changes

Push the commit and tag to the repository:

```bash
git push origin main
git push origin v1.0.1
```

## Publishing to GitHub Releases

1. Go to the repository on GitHub
2. Click on "Releases" → "Draft a new release"
3. Select the tag you just created (v1.0.1)
4. Set the release title: "v1.0.1"
5. Copy release notes from CHANGELOG.md
6. Attach any additional assets if needed
7. Click "Publish release"

## Automated Publishing (CI/CD)

For automated publishing using GitHub Actions, create `.github/workflows/publish.yml`:

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

      - name: Enable Corepack
        run: corepack enable

      - name: Install dependencies
        run: yarn install

      - name: Run tests
        run: yarn test

      - name: Build
        run: yarn build

      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Post-publish Verification

After publishing:

1. Verify the package on npm: `https://www.npmjs.com/package/mcp-server-laravel-database`
2. Test installation: `npx mcp-server-laravel-database --help`
3. Check package metadata: `npm view mcp-server-laravel-database`
4. Test with a real project

## Unpublishing (Emergency Only)

If you need to unpublish a version (within 72 hours):

```bash
npm unpublish mcp-server-laravel-database@1.0.1
```

**Note**: Unpublishing is discouraged. Consider deprecating instead:

```bash
npm deprecate mcp-server-laravel-database@1.0.1 "This version has critical bugs, please upgrade to 1.0.2"
```

## Package Maintenance

### Deprecating Old Versions

```bash
npm deprecate mcp-server-laravel-database@1.0.0 "Please upgrade to 1.0.1 or higher"
```

### Updating Package Metadata

Update package.json and publish a patch version:

```bash
# Update description, keywords, etc.
yarn version patch
yarn build
npm publish
```

## Troubleshooting

### Authentication Errors

Login to npm:

```bash
npm login
```

### Permission Errors

Ensure you have permission to publish:

```bash
npm owner ls mcp-server-laravel-database
```

### Build Errors

Clean and rebuild:

```bash
rm -rf dist node_modules
yarn install
yarn build
```

### Version Already Exists

Cannot republish the same version. Update the version:

```bash
yarn version patch
```

## Security

- Don't commit `.npmrc` with authentication tokens
- Use npm automation tokens for CI/CD
- Enable 2FA on npm account
- Regularly audit dependencies: `yarn audit`

## Support

- Report issues: https://github.com/kakehashi-inc/mcp-server-laravel-database/issues
- Security issues: Email security@example.com (replace with actual contact)
