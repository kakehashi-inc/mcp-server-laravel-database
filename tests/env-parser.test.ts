import { describe, it, expect } from 'vitest';
import { parseEnvFile, getEnvConfig } from '../src/utils/env-parser.js';
import { mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const TEMP_DIR = join(process.cwd(), 'tests', '.tmp', 'env-parser');
mkdirSync(TEMP_DIR, { recursive: true });

describe('env-parser', () => {
  describe('parseEnvFile', () => {
    it('should parse basic .env file', () => {
      const testFile = join(TEMP_DIR, `test-${Date.now()}.env`);
      const envContent = `
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=testdb
DB_USERNAME=root
DB_PASSWORD=secret
`;
      writeFileSync(testFile, envContent);

      const config = parseEnvFile(testFile);

      expect(config.DB_CONNECTION).toBe('mysql');
      expect(config.DB_HOST).toBe('localhost');
      expect(config.DB_PORT).toBe('3306');
      expect(config.DB_DATABASE).toBe('testdb');
      expect(config.DB_USERNAME).toBe('root');
      expect(config.DB_PASSWORD).toBe('secret');

      unlinkSync(testFile);
    });

    it('should handle quoted values', () => {
      const testFile = join(TEMP_DIR, `test-${Date.now()}.env`);
      const envContent = `
DB_CONNECTION="mysql"
DB_HOST='localhost'
DB_PASSWORD="secret with spaces"
`;
      writeFileSync(testFile, envContent);

      const config = parseEnvFile(testFile);

      expect(config.DB_CONNECTION).toBe('mysql');
      expect(config.DB_HOST).toBe('localhost');
      expect(config.DB_PASSWORD).toBe('secret with spaces');

      unlinkSync(testFile);
    });

    it('should skip comments and empty lines', () => {
      const testFile = join(TEMP_DIR, `test-${Date.now()}.env`);
      const envContent = `
# This is a comment
DB_CONNECTION=mysql

# Another comment
DB_HOST=localhost
`;
      writeFileSync(testFile, envContent);

      const config = parseEnvFile(testFile);

      expect(config.DB_CONNECTION).toBe('mysql');
      expect(config.DB_HOST).toBe('localhost');

      unlinkSync(testFile);
    });

    it('should only parse DB-related variables', () => {
      const testFile = join(TEMP_DIR, `test-${Date.now()}.env`);
      const envContent = `
APP_NAME=Laravel
DB_CONNECTION=mysql
APP_ENV=local
DB_HOST=localhost
`;
      writeFileSync(testFile, envContent);

      const config = parseEnvFile(testFile);

      expect(config.DB_CONNECTION).toBe('mysql');
      expect(config.DB_HOST).toBe('localhost');
      expect(config).not.toHaveProperty('APP_NAME');
      expect(config).not.toHaveProperty('APP_ENV');

      unlinkSync(testFile);
    });

    it('should handle FORWARD_DB_PORT for Laravel Sail', () => {
      const testFile = join(TEMP_DIR, `test-${Date.now()}.env`);
      const envContent = `
DB_PORT=3306
FORWARD_DB_PORT=13306
`;
      writeFileSync(testFile, envContent);

      const config = parseEnvFile(testFile);

      expect(config.DB_PORT).toBe('3306');
      expect(config.FORWARD_DB_PORT).toBe('13306');

      unlinkSync(testFile);
    });

    it('should throw error for non-existent file', () => {
      expect(() => {
        parseEnvFile('/non/existent/file.env');
      }).toThrow();
    });
  });

  describe('getEnvConfig', () => {
    it('should return environment variables', () => {
      const originalEnv = { ...process.env };

      process.env.DB_CONNECTION = 'postgres';
      process.env.DB_HOST = '127.0.0.1';

      const config = getEnvConfig();

      expect(config.DB_CONNECTION).toBe('postgres');
      expect(config.DB_HOST).toBe('127.0.0.1');

      process.env = originalEnv;
    });
  });
});
