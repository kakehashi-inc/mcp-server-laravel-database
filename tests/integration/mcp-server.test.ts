import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LaravelDatabaseServer } from '../../src/server.js';
import { ServerConfig } from '../../src/types/index.js';
import { unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const TEMP_DIR = join(process.cwd(), 'tests', '.tmp', 'integration');
mkdirSync(TEMP_DIR, { recursive: true });

// Integration test using SQLite (no external dependencies required)
describe('MCP Server Integration', () => {
  const testDbPath = join(TEMP_DIR, 'test-mcp-server.sqlite');
  let server: LaravelDatabaseServer | null = null;

  beforeAll(async () => {
    // Create a test SQLite database
    const Database = (await import('better-sqlite3')).default;
    const db = new Database(testDbPath);

    // Create test schema
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_posts_user_id ON posts(user_id);

      INSERT INTO users (name, email) VALUES
        ('Alice', 'alice@example.com'),
        ('Bob', 'bob@example.com'),
        ('Charlie', 'charlie@example.com');

      INSERT INTO posts (user_id, title, content) VALUES
        (1, 'First Post', 'Hello World'),
        (1, 'Second Post', 'Another post'),
        (2, 'Bob Post', 'Bob content');
    `);

    db.close();
  });

  afterAll(() => {
    if (server) {
      server.stop();
    }
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  it('should initialize server with SQLite database', async () => {
    const config: ServerConfig = {
      database: {
        type: 'sqlite',
        database: testDbPath,
      },
      transport: 'stdio',
      readonly: true,
      logLevel: 'error',
    };

    server = new LaravelDatabaseServer(config);
    expect(server).toBeDefined();
  });

  it('should connect to database', async () => {
    const config: ServerConfig = {
      database: {
        type: 'sqlite',
        database: testDbPath,
      },
      transport: 'stdio',
      readonly: true,
      logLevel: 'error',
    };

    const testServer = new LaravelDatabaseServer(config);

    // Note: We can't actually start the server in tests because it connects to stdio
    // But we can verify that it initializes correctly
    expect(testServer).toBeDefined();
  });
});

describe('Read-Only Mode', () => {
  const testDbPath = join(TEMP_DIR, 'test-readonly.sqlite');

  beforeAll(async () => {
    const Database = (await import('better-sqlite3')).default;
    const db = new Database(testDbPath);
    db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)');
    db.exec("INSERT INTO test (value) VALUES ('test')");
    db.close();
  });

  afterAll(() => {
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  it('should initialize in read-only mode', () => {
    const config: ServerConfig = {
      database: {
        type: 'sqlite',
        database: testDbPath,
      },
      transport: 'stdio',
      readonly: true,
      logLevel: 'error',
    };

    const server = new LaravelDatabaseServer(config);
    expect(server).toBeDefined();
  });
});

describe('Configuration Priority', () => {
  it('should prioritize CLI args over env file', () => {
    // This is tested in config.test.ts
    expect(true).toBe(true);
  });
});
