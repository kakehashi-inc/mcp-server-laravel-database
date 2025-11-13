import { describe, it, expect } from 'vitest';
import { parseArguments, buildConfig } from '../src/config.js';

describe('config', () => {
  describe('buildConfig', () => {
    it('should build config with command-line arguments', () => {
      const args = {
        'db-connection': 'mysql' as const,
        'db-host': 'localhost',
        'db-port': 3306,
        'db-database': 'testdb',
        'db-username': 'root',
        'db-password': 'secret',
        readonly: true,
        'max-rows': 100,
        'log-level': 'info' as const,
      };

      const config = buildConfig(args);

      expect(config.database.type).toBe('mysql');
      expect(config.database.host).toBe('localhost');
      expect(config.database.port).toBe(3306);
      expect(config.database.database).toBe('testdb');
      expect(config.database.username).toBe('root');
      expect(config.database.password).toBe('secret');
      expect(config.readonly).toBe(true);
      expect(config.maxRows).toBe(100);
      expect(config.logLevel).toBe('info');
    });

    it('should use default values when not specified', () => {
      const args = {
        'db-database': 'testdb',
      };

      const config = buildConfig(args);

      expect(config.database.type).toBe('mysql');
      expect(config.database.host).toBe('localhost');
      expect(config.transport).toBe('stdio');
      expect(config.readonly).toBe(false);
      expect(config.logLevel).toBe('info');
    });

    it('should configure SSH tunnel', () => {
      const args = {
        'db-database': 'testdb',
        'ssh-host': 'remote.example.com',
        'ssh-user': 'deploy',
        'ssh-port': 22,
        'ssh-key': '/path/to/key',
      };

      const config = buildConfig(args);

      expect(config.ssh).toBeDefined();
      expect(config.ssh?.host).toBe('remote.example.com');
      expect(config.ssh?.username).toBe('deploy');
      expect(config.ssh?.port).toBe(22);
      expect(config.ssh?.privateKey).toBe('/path/to/key');
    });

    it('should not configure SSH when host or user is missing', () => {
      const args1 = {
        'db-database': 'testdb',
        'ssh-host': 'remote.example.com',
      };

      const config1 = buildConfig(args1);
      expect(config1.ssh).toBeUndefined();

      const args2 = {
        'db-database': 'testdb',
        'ssh-user': 'deploy',
      };

      const config2 = buildConfig(args2);
      expect(config2.ssh).toBeUndefined();
    });

    it('should throw error when database name is missing', () => {
      const args = {
        'db-host': 'localhost',
      };

      expect(() => buildConfig(args)).toThrow('Database name is required');
    });

    it('should set default ports based on database type', () => {
      const mysqlArgs = {
        'db-connection': 'mysql' as const,
        'db-database': 'testdb',
      };
      const mysqlConfig = buildConfig(mysqlArgs);
      expect(mysqlConfig.database.port).toBe(3306);

      const pgsqlArgs = {
        'db-connection': 'pgsql' as const,
        'db-database': 'testdb',
      };
      const pgsqlConfig = buildConfig(pgsqlArgs);
      expect(pgsqlConfig.database.port).toBe(5432);
    });

    it('should configure transport options', () => {
      const args = {
        'db-database': 'testdb',
        transport: 'http' as const,
        port: 9000,
        host: '0.0.0.0',
      };

      const config = buildConfig(args);

      expect(config.transport).toBe('http');
      expect(config.port).toBe(9000);
      expect(config.host).toBe('0.0.0.0');
    });
  });
});
