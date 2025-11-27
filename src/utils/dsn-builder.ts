import { DatabaseConfig } from '../types/index.js';

export function buildDSN(config: DatabaseConfig): string {
    switch (config.type) {
        case 'mysql':
        case 'mariadb':
            return buildMySQLDSN(config);

        case 'pgsql':
            return buildPostgresDSN(config);

        case 'sqlite':
            return config.database;

        default:
            throw new Error(`Unsupported database type: ${config.type}`);
    }
}

function buildMySQLDSN(config: DatabaseConfig): string {
    const parts: string[] = [];

    if (config.username) {
        parts.push(`user=${config.username}`);
    }

    if (config.password) {
        parts.push(`password=${config.password}`);
    }

    if (config.host) {
        parts.push(`host=${config.host}`);
    }

    if (config.port) {
        parts.push(`port=${config.port}`);
    }

    if (config.database) {
        parts.push(`database=${config.database}`);
    }

    return parts.join(';');
}

function buildPostgresDSN(config: DatabaseConfig): string {
    const parts: string[] = [];

    if (config.host) {
        parts.push(`host=${config.host}`);
    }

    if (config.port) {
        parts.push(`port=${config.port}`);
    }

    if (config.database) {
        parts.push(`dbname=${config.database}`);
    }

    if (config.username) {
        parts.push(`user=${config.username}`);
    }

    if (config.password) {
        parts.push(`password=${config.password}`);
    }

    if (config.sslMode) {
        parts.push(`sslmode=${config.sslMode}`);
    }

    return parts.join(' ');
}
