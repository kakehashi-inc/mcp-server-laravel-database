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

## Installation

### Using npx (Recommended)

No installation required! Use directly with npx:

```bash
npx mcp-server-laravel-database --env /path/to/laravel/.env
```

### Global Installation

```bash
npm install -g mcp-server-laravel-database
```

## Quick Start

### 1. Basic Usage

Point to your Laravel `.env` file:

```bash
mcp-server-laravel-database --env /path/to/your/laravel/.env
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
| `--log-level` | Log level (error/warn/info/debug) | info |

## Usage Examples

### MySQL Connection

```bash
mcp-server-laravel-database \
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
mcp-server-laravel-database \
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
mcp-server-laravel-database \
  --db-connection sqlite \
  --db-database /path/to/database.sqlite \
  --readonly
```

### Laravel Sail

For Laravel Sail projects, just point to the `.env` file - the server will automatically detect and use `FORWARD_DB_PORT`:

```bash
mcp-server-laravel-database --env /path/to/laravel/.env
```

### With SSH Tunnel

Connect to a remote database securely:

```bash
mcp-server-laravel-database \
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

## Troubleshooting

### Connection Refused

- Verify database server is running
- Check host and port settings
- Ensure firewall allows connections
- For Sail: verify `FORWARD_DB_PORT` is set correctly

### Authentication Failed

- Double-check username and password
- Verify user has permission to connect
- Check if host-based authentication is configured

### Permission Denied

- Ensure database user has necessary permissions
- Grant SELECT permission for read-only access
- Check schema-level permissions

### .env File Not Found

- Use absolute path, not relative path
- Verify file exists and is readable
- Check file permissions

## Development

For developers who want to contribute or customize:

- See [DEVELOPMENT.md](./Documents/DEVELOPMENT.md) for development setup
- See [ARCHITECTURE.md](./Documents/ARCHITECTURE.md) for system design
- See [PUBLISHING.md](./Documents/PUBLISHING.md) for publishing guide

## Requirements

- Node.js 22.0.0 or higher
- Laravel project with `.env` file (for automatic configuration)
- Database: MySQL 5.7+, PostgreSQL 12+, MariaDB 10.3+, or SQLite 3+

## License

MIT License - see [LICENSE](LICENSE) file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

- 📖 [Documentation](./Documents/)
- 🐛 [Report Issues](https://github.com/kakehashi-inc/mcp-server-laravel-database/issues)
- 💬 [Discussions](https://github.com/kakehashi-inc/mcp-server-laravel-database/discussions)

## Related Projects

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP SDK](https://github.com/modelcontextprotocol/sdk)
- [Laravel](https://laravel.com/)

---

Made with ❤️ for Laravel developers
