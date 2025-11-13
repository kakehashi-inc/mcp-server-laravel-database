import { describe, it, expect } from 'vitest';
import { detectSailPort, isSailEnvironment } from '../src/utils/sail-detector.js';
import { EnvConfig } from '../src/types/index.js';

describe('sail-detector', () => {
  describe('detectSailPort', () => {
    it('should return FORWARD_DB_PORT when set', () => {
      const config: EnvConfig = {
        DB_PORT: '3306',
        FORWARD_DB_PORT: '13306',
      };

      const port = detectSailPort(config);
      expect(port).toBe(13306);
    });

    it('should return DB_PORT when FORWARD_DB_PORT is not set', () => {
      const config: EnvConfig = {
        DB_PORT: '3306',
      };

      const port = detectSailPort(config);
      expect(port).toBe(3306);
    });

    it('should return undefined when no port is set', () => {
      const config: EnvConfig = {};

      const port = detectSailPort(config);
      expect(port).toBeUndefined();
    });

    it('should handle invalid port numbers', () => {
      const config: EnvConfig = {
        DB_PORT: 'invalid',
      };

      const port = detectSailPort(config);
      expect(port).toBeUndefined();
    });
  });

  describe('isSailEnvironment', () => {
    it('should return true when FORWARD_DB_PORT is set', () => {
      const config: EnvConfig = {
        FORWARD_DB_PORT: '13306',
      };

      expect(isSailEnvironment(config)).toBe(true);
    });

    it('should return false when FORWARD_DB_PORT is not set', () => {
      const config: EnvConfig = {
        DB_PORT: '3306',
      };

      expect(isSailEnvironment(config)).toBe(false);
    });
  });
});
