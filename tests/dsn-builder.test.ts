import { describe, it, expect } from 'vitest';
import { buildDSN } from '../src/utils/dsn-builder.js';
import { DatabaseConfig } from '../src/types/index.js';

describe('dsn-builder', () => {
  describe('buildDSN', () => {
    it('should build MySQL DSN', () => {
      const config: DatabaseConfig = {
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        database: 'testdb',
        username: 'root',
        password: 'secret',
      };

      const dsn = buildDSN(config);
      expect(dsn).toContain('user=root');
      expect(dsn).toContain('password=secret');
      expect(dsn).toContain('host=localhost');
      expect(dsn).toContain('port=3306');
      expect(dsn).toContain('database=testdb');
    });

    it('should build MariaDB DSN', () => {
      const config: DatabaseConfig = {
        type: 'mariadb',
        host: '127.0.0.1',
        port: 3307,
        database: 'mydb',
        username: 'admin',
        password: 'pass123',
      };

      const dsn = buildDSN(config);
      expect(dsn).toContain('user=admin');
      expect(dsn).toContain('password=pass123');
      expect(dsn).toContain('host=127.0.0.1');
      expect(dsn).toContain('port=3307');
      expect(dsn).toContain('database=mydb');
    });

    it('should build PostgreSQL DSN', () => {
      const config: DatabaseConfig = {
        type: 'pgsql',
        host: 'localhost',
        port: 5432,
        database: 'pgdb',
        username: 'postgres',
        password: 'pgpass',
        sslMode: 'require',
      };

      const dsn = buildDSN(config);
      expect(dsn).toContain('host=localhost');
      expect(dsn).toContain('port=5432');
      expect(dsn).toContain('dbname=pgdb');
      expect(dsn).toContain('user=postgres');
      expect(dsn).toContain('password=pgpass');
      expect(dsn).toContain('sslmode=require');
    });

    it('should build SQLite DSN', () => {
      const config: DatabaseConfig = {
        type: 'sqlite',
        database: '/path/to/database.sqlite',
      };

      const dsn = buildDSN(config);
      expect(dsn).toBe('/path/to/database.sqlite');
    });

    it('should handle MySQL without password', () => {
      const config: DatabaseConfig = {
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        database: 'testdb',
        username: 'root',
      };

      const dsn = buildDSN(config);
      expect(dsn).toContain('user=root');
      expect(dsn).not.toContain('password=');
      expect(dsn).toContain('database=testdb');
    });

    it('should throw error for unsupported database type', () => {
      const config = {
        type: 'unsupported' as any,
        database: 'test',
      };

      expect(() => buildDSN(config)).toThrow('Unsupported database type');
    });
  });
});
