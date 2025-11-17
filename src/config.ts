import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import {
  ServerConfig,
  DatabaseConfig,
  DatabaseType,
  SSHConfig,
  CLIArguments,
  TransportMode,
  LogLevel,
} from './types/index.js';
import { parseEnvFile, getEnvConfig } from './utils/env-parser.js';
import { detectSailPort } from './utils/sail-detector.js';
export function parseArguments(): CLIArguments {
  const argv = yargs(hideBin(process.argv))
    .option('env', {
      type: 'string',
      description: '.env file path',
    })
    .option('db-connection', {
      type: 'string',
      description: 'Database connection type (mysql/pgsql/mariadb/sqlite)',
      choices: ['mysql', 'pgsql', 'mariadb', 'sqlite'],
    })
    .option('db-host', {
      type: 'string',
      description: 'Database host',
    })
    .option('db-port', {
      type: 'number',
      description: 'Database port',
    })
    .option('db-database', {
      type: 'string',
      description: 'Database name',
    })
    .option('db-username', {
      type: 'string',
      description: 'Database username',
    })
    .option('db-password', {
      type: 'string',
      description: 'Database password',
    })
    .option('transport', {
      type: 'string',
      description: 'Transport mode',
      choices: ['stdio', 'http'],
      default: 'stdio',
    })
    .option('port', {
      type: 'number',
      description: 'HTTP server port',
      default: 8080,
    })
    .option('host', {
      type: 'string',
      description: 'HTTP server host',
      default: 'localhost',
    })
    .option('readonly', {
      type: 'boolean',
      description: 'Read-only mode',
      default: false,
    })
    .option('max-rows', {
      type: 'number',
      description: 'Maximum number of rows to return',
    })
    .option('ssl-mode', {
      type: 'string',
      description: 'SSL mode (disable/require/verify-ca/verify-full)',
    })
    .option('ssh-host', {
      type: 'string',
      description: 'SSH tunnel host',
    })
    .option('ssh-port', {
      type: 'number',
      description: 'SSH tunnel port',
      default: 22,
    })
    .option('ssh-user', {
      type: 'string',
      description: 'SSH username',
    })
    .option('ssh-password', {
      type: 'string',
      description: 'SSH password',
    })
    .option('ssh-key', {
      type: 'string',
      description: 'SSH private key path',
    })
    .option('ssh-passphrase', {
      type: 'string',
      description: 'SSH key passphrase',
    })
    .option('id', {
      type: 'string',
      description: 'Instance identifier',
    })
    .option('log-level', {
      type: 'string',
      description: 'Log level',
      choices: ['error', 'warn', 'info', 'debug'],
      default: 'info',
    })
    .help()
    .parseSync();

  return argv as CLIArguments;
}

export function buildConfig(args: CLIArguments): ServerConfig {
  const systemEnvConfig = getEnvConfig();
  const fileEnvConfig = args.env ? parseEnvFile(args.env) : undefined;
  const mergedEnvConfig = {
    ...systemEnvConfig,
    ...(fileEnvConfig ?? {}),
  };

  const readEnv = <K extends keyof typeof systemEnvConfig>(key: K): string | undefined => {
    return fileEnvConfig?.[key] ?? systemEnvConfig[key];
  };

  // Priority: CLI args > .env file > environment variables
  const dbType = (args['db-connection'] ||
    readEnv('DB_CONNECTION') ||
    'mysql') as DatabaseType;

  const dbHost = args['db-host'] || readEnv('DB_HOST') || 'localhost';

  // Detect Laravel Sail port
  const sailPort = detectSailPort(mergedEnvConfig);
  const dbPort = args['db-port'] || sailPort || getDefaultPort(dbType);

  const dbDatabase = args['db-database'] || readEnv('DB_DATABASE');
  if (!dbDatabase) {
    throw new Error('Database name is required (--db-database or DB_DATABASE)');
  }

  const dbUsername = args['db-username'] || readEnv('DB_USERNAME');
  const dbPassword = args['db-password'] || readEnv('DB_PASSWORD');

  // Database configuration
  const database: DatabaseConfig = {
    type: dbType,
    host: dbHost,
    port: dbPort,
    database: dbDatabase,
    username: dbUsername,
    password: dbPassword,
    sslMode: args['ssl-mode'],
  };

  // SSH configuration
  let ssh: SSHConfig | undefined;
  if (args['ssh-host'] && args['ssh-user']) {
    ssh = {
      host: args['ssh-host'],
      port: args['ssh-port'] || 22,
      username: args['ssh-user'],
      password: args['ssh-password'],
      privateKey: args['ssh-key'],
      passphrase: args['ssh-passphrase'],
    };
  }

  // Server configuration
  const config: ServerConfig = {
    database,
    ssh,
    transport: (args.transport || 'stdio') as TransportMode,
    port: args.port,
    host: args.host,
    readonly: args.readonly || false,
    maxRows: args['max-rows'],
    id: args.id,
    logLevel: (args['log-level'] || 'info') as LogLevel,
  };

  return config;
}

function getDefaultPort(dbType: DatabaseType): number {
  switch (dbType) {
    case 'mysql':
    case 'mariadb':
      return 3306;
    case 'pgsql':
      return 5432;
    case 'sqlite':
      return 0; // Not applicable
    default:
      return 0;
  }
}
