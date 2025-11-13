# AI Agent Operational Guidelines

This document provides strategic guidelines for AI coding agents working on the MCP Server Laravel Database project.

## Core Operating Principles

### 1. Context Gathering Strategy

**Goal**: Get enough context fast. Parallelize discovery and stop as soon as you can act.

**Method**:
- Start broad, then fan out to focused subqueries
- Launch varied queries in parallel; read top hits per query
- Deduplicate paths and cache results; don't repeat queries
- Avoid over-searching for context—if needed, run targeted searches in ONE parallel batch

**Early Stop Criteria**:
- ✅ You can name exact content to change
- ✅ Top hits converge (~70%) on one area/path

**Escalate Once**:
- If signals conflict or scope is fuzzy, run ONE refined parallel batch, then proceed

**Depth Management**:
- Trace only symbols you'll modify or whose contracts you rely on
- Avoid transitive expansion unless necessary

**Loop Pattern**:
```
Batch search → minimal plan → complete task
└─> Search again only if validation fails or new unknowns appear
```

Prefer acting over more searching.

### 2. Self-Reflection Process

Before implementing any solution:

1. **Create Mental Rubric**: Think deeply about what makes a world-class solution (5-7 categories)
2. **Iterate Internally**: Use the rubric to evaluate and refine your approach
3. **Quality Bar**: Don't proceed unless hitting top marks across all rubric categories

### 3. Persistence Mode

**Critical**: You are an agent—keep going until the user's query is completely resolved.

- ⚠️ Only terminate your turn when you are SURE the problem is solved
- ⚠️ Never stop or hand back when you encounter uncertainty
- ⚠️ Research or deduce the most reasonable approach and continue
- ⚠️ Don't ask humans to confirm/clarify assumptions—decide, proceed, document

**Decision Framework**:
1. Make the most reasonable assumption
2. Proceed with implementation
3. Document the assumption for user reference AFTER completion
4. Adjust later if needed

## Code Editing Rules

### Guiding Principles

1. **Readability**
   - Avoid environment-dependent characters, emojis, or non-standard strings
   - Write clear, self-documenting code
   - Use meaningful variable and function names

2. **Maintainability**
   - Follow proper directory structure (see project layout in README)
   - Maintain consistent naming conventions
   - Organize shared logic in `src/utils/`
   - Keep connectors isolated in `src/connectors/`

3. **Consistency**
   - Use established patterns for similar operations
   - Follow TypeScript conventions throughout
   - Match existing code style and formatting

4. **Type Safety**
   - Define types in `src/types/` before implementation
   - Avoid `any` types—use proper interfaces
   - Leverage TypeScript's strict mode

## Project-Specific Agent Tasks

### Adding New Database Support

**Context to Gather**:
- Read `src/connectors/base.ts` for interface
- Check one existing connector (e.g., `src/connectors/mysql.ts`) for pattern
- Review `src/server.ts:createConnector()` for registration

**Implementation Steps**:
1. Create new connector extending `BaseConnector`
2. Implement all abstract methods
3. Add database-specific identifier escaping
4. Register in `server.ts` switch statement
5. Update CLI choices in `config.ts`
6. Add unit tests in `tests/`

### Implementing New MCP Resources

**Context to Gather**:
- Read `src/types/mcp.ts` for URI template pattern
- Check `src/resources/` for existing resource handlers
- Review `src/server.ts` ReadResourceRequestSchema handler

**Implementation Steps**:
1. Add URI template to `src/types/mcp.ts:RESOURCE_TEMPLATES`
2. Create handler function in `src/resources/`
3. Add regex matching in `server.ts`
4. Implement connector method if needed
5. Add integration test

### Debugging Connection Issues

**Fast Context Path**:
```typescript
// Check in this order:
1. src/config.ts - Configuration merging logic
2. src/utils/sail-detector.ts - Laravel Sail port detection
3. src/utils/ssh-tunnel.ts - SSH tunnel setup
4. src/connectors/[database].ts - Connection implementation
5. src/index.ts - Error handling
```

**Common Patterns**:
- Sail detection: Check `FORWARD_DB_PORT` before `DB_PORT`
- SSH tunneling: Updates host to localhost after tunnel creation
- SSL config: Database-specific defaults (PostgreSQL defaults to `require`)

### Adding Query Features

