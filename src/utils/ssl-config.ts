import { DatabaseType } from '../types/index.js';

export interface SSLOptions {
  rejectUnauthorized?: boolean;
  ca?: string;
  cert?: string;
  key?: string;
}

export type SSLMode = 'disable' | 'require' | 'verify-ca' | 'verify-full';

export function getDefaultSSLMode(dbType: DatabaseType): SSLMode {
  switch (dbType) {
    case 'pgsql':
      return 'require';
    case 'mysql':
    case 'mariadb':
      return 'disable';
    case 'sqlite':
      return 'disable';
    default:
      return 'disable';
  }
}

export function parseSSLMode(sslMode?: string, dbType?: DatabaseType): SSLOptions | boolean {
  if (!sslMode) {
    return dbType === 'pgsql' ? { rejectUnauthorized: false } : false;
  }

  const mode = sslMode.toLowerCase();

  switch (mode) {
    case 'disable':
    case 'false':
      return false;

    case 'require':
      return { rejectUnauthorized: false };

    case 'verify-ca':
    case 'verify-full':
      return { rejectUnauthorized: true };

    default:
      return false;
  }
}
