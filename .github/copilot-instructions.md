# MCP Server Laravel Database - AI Coding Agent Instructions

## Agent Behavior Guidelines

### Context Gathering Strategy
- **Get context fast**: Parallelize discovery and stop as soon as you can act
- **Avoid over-searching**: Run targeted searches in one parallel batch instead of sequential queries
- **Early stop criteria**: Proceed when you can name exact content to change or when top hits converge (~70%) on one area
- **Trace smartly**: Only trace symbols you'll modify or whose contracts you rely on; avoid transitive expansion

### Working Mode
- **Persistence**: Keep going until the query is completely resolved before yielding back
- **Decision-making**: Don't ask for clarification on assumptions—make reasonable decisions and document them
- **Loop**: Batch search → minimal plan → complete task → search again only if validation fails

## Project Overview
This is a Model Context Protocol (MCP) server that provides database introspection and query execution for Laravel applications. It parses Laravel `.env` files, supports multiple database types (MySQL, PostgreSQL, MariaDB, SQLite), and includes Laravel Sail detection, SSH tunneling, and read-only mode with query validation.

See [README.md](../README.md) for complete project description.

## Architecture Fundamentals

### Three-Layer Request Flow
```
MCP Client → server.ts (protocol handlers) → resources/tools modules → connectors/base.ts → database-specific connectors
```

**Critical**: All database operations go through `BaseConnector` abstract class (`src/connectors/base.ts`). Each database type (MySQL, PostgreSQL, MariaDB, SQLite) has its own connector that implements this interface.

### Configuration Priority Order
1. Command-line arguments (highest)
2. Environment variables
3. `.env` file values (lowest)

See `src/config.ts:parseArguments()` and `buildConfig()` for implementation.

### Laravel Sail Auto-Detection
The server automatically detects Laravel Sail by checking `FORWARD_DB_PORT` in `.env` files (`src/utils/sail-detector.ts`). This is used instead of `DB_PORT` when present.

## Development Workflows

### Build and Test Commands
```powershell
yarn build              # Vite builds to dist/ with node22 target
yarn dev                # vite-node runs src/index.ts directly
yarn test               # Vitest unit tests
yarn test:coverage      # Coverage report
```

### Running Locally
```powershell
# Using built version
node dist/index.js --env /path/to/.env --readonly

# Development mode (no build needed)
yarn dev -- --db-connection sqlite --db-database ./test.db
```

### Testing with MCP Inspector
The MCP protocol uses stdio by default. To test manually:
```powershell
# Server responds to JSON-RPC over stdin/stdout
echo '{"jsonrpc":"2.0","id":1,"method":"initialize"}' | node dist/index.js --env .env
```

## Code Editing Principles

### General Guidelines
- **Readability**: Avoid environment-dependent characters, emojis, or non-standard character strings in code and comments
- **Maintainability**: Follow proper directory structure, maintain consistent naming conventions, organize shared logic appropriately
- **Consistency**: Maintain uniform patterns across the codebase—use established conventions for similar operations

## Code Patterns and Conventions

### Read-Only Query Validation
**Location**: `src/utils/query-validator.ts`

When `--readonly` flag is set, all SQL queries are validated before execution:
- **Allowed**: SELECT, SHOW, DESCRIBE, EXPLAIN, WITH...SELECT
- **Blocked**: INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE, GRANT, REVOKE

**Pattern**: Call `validateReadOnlyQuery(sql)` before `connector.executeQuery()`. It throws an error for write operations.

### Pagination Pattern
**Location**: `src/utils/pagination.ts`, `src/tools/execute-sql.ts`

```typescript
const pagination = calculatePagination({
  maxRows: params.max_rows || globalMaxRows,
  offset: params.offset,
  page: params.page,
  perPage: params.per_page,
});

if (pagination) {
  sql = applySqlPagination(sql, pagination);
}
```

Automatically appends `LIMIT` and `OFFSET` to queries. Supports both offset-based and page-based pagination.

### Resource URI Pattern
**Location**: `src/types/mcp.ts`, `src/server.ts`

