import { describe, it, expect } from 'vitest';
import { isReadOnlyQuery, validateReadOnlyQuery } from '../src/utils/query-validator.js';

describe('query-validator', () => {
  describe('isReadOnlyQuery', () => {
    it('should allow SELECT queries', () => {
      expect(isReadOnlyQuery('SELECT * FROM users')).toBe(true);
      expect(isReadOnlyQuery('select id, name from products')).toBe(true);
      expect(isReadOnlyQuery('  SELECT COUNT(*) FROM orders  ')).toBe(true);
    });

    it('should allow SHOW queries', () => {
      expect(isReadOnlyQuery('SHOW TABLES')).toBe(true);
      expect(isReadOnlyQuery('SHOW DATABASES')).toBe(true);
      expect(isReadOnlyQuery('show columns from users')).toBe(true);
    });

    it('should allow DESCRIBE queries', () => {
      expect(isReadOnlyQuery('DESCRIBE users')).toBe(true);
      expect(isReadOnlyQuery('DESC products')).toBe(true);
    });

    it('should allow EXPLAIN queries', () => {
      expect(isReadOnlyQuery('EXPLAIN SELECT * FROM users')).toBe(true);
      expect(isReadOnlyQuery('explain select count(*) from orders')).toBe(true);
    });

    it('should allow CTE with SELECT', () => {
      expect(isReadOnlyQuery('WITH cte AS (SELECT * FROM users) SELECT * FROM cte')).toBe(true);
    });

    it('should block INSERT queries', () => {
      expect(isReadOnlyQuery('INSERT INTO users (name) VALUES ("test")')).toBe(false);
      expect(isReadOnlyQuery('insert into products values (1, "test")')).toBe(false);
    });

    it('should block UPDATE queries', () => {
      expect(isReadOnlyQuery('UPDATE users SET name = "test"')).toBe(false);
      expect(isReadOnlyQuery('update products set price = 100')).toBe(false);
    });

    it('should block DELETE queries', () => {
      expect(isReadOnlyQuery('DELETE FROM users')).toBe(false);
      expect(isReadOnlyQuery('delete from orders where id = 1')).toBe(false);
    });

    it('should block DROP queries', () => {
      expect(isReadOnlyQuery('DROP TABLE users')).toBe(false);
      expect(isReadOnlyQuery('drop database testdb')).toBe(false);
    });

    it('should block CREATE queries', () => {
      expect(isReadOnlyQuery('CREATE TABLE users (id INT)')).toBe(false);
      expect(isReadOnlyQuery('create index idx_name on users(name)')).toBe(false);
    });

    it('should block ALTER queries', () => {
      expect(isReadOnlyQuery('ALTER TABLE users ADD COLUMN email VARCHAR(255)')).toBe(false);
      expect(isReadOnlyQuery('alter table products drop column price')).toBe(false);
    });

    it('should block TRUNCATE queries', () => {
      expect(isReadOnlyQuery('TRUNCATE TABLE users')).toBe(false);
      expect(isReadOnlyQuery('truncate orders')).toBe(false);
    });

    it('should block REPLACE queries', () => {
      expect(isReadOnlyQuery('REPLACE INTO users VALUES (1, "test")')).toBe(false);
    });

    it('should block MERGE queries', () => {
      expect(isReadOnlyQuery('MERGE INTO users USING source ON condition')).toBe(false);
    });

    it('should block GRANT queries', () => {
      expect(isReadOnlyQuery('GRANT SELECT ON database.* TO user')).toBe(false);
    });

    it('should block REVOKE queries', () => {
      expect(isReadOnlyQuery('REVOKE SELECT ON database.* FROM user')).toBe(false);
    });

    it('should block nested write operations in SELECT', () => {
      expect(isReadOnlyQuery('SELECT * FROM users WHERE id IN (DELETE FROM temp)')).toBe(false);
    });
  });

  describe('validateReadOnlyQuery', () => {
    it('should not throw for valid read-only queries', () => {
      expect(() => validateReadOnlyQuery('SELECT * FROM users')).not.toThrow();
      expect(() => validateReadOnlyQuery('SHOW TABLES')).not.toThrow();
    });

    it('should throw for write queries', () => {
      expect(() => validateReadOnlyQuery('INSERT INTO users VALUES (1)')).toThrow('Write operations are not allowed');
      expect(() => validateReadOnlyQuery('UPDATE users SET name = "test"')).toThrow('Write operations are not allowed');
      expect(() => validateReadOnlyQuery('DELETE FROM users')).toThrow('Write operations are not allowed');
    });
  });
});
