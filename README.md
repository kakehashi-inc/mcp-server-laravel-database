# MCP Server for Laravel Database

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org/)

A Model Context Protocol (MCP) server that provides seamless database access for Laravel applications. Automatically parses Laravel `.env` files and connects to MySQL, PostgreSQL, MariaDB, or SQLite databases.

[日本語版 README はこちら](./README-ja.md)

## Features

- ✨ **Automatic .env Parsing**: Reads database configuration from Laravel `.env` files
- 🚢 **Laravel Sail Support**: Automatically detects and uses `FORWARD_DB_PORT`
- 🔒 **Read-Only Mode**: Safe database exploration with query validation
- 📊 **Database Introspection**: List schemas, tables, columns, indexes, and procedures
- 🔍 **SQL Execution**: Execute queries with pagination support
- 🌐 **Multiple Databases**: Supports MySQL, PostgreSQL, MariaDB, and SQLite
- 🔐 **SSH Tunneling**: Secure connections to remote databases
- 📦 **Easy Integration**: Works with Claude Desktop and Cursor

## Usage

No installation required! Use directly with npx:

```bash
npx mcp-server-laravel-database --env /path/to/laravel/.env
```

## Quick Start

### 1. Basic Usage

Point to your Laravel `.env` file:

```bash
npx mcp-server-laravel-database --env /path/to/your/laravel/.env
```

### 2. With Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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

### 3. With Cursor

Add to your Cursor MCP settings:

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

## Configuration Options

### Using .env File

The server reads these variables from your Laravel `.env` file:

```properties
DB_CONNECTION=mysql       # mysql, pgsql, mariadb, or sqlite
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=laravel
DB_USERNAME=root
DB_PASSWORD=password
FORWARD_DB_PORT=13306    # Laravel Sail port (optional)
```

### Command-Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--env` | Path to Laravel .env file | - |
| `--db-connection` | Database type (mysql/pgsql/mariadb/sqlite) | mysql |
| `--db-host` | Database host | localhost |
| `--db-port` | Database port | 3306 |
| `--db-database` | Database name | Required |
| `--db-username` | Database username | - |
| `--db-password` | Database password | - |
| `--readonly` | Enable read-only mode | false |
| `--max-rows` | Maximum rows to return | - |
| `--ssl-mode` | SSL mode (disable/require/verify-ca/verify-full) | - |
| `--ssh-host` | SSH tunnel host | - |
| `--ssh-port` | SSH tunnel port | 22 |
| `--ssh-user` | SSH username | - |
| `--ssh-password` | SSH password | - |
| `--ssh-key` | SSH private key path | - |
| `--transport` | Transport mode (stdio/http) | stdio |
| `--listen` | HTTP server listen address (http transport only) | `localhost` |
| `--port` | HTTP server port (http transport only) | 3333 |
| `--log-level` | Log level (error/warn/info/debug) | info |

### Configuration Precedence

1. Command-line options (highest priority)
2. `.env` file specified via `--env`
3. Actual environment variables available in the current shell session

If you omit `--env`, the server still reads `DB_*` values (e.g., `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `FORWARD_DB_PORT`) directly from the environment. Providing `--env` overrides those values key-by-key while still allowing any remaining settings to fall back to the environment.

### Environment Variables

When no CLI flag is provided, the following environment variables are consulted:

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_CONNECTION` | Database type (`mysql`, `pgsql`, `mariadb`, `sqlite`) | `mysql` |
| `DB_HOST` | Database host (overridden to `127.0.0.1` when `FORWARD_DB_PORT` is used) | `localhost` |
| `DB_PORT` | Database port (use `.env` for Laravel Sail's `FORWARD_DB_PORT`) | Based on `DB_CONNECTION` (3306/5432/0) |
| `DB_DATABASE` | Database name (required) | - |
| `DB_USERNAME` | Database username | - |
| `DB_PASSWORD` | Database password | - |

Environment values are merged with `.env` contents (when provided) so that any keys missing from the file can still be picked up from the shell environment.

### Transport Modes

- **stdio** (default): Best for CLI-based clients like Claude Desktop or Cursor. The server emits all log lines to `stderr` so stdout stays reserved for MCP frames. No additional configuration is required.
- **http**: Implements the MCP Streamable HTTP transport (`2024-11-05`). All operations use the `/mcp` endpoint (POST for requests, GET for SSE streaming responses, DELETE to end the session) with the `Mcp-Session-Id` header. Session IDs are generated server-side.

Use `--listen` to choose the bind address for the HTTP listener when using the `http` transport. By default the server binds to `localhost` and port `3333`, which avoids typical Laravel web ports.

## Usage Examples

### MySQL Connection

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

### PostgreSQL Connection

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

### SQLite Database

```bash
npx mcp-server-laravel-database \
  --db-connection sqlite \
  --db-database /path/to/database.sqlite \
  --readonly
```

### Laravel Sail

For Laravel Sail projects, just point to the `.env` file - the server will automatically detect and use `FORWARD_DB_PORT`:

```bash
npx mcp-server-laravel-database --env /path/to/laravel/.env
```

### With SSH Tunnel

Connect to a remote database securely:

```bash
npx mcp-server-laravel-database \
  --env /path/to/.env \
  --ssh-host remote.example.com \
  --ssh-user deploy \
  --ssh-key ~/.ssh/id_rsa \
  --readonly
```

## MCP Resources

The server provides these resources for database introspection:

| Resource | URI | Description |
|----------|-----|-------------|
| Schemas | `db://schemas` | List all database schemas |
| Tables | `db://schemas/{schema}/tables` | List tables in a schema |
| Table Structure | `db://schemas/{schema}/tables/{table}` | Get table column definitions |
| Indexes | `db://schemas/{schema}/tables/{table}/indexes` | Get table indexes |
| Procedures | `db://schemas/{schema}/procedures` | List stored procedures |
| Procedure Details | `db://schemas/{schema}/procedures/{proc}` | Get procedure definition |

## MCP Tools

### execute_sql

Execute SQL queries with optional pagination.

**Parameters:**

- `sql` (string, required): SQL query to execute
- `max_rows` (number, optional): Maximum number of rows to return
- `offset` (number, optional): Offset for pagination
- `page` (number, optional): Page number (1-based)
- `per_page` (number, optional): Number of rows per page

**Example:**

```json
{
  "sql": "SELECT * FROM users WHERE active = 1",
  "page": 1,
  "per_page": 20
}
```

## Read-Only Mode

When `--readonly` is enabled:

- Only SELECT, SHOW, DESCRIBE, and EXPLAIN queries are allowed
- Write operations (INSERT, UPDATE, DELETE, DROP, etc.) are blocked
- For SQLite, uses database-level read-only mode
- For other databases, validates queries before execution

This is **highly recommended** for production databases.

## Security Best Practices

1. ✅ **Always use `--readonly` for production databases**
2. ✅ Use SSH tunneling for remote connections
3. ✅ Use database users with minimal permissions
4. ✅ Keep your `.env` files secure (never commit to Git)
5. ✅ Enable SSL/TLS for database connections when possible
6. ✅ Use strong passwords for database accounts

## Development

For developers who want to contribute or customize:

- See [DEVELOPMENT.md](./Documents/DEVELOPMENT.md) for development setup
- See [ARCHITECTURE.md](./Documents/ARCHITECTURE.md) for system design
- See [PUBLISHING.md](./Documents/PUBLISHING.md) for publishing guide

## License

MIT License - see [LICENSE](LICENSE) file for details
