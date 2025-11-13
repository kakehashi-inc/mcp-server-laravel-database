import { describe, it, expect } from 'vitest';
import { calculatePagination, applySqlPagination } from '../src/utils/pagination.js';

describe('pagination', () => {
  describe('calculatePagination', () => {
    it('should calculate pagination from page and perPage', () => {
      const result = calculatePagination({ page: 1, perPage: 10 });
      expect(result).toEqual({ limit: 10, offset: 0 });
    });

    it('should calculate pagination for page 2', () => {
      const result = calculatePagination({ page: 2, perPage: 20 });
      expect(result).toEqual({ limit: 20, offset: 20 });
    });

    it('should calculate pagination for page 5', () => {
      const result = calculatePagination({ page: 5, perPage: 10 });
      expect(result).toEqual({ limit: 10, offset: 40 });
    });

    it('should calculate pagination from offset and maxRows', () => {
      const result = calculatePagination({ offset: 10, maxRows: 20 });
      expect(result).toEqual({ limit: 20, offset: 10 });
    });

    it('should calculate pagination from maxRows only', () => {
      const result = calculatePagination({ maxRows: 50 });
      expect(result).toEqual({ limit: 50, offset: 0 });
    });

    it('should return null when no pagination params provided', () => {
      const result = calculatePagination({});
      expect(result).toBeNull();
    });

    it('should prioritize page/perPage over offset/maxRows', () => {
      const result = calculatePagination({
        page: 2,
        perPage: 10,
        offset: 5,
        maxRows: 20,
      });
      expect(result).toEqual({ limit: 10, offset: 10 });
    });

    it('should throw error for invalid page number', () => {
      expect(() => calculatePagination({ page: 0, perPage: 10 })).toThrow('Page number must be >= 1');
      expect(() => calculatePagination({ page: -1, perPage: 10 })).toThrow('Page number must be >= 1');
    });

    it('should throw error for invalid perPage', () => {
      expect(() => calculatePagination({ page: 1, perPage: 0 })).toThrow('Per page value must be >= 1');
      expect(() => calculatePagination({ page: 1, perPage: -5 })).toThrow('Per page value must be >= 1');
    });

    it('should throw error for invalid offset', () => {
      expect(() => calculatePagination({ offset: -1, maxRows: 10 })).toThrow('Offset must be >= 0');
    });

    it('should throw error for invalid maxRows', () => {
      expect(() => calculatePagination({ maxRows: 0 })).toThrow('Max rows must be >= 1');
      expect(() => calculatePagination({ maxRows: -10 })).toThrow('Max rows must be >= 1');
    });
  });

  describe('applySqlPagination', () => {
    it('should add LIMIT and OFFSET to SQL', () => {
      const sql = 'SELECT * FROM users';
      const result = applySqlPagination(sql, { limit: 10, offset: 0 });
      expect(result).toBe('SELECT * FROM users LIMIT 10 OFFSET 0');
    });

    it('should add LIMIT and OFFSET with non-zero offset', () => {
      const sql = 'SELECT * FROM products WHERE price > 100';
      const result = applySqlPagination(sql, { limit: 20, offset: 40 });
      expect(result).toBe('SELECT * FROM products WHERE price > 100 LIMIT 20 OFFSET 40');
    });

    it('should remove trailing semicolon', () => {
      const sql = 'SELECT * FROM users;';
      const result = applySqlPagination(sql, { limit: 10, offset: 0 });
      expect(result).toBe('SELECT * FROM users LIMIT 10 OFFSET 0');
    });

    it('should handle SQL with whitespace', () => {
      const sql = '  SELECT * FROM users  ';
      const result = applySqlPagination(sql, { limit: 10, offset: 0 });
      expect(result).toBe('SELECT * FROM users LIMIT 10 OFFSET 0');
    });

    it('should throw error if SQL already has LIMIT', () => {
      const sql = 'SELECT * FROM users LIMIT 5';
      expect(() => applySqlPagination(sql, { limit: 10, offset: 0 })).toThrow(
        'SQL query already contains LIMIT clause'
      );
    });

    it('should handle complex queries', () => {
      const sql = `
        SELECT u.id, u.name, COUNT(o.id) as order_count
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        WHERE u.active = 1
        GROUP BY u.id, u.name
        HAVING order_count > 0
        ORDER BY order_count DESC
      `;
      const result = applySqlPagination(sql, { limit: 25, offset: 50 });
      expect(result).toContain('LIMIT 25 OFFSET 50');
      expect(result).toContain('ORDER BY order_count DESC');
    });
  });
});
