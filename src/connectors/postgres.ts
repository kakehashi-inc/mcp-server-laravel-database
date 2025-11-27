import pg from 'pg';
import { BaseConnector } from './base.js';
import {
    DatabaseConfig,
    QueryResult,
    SchemaInfo,
    TableInfo,
    ColumnInfo,
    IndexInfo,
    ProcedureInfo,
} from '../types/index.js';

const { Client } = pg;

export class PostgresConnector extends BaseConnector {
    private client: pg.Client | null = null;

    async connect(): Promise<void> {
        const sslConfig = this.config.sslMode ? { rejectUnauthorized: this.config.sslMode === 'verify-full' } : false;

        this.client = new Client({
            host: this.config.host,
            port: this.config.port,
            user: this.config.username,
            password: this.config.password,
            database: this.config.database,
            ssl: sslConfig,
        });

        await this.client.connect();
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.end();
            this.client = null;
        }
    }

    async executeQuery(sql: string): Promise<QueryResult> {
        if (!this.client) {
            throw new Error('Not connected to database');
        }

        const result = await this.client.query(sql);

        return {
            rows: result.rows,
            fields: result.fields?.map(f => ({
                name: f.name,
                type: f.dataTypeID?.toString() || 'unknown',
            })),
            rowCount: result.rowCount || 0,
        };
    }

    async getSchemas(): Promise<SchemaInfo[]> {
        const sql = `
      SELECT schema_name as name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schema_name
    `;

        const result = await this.executeQuery(sql);
        return result.rows.map((row: any) => ({
            name: row.name,
        }));
    }

    async getTables(schemaName: string): Promise<TableInfo[]> {
        const sql = `
      SELECT
        table_name as name,
        table_type as type,
        obj_description((quote_ident(table_schema) || '.' || quote_ident(table_name))::regclass) as comment
      FROM information_schema.tables
      WHERE table_schema = $1
      ORDER BY table_name
    `;

        const result = await this.executeQuery(this.formatQuery(sql, [schemaName]));
        return result.rows.map((row: any) => ({
            name: row.name,
            type: row.type,
            comment: row.comment || undefined,
        }));
    }

    async getTableStructure(schemaName: string, tableName: string): Promise<ColumnInfo[]> {
        const sql = `
      SELECT
        column_name as name,
        data_type as type,
        is_nullable as nullable,
        column_default as "default",
        col_description((quote_ident(table_schema) || '.' || quote_ident(table_name))::regclass, ordinal_position) as comment
      FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name = $2
      ORDER BY ordinal_position
    `;

        const result = await this.executeQuery(this.formatQuery(sql, [schemaName, tableName]));
        return result.rows.map((row: any) => ({
            name: row.name,
            type: row.type,
            nullable: row.nullable === 'YES',
            default: row.default,
            comment: row.comment || undefined,
        }));
    }

    async getIndexes(schemaName: string, tableName: string): Promise<IndexInfo[]> {
        const sql = `
      SELECT
        i.relname as name,
        array_agg(a.attname ORDER BY a.attnum) as columns,
        ix.indisunique as unique
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = $1
        AND t.relname = $2
      GROUP BY i.relname, ix.indisunique
      ORDER BY i.relname
    `;

        const result = await this.executeQuery(this.formatQuery(sql, [schemaName, tableName]));
        return result.rows.map((row: any) => ({
            name: row.name,
            columns: row.columns,
            unique: row.unique,
        }));
    }

    async getProcedures(schemaName: string): Promise<ProcedureInfo[]> {
        const sql = `
      SELECT
        routine_name as name,
        routine_type as type
      FROM information_schema.routines
      WHERE routine_schema = $1
      ORDER BY routine_name
    `;

        const result = await this.executeQuery(this.formatQuery(sql, [schemaName]));
        return result.rows.map((row: any) => ({
            name: row.name,
            type: row.type,
        }));
    }

    async getProcedureDetails(schemaName: string, procedureName: string): Promise<ProcedureInfo | null> {
        const sql = `
      SELECT
        routine_name as name,
        routine_type as type,
        routine_definition as definition
      FROM information_schema.routines
      WHERE routine_schema = $1
        AND routine_name = $2
    `;

        const result = await this.executeQuery(this.formatQuery(sql, [schemaName, procedureName]));
        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            name: row.name,
            type: row.type,
            definition: row.definition,
        };
    }

    async ping(): Promise<boolean> {
        try {
            if (!this.client) {
                return false;
            }
            await this.client.query('SELECT 1');
            return true;
        } catch {
            return false;
        }
    }

    protected escapeIdentifier(identifier: string): string {
        return `"${identifier.replace(/"/g, '""')}"`;
    }

    private formatQuery(sql: string, params: any[]): string {
        let formatted = sql;
        params.forEach((param, index) => {
            formatted = formatted.replace(`$${index + 1}`, `'${param.replace(/'/g, "''")}'`);
        });
        return formatted;
    }
}