**Context to Gather**:
- `src/utils/query-validator.ts` - Read-only validation patterns
- `src/utils/pagination.ts` - Pagination logic
- `src/tools/execute-sql.ts` - Query execution flow

**Safe Extension Points**:
- Query validation: Add patterns to `isReadOnlyQuery()` allowedPatterns
- Pagination: Extend `calculatePagination()` options
- Result formatting: Modify `executeSql()` output generation

## Testing Strategy

### Unit Test Approach
- **Fast**: Use Vitest with in-memory data
- **Isolated**: Test utilities independently
- **Pattern**: `describe` -> `it` blocks with clear assertions
- **Location**: `tests/*.test.ts`

### Integration Test Approach
- **Default DB**: Use SQLite for fast, dependency-free tests
- **Setup**: Create schema in `beforeAll()`, cleanup in `afterAll()`
- **Testcontainers**: Only for database-specific features
- **Location**: `tests/integration/*.test.ts`

**Example Test Pattern**:
```typescript
describe('Feature', () => {
  beforeAll(async () => {
    // Setup SQLite with test schema
  });

  afterAll(() => {
    // Cleanup
  });

  it('should handle specific case', async () => {
    // Test with assertion
  });
});
```

## Build and Deployment Context

### Build Configuration
- **Tool**: Vite (not tsc directly)
- **Target**: Node.js 22+ ESM
- **Entry**: `src/index.ts` → `dist/index.js`
- **Externals**: All dependencies external (not bundled)
- **Banner**: Shebang added for CLI execution

### Key Build Files
- `vite.config.ts` - Build configuration
- `package.json` - Scripts and dependencies
- `tsconfig.json` - TypeScript compiler options

### Publishing Checklist
1. Run `yarn build` to verify compilation
2. Run `yarn test` to ensure all tests pass
3. Update version in `package.json`
4. Run `yarn prepublishOnly` (runs build automatically)
5. See `Documents/PUBLISHING.md` for npm publish steps

## Quick Reference: File Purposes

| File | Purpose | When to Modify |
|------|---------|----------------|
| `src/server.ts` | MCP protocol handlers | Adding new resources/tools |
| `src/connectors/base.ts` | Connector interface | Adding new DB operations |
| `src/connectors/*.ts` | DB implementations | DB-specific logic |
| `src/config.ts` | Configuration parsing | Adding CLI options |
| `src/utils/*.ts` | Shared utilities | Cross-cutting concerns |
| `src/types/*.ts` | TypeScript types | New data structures |
| `src/resources/*.ts` | Resource handlers | New MCP resources |
| `src/tools/*.ts` | Tool implementations | New MCP tools |

## Common Pitfalls (Auto-Fix Mode)

When you encounter these patterns, fix them immediately:

❌ **Don't**: Call connector methods without null check
```typescript
const result = await this.connector.executeQuery(sql); // WRONG
```

✅ **Do**: Always check connection first
```typescript
if (!this.connector) {
  throw new Error('Database connection not established');
}
const result = await this.connector.executeQuery(sql);
```

❌ **Don't**: Use string concatenation for SQL
```typescript
const sql = `SELECT * FROM ${tableName}`; // SQL injection risk
```

✅ **Do**: Use escapeIdentifier or parameters
```typescript
const sql = `SELECT * FROM ${this.escapeIdentifier(tableName)}`;
```

❌ **Don't**: Forget to decode URI components
```typescript
const schemaName = match[1]; // May contain %20, etc.
```

✅ **Do**: Always decode
```typescript
const schemaName = decodeURIComponent(match[1]);
```

❌ **Don't**: Ignore Laravel Sail detection
```typescript
const port = config.DB_PORT; // Misses FORWARD_DB_PORT
```

✅ **Do**: Use Sail detector
```typescript
const port = detectSailPort(envConfig); // Checks FORWARD_DB_PORT first
```

## Summary: Agent Success Checklist

Before completing any task, verify:

- [ ] Gathered sufficient context using parallel searches
- [ ] Made reasonable assumptions and documented them
- [ ] Followed established code patterns
- [ ] Added/updated tests as needed
- [ ] Verified build with `yarn build`
- [ ] Ran tests with `yarn test`
- [ ] Checked for common pitfalls
- [ ] Updated relevant documentation
- [ ] Completed the full task without leaving TODOs

**Remember**: Act decisively, document clearly, iterate rapidly. The goal is complete, working solutions—not perfect plans.
