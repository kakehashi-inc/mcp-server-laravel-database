import { EnvConfig } from '../types/index.js';

export function detectSailPort(envConfig: EnvConfig): number | undefined {
  // Check if FORWARD_DB_PORT is set (Laravel Sail)
  if (envConfig.FORWARD_DB_PORT) {
    const port = parseInt(envConfig.FORWARD_DB_PORT, 10);
    if (!isNaN(port)) {
      return port;
    }
  }

  // Fall back to DB_PORT
  if (envConfig.DB_PORT) {
    const port = parseInt(envConfig.DB_PORT, 10);
    if (!isNaN(port)) {
      return port;
    }
  }

  return undefined;
}

export function isSailEnvironment(envConfig: EnvConfig): boolean {
  return !!envConfig.FORWARD_DB_PORT;
}
