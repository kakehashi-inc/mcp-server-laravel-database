import { DatabaseConfig, SSHConfig } from './database.js';

export type TransportMode = 'stdio' | 'http';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface ServerConfig {
  // Database configuration
  database: DatabaseConfig;

  // SSH tunnel configuration
  ssh?: SSHConfig;

  // Transport configuration
  transport: TransportMode;
  port?: number;
  host?: string;

  // Security configuration
  readonly: boolean;
  maxRows?: number;

  // Instance configuration
  id?: string;
  logLevel: LogLevel;
}

export interface CLIArguments {
  // .env file path
  env?: string;

  // Database connection parameters
  'db-connection'?: string;
  'db-host'?: string;
  'db-port'?: number;
  'db-database'?: string;
  'db-username'?: string;
  'db-password'?: string;

  // Transport parameters
  transport?: TransportMode;
  port?: number;
  host?: string;

  // Security parameters
  readonly?: boolean;
  'max-rows'?: number;
  'ssl-mode'?: string;

  // SSH tunnel parameters
  'ssh-host'?: string;
  'ssh-port'?: number;
  'ssh-user'?: string;
  'ssh-password'?: string;
  'ssh-key'?: string;
  'ssh-passphrase'?: string;

  // Instance parameters
  id?: string;
  'log-level'?: LogLevel;
}

export interface EnvConfig {
  DB_CONNECTION?: string;
  DB_HOST?: string;
  DB_PORT?: string;
  DB_DATABASE?: string;
  DB_USERNAME?: string;
  DB_PASSWORD?: string;
  FORWARD_DB_PORT?: string;
}
