# Architecture Overview

## System Design

The MCP Server for Laravel Database follows a modular architecture with clear separation of concerns.

```
┌─────────────────────────────────────────────────────────┐
│                    MCP Client                            │
│              (Claude Desktop / Cursor)                   │
└────────────────────┬────────────────────────────────────┘
                     │ MCP Protocol (stdio/http/sse)
                     │
┌────────────────────▼────────────────────────────────────┐
│              MCP Server (server.ts)                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Request Handlers                       │   │
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

## Core Components

### 1. Entry Point (`index.ts`)

- Command-line argument parsing
- Configuration building
- Server initialization
- Signal handling (SIGINT, SIGTERM)
- Error handling

### 2. Configuration (`config.ts`)

**Responsibilities:**
- Parse command-line arguments using yargs
- Read and merge .env files
- Build unified configuration
- Detect Laravel Sail environment

**Configuration Priority:**
1. Command-line arguments (highest)
2. Environment variables
3. .env file values (lowest)

### 3. MCP Server (`server.ts`)

**Responsibilities:**
- Implement MCP protocol handlers
- Route requests to appropriate modules
- Manage database connections
- Handle SSH tunneling

**MCP Protocol Handlers:**
- `ListResources`: Returns available database resources
- `ReadResource`: Fetches specific resource data
- `ListTools`: Returns available tools
- `CallTool`: Executes tool operations

### 4. Database Connectors

#### Base Connector (`connectors/base.ts`)

Abstract base class defining the interface:

```typescript
abstract class BaseConnector {
  // Connection management
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  // Query execution
  abstract executeQuery(sql: string): Promise<QueryResult>;

  // Schema operations
  abstract getSchemas(): Promise<SchemaInfo[]>;
  abstract getTables(schema: string): Promise<TableInfo[]>;
  abstract getTableStructure(schema: string, table: string): Promise<ColumnInfo[]>;

  // Index operations
  abstract getIndexes(schema: string, table: string): Promise<IndexInfo[]>;

  // Procedure operations
  abstract getProcedures(schema: string): Promise<ProcedureInfo[]>;
  abstract getProcedureDetails(schema: string, proc: string): Promise<ProcedureInfo>;

  // Health check
  abstract ping(): Promise<boolean>;
}
```

#### Database-Specific Connectors

- **MySQL Connector**: Uses `mysql2` package
- **PostgreSQL Connector**: Uses `pg` package
- **MariaDB Connector**: Uses `mariadb` package
- **SQLite Connector**: Uses `better-sqlite3` package

Each connector implements database-specific SQL queries and connection handling.

### 5. Resources Module

Implements MCP Resources for database introspection:

| Resource | URI Pattern | Implementation |
|----------|-------------|----------------|
| Schemas | `db://schemas` | `schemas.ts` |
| Tables | `db://schemas/{schema}/tables` | `tables.ts` |
| Table Structure | `db://schemas/{schema}/tables/{table}` | `tables.ts` |
| Indexes | `db://schemas/{schema}/tables/{table}/indexes` | `indexes.ts` |
| Procedures | `db://schemas/{schema}/procedures` | `procedures.ts` |
| Procedure Details | `db://schemas/{schema}/procedures/{proc}` | `procedures.ts` |

### 6. Tools Module

Implements MCP Tools for database operations:

**execute_sql Tool:**
- Executes SQL queries
- Supports pagination (page/per_page or offset/max_rows)
- Enforces read-only mode
- Returns results in markdown table format

### 7. Utilities

#### env-parser.ts
- Parses Laravel .env files
- Extracts database configuration
- Handles quoted values

#### logger.ts
- Winston-based logging
- Masks sensitive information
- Configurable log levels

#### sail-detector.ts
- Detects Laravel Sail environment
- Uses FORWARD_DB_PORT when available

#### query-validator.ts
- Validates SQL in read-only mode
- Blocks write operations
- Allows SELECT, SHOW, DESCRIBE, EXPLAIN

#### pagination.ts
- Calculates pagination parameters
- Applies LIMIT/OFFSET to SQL
- Supports multiple pagination formats

#### ssh-tunnel.ts
- Creates SSH tunnels for remote databases
- Manages tunnel lifecycle
- Forwards database connections

#### ssl-config.ts
- Configures SSL for database connections
- Database-specific defaults
- Multiple SSL modes

## Data Flow

### Reading Resources

```
Client → ListResources Request
  → Server returns available resources

Client → ReadResource Request (db://schemas)
  → Server → schemas.ts
  → schemas.ts → connector.getSchemas()
  → connector → Database
  → Database returns data
  → connector formats data
  → Server formats as markdown
  → Client receives markdown content
```

### Executing SQL

```
Client → CallTool Request (execute_sql)
  → Server validates parameters
  → If readonly: validate query
  → Apply pagination if requested
  → execute-sql.ts → connector.executeQuery()
  → connector → Database
  → Database returns results
  → connector formats results
  → Server formats as markdown table
  → Client receives formatted results
```

## Security Architecture

### Read-Only Mode

When `--readonly` flag is set:

1. Query validation before execution
2. Blocks: INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE
3. Allows: SELECT, SHOW, DESCRIBE, EXPLAIN

For SQLite:
- Uses `readonly: true` connection option
- Database-level enforcement

### SSH Tunneling

For secure remote connections:

1. Establish SSH tunnel to remote host
2. Forward database port through tunnel
3. Connect to local tunnel endpoint
4. All database traffic encrypted via SSH

### Sensitive Data Protection

- Passwords masked in logs
- Connection strings sanitized
- Private keys handled securely
- No credentials in error messages

## Error Handling

### Connection Errors

- Retry logic for transient failures
- Graceful degradation
- Informative error messages

### Query Errors

- SQL syntax errors caught and reported
- Read-only violations blocked with clear messages
- Timeout handling

### Signal Handling

- SIGINT/SIGTERM for graceful shutdown
- Clean up connections
- Close SSH tunnels
- Flush logs

## Extensibility

### Adding New Database Types

1. Create connector implementing `BaseConnector`
2. Register in `server.ts` connector factory
3. Add database type to `DatabaseType` enum
4. Update documentation

### Adding New Resources

1. Create resource handler in `resources/`
2. Register URI pattern in `server.ts`
3. Implement data fetching and formatting
4. Update documentation

### Adding New Tools

1. Create tool implementation in `tools/`
2. Register in `ListTools` handler
3. Implement in `CallTool` handler
4. Define input schema
5. Update documentation

## Performance Considerations

### Connection Pooling

Currently uses single connection per server instance. Future enhancement: connection pooling for high-concurrency scenarios.

### Query Optimization

- Pagination limits result set size
- Efficient schema queries using information_schema
- Prepared statements where supported

### Memory Management

- Stream large result sets (future enhancement)
- Limit result set size via pagination
- Clean up resources on disconnect

## Testing Strategy

### Unit Tests

- Test individual components in isolation
- Mock database connections
- Test utility functions

### Integration Tests

- Use test containers for real databases
- Test end-to-end workflows
- Verify MCP protocol compliance

### Manual Testing

- Test with Claude Desktop
- Test with Cursor
- Test various Laravel configurations
