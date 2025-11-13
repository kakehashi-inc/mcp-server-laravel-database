import { describe, it, expect } from 'vitest';
import { getDefaultSSLMode, parseSSLMode } from '../src/utils/ssl-config.js';

describe('ssl-config', () => {
  describe('getDefaultSSLMode', () => {
    it('should return require for PostgreSQL', () => {
      expect(getDefaultSSLMode('pgsql')).toBe('require');
    });

    it('should return disable for MySQL', () => {
      expect(getDefaultSSLMode('mysql')).toBe('disable');
    });

    it('should return disable for MariaDB', () => {
      expect(getDefaultSSLMode('mariadb')).toBe('disable');
    });

    it('should return disable for SQLite', () => {
      expect(getDefaultSSLMode('sqlite')).toBe('disable');
    });
  });

  describe('parseSSLMode', () => {
    it('should return false for disable', () => {
      expect(parseSSLMode('disable')).toBe(false);
      expect(parseSSLMode('false')).toBe(false);
    });

    it('should return rejectUnauthorized: false for require', () => {
      const result = parseSSLMode('require');
      expect(result).toEqual({ rejectUnauthorized: false });
    });

    it('should return rejectUnauthorized: true for verify-ca', () => {
      const result = parseSSLMode('verify-ca');
      expect(result).toEqual({ rejectUnauthorized: true });
    });

    it('should return rejectUnauthorized: true for verify-full', () => {
      const result = parseSSLMode('verify-full');
      expect(result).toEqual({ rejectUnauthorized: true });
    });

    it('should handle undefined sslMode for PostgreSQL', () => {
      const result = parseSSLMode(undefined, 'pgsql');
      expect(result).toEqual({ rejectUnauthorized: false });
    });

    it('should handle undefined sslMode for MySQL', () => {
      const result = parseSSLMode(undefined, 'mysql');
      expect(result).toBe(false);
    });

    it('should return false for unknown mode', () => {
      expect(parseSSLMode('unknown')).toBe(false);
    });
  });
});
