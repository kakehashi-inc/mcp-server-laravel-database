import mysql from 'mysql2/promise';
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

export class MySQLConnector extends BaseConnector {
  private connection: mysql.Connection | null = null;

  async connect(): Promise<void> {
    this.connection = await mysql.createConnection({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
      ssl: this.config.sslMode ? { rejectUnauthorized: false } : undefined,
    });
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  async executeQuery(sql: string): Promise<QueryResult> {
    if (!this.connection) {
      throw new Error('Not connected to database');
    }

    const [rows, fields] = await this.connection.query(sql);

    return {
      rows: Array.isArray(rows) ? rows : [],
      fields: fields?.map((f) => ({
        name: f.name,
        type: f.type?.toString() || 'unknown',
      })),
      rowCount: Array.isArray(rows) ? rows.length : 0,
    };
  }

  async getSchemas(): Promise<SchemaInfo[]> {
    const result = await this.executeQuery('SHOW DATABASES');
    return result.rows.map((row: any) => ({
      name: row.Database,
    }));
  }

  async getTables(schemaName: string): Promise<TableInfo[]> {
    const sql = `
      SELECT TABLE_NAME as name, TABLE_TYPE as type, TABLE_COMMENT as comment
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ${this.escape(schemaName)}
      ORDER BY TABLE_NAME
    `;

    const result = await this.executeQuery(sql);
    return result.rows.map((row: any) => ({
      name: row.name,
      type: row.type,
      comment: row.comment || undefined,
    }));
  }

  async getTableStructure(schemaName: string, tableName: string): Promise<ColumnInfo[]> {
    const sql = `
      SELECT
        COLUMN_NAME as name,
        COLUMN_TYPE as type,
        IS_NULLABLE as nullable,
        COLUMN_DEFAULT as \`default\`,
        COLUMN_COMMENT as comment,
        COLUMN_KEY as \`key\`,
        EXTRA as extra
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ${this.escape(schemaName)}
        AND TABLE_NAME = ${this.escape(tableName)}
      ORDER BY ORDINAL_POSITION
    `;

    const result = await this.executeQuery(sql);
    return result.rows.map((row: any) => ({
      name: row.name,
      type: row.type,
      nullable: row.nullable === 'YES',
      default: row.default,
      comment: row.comment || undefined,
      key: row.key || undefined,
      extra: row.extra || undefined,
    }));
  }

  async getIndexes(schemaName: string, tableName: string): Promise<IndexInfo[]> {
    const sql = `
      SELECT
        INDEX_NAME as name,
        GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as columns,
        NON_UNIQUE as non_unique,
        INDEX_TYPE as type
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ${this.escape(schemaName)}
        AND TABLE_NAME = ${this.escape(tableName)}
      GROUP BY INDEX_NAME, NON_UNIQUE, INDEX_TYPE
      ORDER BY INDEX_NAME
    `;

    const result = await this.executeQuery(sql);
    return result.rows.map((row: any) => ({
      name: row.name,
      columns: row.columns.split(','),
      unique: row.non_unique === 0,
      type: row.type,
    }));
  }

  async getProcedures(schemaName: string): Promise<ProcedureInfo[]> {
    const sql = `
      SELECT ROUTINE_NAME as name, ROUTINE_TYPE as type
      FROM information_schema.ROUTINES
      WHERE ROUTINE_SCHEMA = ${this.escape(schemaName)}
      ORDER BY ROUTINE_NAME
    `;

    const result = await this.executeQuery(sql);
    return result.rows.map((row: any) => ({
      name: row.name,
      type: row.type,
    }));
  }

  async getProcedureDetails(schemaName: string, procedureName: string): Promise<ProcedureInfo | null> {
    const sql = `
      SELECT
        ROUTINE_NAME as name,
        ROUTINE_TYPE as type,
        ROUTINE_DEFINITION as definition
      FROM information_schema.ROUTINES
      WHERE ROUTINE_SCHEMA = ${this.escape(schemaName)}
        AND ROUTINE_NAME = ${this.escape(procedureName)}
    `;

    const result = await this.executeQuery(sql);
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
      if (!this.connection) {
        return false;
      }
      await this.connection.ping();
      return true;
    } catch {
      return false;
    }
  }

  protected escapeIdentifier(identifier: string): string {
    return `\`${identifier.replace(/`/g, '``')}\``;
  }

  private escape(value: string): string {
    return mysql.escape(value);
  }
}