MCP resources use URI templates:
- `db://schemas` - list all schemas
- `db://schemas/{schemaName}/tables` - list tables in schema
- `db://schemas/{schemaName}/tables/{tableName}` - table structure
- `db://schemas/{schemaName}/tables/{tableName}/indexes` - indexes

**Pattern**: Use regex matching to parse URIs in `ReadResourceRequestSchema` handler.

### Error Handling and Logging
**Location**: `src/utils/logger.ts`, `src/index.ts`

- Winston logger with configurable levels (error/warn/info/debug)
- `process.on('uncaughtException')` and `process.on('unhandledRejection')` handlers in `index.ts`
- Graceful shutdown on SIGINT/SIGTERM with `server.stop()`

### SSH Tunnel Management
**Location**: `src/utils/ssh-tunnel.ts`

When SSH options are provided, the server creates an SSH tunnel before connecting to the database. The tunnel is cleaned up on shutdown.

```typescript
if (config.ssh) {
  this.sshTunnel = await createSSHTunnel(config.ssh, config.database);
  // Update database config to use tunnel
  config.database.host = 'localhost';
  config.database.port = this.sshTunnel.localPort;
}
```

## Database Connector Implementation

### Adding a New Database Type
1. Extend `BaseConnector` in `src/connectors/`
2. Implement all abstract methods (connect, executeQuery, getSchemas, getTables, etc.)
3. Use database-specific identifier escaping in `escapeIdentifier()`
4. Add to switch statement in `src/server.ts:createConnector()`
5. Update CLI choices in `src/config.ts:parseArguments()`

### Schema Introspection Pattern
All connectors use `information_schema` queries (except SQLite which uses `sqlite_master`):
```typescript
// MySQL/MariaDB/PostgreSQL pattern
SELECT TABLE_NAME, TABLE_TYPE, TABLE_COMMENT
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = ?
```

## Testing Conventions

### Unit Tests
**Location**: `tests/*.test.ts`

Use Vitest with describe/it blocks. Focus on utility functions:
- `query-validator.test.ts` - read-only validation
- `pagination.test.ts` - pagination logic
- `sail-detector.test.ts` - Sail environment detection
- `env-parser.test.ts` - .env file parsing

### Integration Tests
**Location**: `tests/integration/mcp-server.test.ts`

Uses SQLite for fast, dependency-free testing. Creates an in-memory database with test schema in `beforeAll()`.

**Pattern**: Don't use Testcontainers for quick tests; use SQLite. For MySQL/PostgreSQL specific tests, use `@testcontainers/*` packages.

## Key Files for Context

- `src/server.ts` - MCP protocol implementation, request routing
- `src/connectors/base.ts` - Abstract connector interface
- `src/config.ts` - Configuration merging logic
- `src/utils/query-validator.ts` - Read-only mode enforcement
- `Documents/ARCHITECTURE.md` - Detailed architecture documentation
- `vite.config.ts` - Build configuration (note: `banner: '#!/usr/bin/env node\n'` for CLI)

## Build Configuration Notes

### Vite Build Setup
- **Target**: `node22` (minimum Node.js version)
- **Format**: ES modules only (`formats: ['es']`)
- **Externals**: All runtime dependencies are external (not bundled)
- **Banner**: Adds shebang for CLI execution
- **SSR mode**: Uses `ssr: true` for Node.js bundling

### Type Definitions
TypeScript types are organized in `src/types/`:
- `config.ts` - Server and database configuration types
- `database.ts` - Query results, schema info types
- `mcp.ts` - MCP protocol-specific types (resource templates, tool params)

## Common Pitfalls
- **Don't** call connector methods without checking `if (!this.connector)` in server.ts
- **Don't** forget to URI decode schema/table names from resource URIs (use `decodeURIComponent()`)
- **Don't** use string concatenation for SQL identifiers; use `escapeIdentifier()` or parameterized queries
- **Do** validate read-only queries before execution when `readonly: true`
- **Do** handle both `FORWARD_DB_PORT` and `DB_PORT` for Laravel Sail compatibility
