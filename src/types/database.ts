export type DatabaseType = 'mysql' | 'pgsql' | 'mariadb' | 'sqlite';

export interface DatabaseConfig {
    type: DatabaseType;
    host?: string;
    port?: number;
    database: string;
    username?: string;
    password?: string;
    sslMode?: string;
}

export interface SSHConfig {
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: string;
    passphrase?: string;
}

export interface QueryResult {
    rows: any[];
    fields?: FieldInfo[];
    rowCount?: number;
}

export interface FieldInfo {
    name: string;
    type: string;
    nullable?: boolean;
}

export interface SchemaInfo {
    name: string;
}

export interface TableInfo {
    name: string;
    type?: string;
    comment?: string;
}

export interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    default?: string;
    comment?: string;
    key?: string;
    extra?: string;
}

export interface IndexInfo {
    name: string;
    columns: string[];
    unique: boolean;
    type?: string;
}

export interface ProcedureInfo {
    name: string;
    type: string;
    definition?: string;
}
