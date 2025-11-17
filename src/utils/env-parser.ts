import { readFileSync } from 'fs';
import { EnvConfig } from '../types/index.js';

export function parseEnvFile(filePath: string): EnvConfig {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const config: EnvConfig = {};

    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Parse key=value
      const match = trimmed.match(/^([A-Z_]+)=(.*)$/);
      if (!match) {
        continue;
      }

      const [, key, rawValue] = match;

      // Remove quotes if present
      let value = rawValue.trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Only parse DB-related variables
      if (key === 'DB_CONNECTION' ||
          key === 'DB_HOST' ||
          key === 'DB_PORT' ||
          key === 'DB_DATABASE' ||
          key === 'DB_USERNAME' ||
          key === 'DB_PASSWORD' ||
          key === 'FORWARD_DB_PORT') {
        config[key as keyof EnvConfig] = value;
      }
    }

    return config;
  } catch (error) {
    throw new Error(`Failed to parse .env file at ${filePath}: ${error}`);
  }
}

export function getEnvConfig(): EnvConfig {
  return {
    DB_CONNECTION: process.env.DB_CONNECTION,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_DATABASE: process.env.DB_DATABASE,
    DB_USERNAME: process.env.DB_USERNAME,
    DB_PASSWORD: process.env.DB_PASSWORD,
  };
}
