# Development Guide

## Prerequisites

- Node.js 22.0.0 or higher
- Yarn 4.0.0 or higher
- A Laravel project with database configuration (for testing)

## Setup Development Environment

### 1. Clone the Repository

```bash
git clone https://github.com/kakehashi-inc/mcp-server-laravel-database.git
cd mcp-server-laravel-database
```

### 2. Install Dependencies

```bash
yarn install
```

This will install all required dependencies including:
- MCP SDK
- Database drivers (MySQL, PostgreSQL, MariaDB, SQLite)
- Development tools (TypeScript, Vite, Vitest)

### 3. Configure Yarn

The project uses Yarn 4 with the following configuration (`.yarnrc.yml`):

```yaml
enableGlobalCache: true
nodeLinker: node-modules
nmMode: hardlinks-global
```

## Development Workflow

### Building the Project

Build the project using Vite:

```bash
yarn build
```

This will:
- Compile TypeScript to JavaScript
- Bundle the application
- Generate the executable in `dist/index.js`
- Add the shebang (`#!/usr/bin/env node`) for CLI execution

### Development Mode

Run the server in development mode with hot reload:

```bash
yarn dev
```

This uses `vite-node` to run TypeScript directly without building.

### Running Tests

Run the test suite:

```bash
yarn test
```

Run tests with coverage:

```bash
yarn test:coverage
```

### Testing with a Real Database

1. Create a test Laravel project or use an existing one
2. Configure the database in the `.env` file
3. Run the server with the Laravel `.env` file:

```bash
yarn dev -- --env /path/to/laravel/.env
```

## Project Structure

```
mcp-server-laravel-database/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server implementation
│   ├── config.ts             # Configuration management
│   ├── connectors/           # Database connectors
│   │   ├── base.ts           # Base connector interface
│   │   ├── mysql.ts          # MySQL connector
│   │   ├── postgres.ts       # PostgreSQL connector
│   │   ├── mariadb.ts        # MariaDB connector
│   │   └── sqlite.ts         # SQLite connector
│   ├── resources/            # MCP Resources
│   │   ├── schemas.ts        # Schema listing
│   │   ├── tables.ts         # Table operations
│   │   ├── indexes.ts        # Index operations
│   │   └── procedures.ts     # Procedure operations
│   ├── tools/                # MCP Tools
│   │   └── execute-sql.ts    # SQL execution tool
│   ├── utils/                # Utility modules
│   │   ├── env-parser.ts     # .env file parser
│   │   ├── logger.ts         # Logging utility
│   │   ├── sail-detector.ts  # Laravel Sail detection
│   │   ├── query-validator.ts # Read-only query validation
│   │   ├── pagination.ts     # Pagination utility
│   │   ├── ssl-config.ts     # SSL configuration
│   │   ├── ssh-tunnel.ts     # SSH tunnel support
│   │   └── dsn-builder.ts    # DSN builder
│   └── types/                # TypeScript type definitions
│       ├── database.ts       # Database types
│       ├── config.ts         # Configuration types
│       └── mcp.ts            # MCP types
├── tests/                    # Test files
├── examples/                 # Example configurations
└── Documents/                # Developer documentation
```

## Adding a New Database Connector

To add support for a new database type:

1. Create a new connector in `src/connectors/`:

```typescript
import { BaseConnector } from './base.js';
import { DatabaseConfig, QueryResult, ... } from '../types/index.js';

export class NewDBConnector extends BaseConnector {
  async connect(): Promise<void> {
    // Implementation
  }

  async disconnect(): Promise<void> {
    // Implementation
  }

  async executeQuery(sql: string): Promise<QueryResult> {
    // Implementation
  }

  // Implement other required methods...
}
```

2. Update `src/server.ts` to include the new connector:

```typescript
private createConnector(): BaseConnector {
  const { database } = this.config;

  switch (database.type) {
    // ... existing cases
    case 'newdb':
      return new NewDBConnector(database, this.config.readonly);
    // ...
  }
}
```

3. Add the database type to `src/types/database.ts`:

```typescript
export type DatabaseType = 'mysql' | 'pgsql' | 'mariadb' | 'sqlite' | 'newdb';
```

## Code Style

- Use TypeScript strict mode
- Follow ESM module format
- Use async/await for asynchronous operations
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

## Debugging

Enable debug logging:

```bash
yarn dev -- --env /path/to/.env --log-level debug
```

## Common Issues

### Module Resolution Errors

Make sure all imports use the `.js` extension:

```typescript
// Correct
import { BaseConnector } from './base.js';

// Incorrect
import { BaseConnector } from './base';
```

### Database Connection Errors

Check:
- Database credentials are correct
- Database server is running
- Port is not blocked by firewall
- SSL configuration is correct

### Build Errors

Clean the build and try again:

```bash
rm -rf dist
yarn build
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [MCP SDK GitHub](https://github.com/modelcontextprotocol/sdk)
- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
