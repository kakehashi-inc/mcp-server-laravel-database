import Database from 'better-sqlite3';
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

export class SQLiteConnector extends BaseConnector {
  private db: Database.Database | null = null;

  async connect(): Promise<void> {
    this.db = new Database(this.config.database, {
      readonly: this.readonly,
      fileMustExist: true,
    });
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async executeQuery(sql: string): Promise<QueryResult> {
    if (!this.db) {
      throw new Error('Not connected to database');
    }

    // Determine if this is a SELECT query
    const isSelect = /^\s*SELECT/i.test(sql.trim());

    if (isSelect) {
      const stmt = this.db.prepare(sql);
      const rows = stmt.all();

      return {
        rows,
        rowCount: rows.length,
      };
    } else {
      const stmt = this.db.prepare(sql);
      const info = stmt.run();

      return {
        rows: [],
        rowCount: info.changes,
      };
    }
  }

  async getSchemas(): Promise<SchemaInfo[]> {
    // SQLite doesn't have schemas in the traditional sense
    // Return the main database as a schema
    return [{ name: 'main' }];
  }

  async getTables(schemaName: string): Promise<TableInfo[]> {
    const sql = `
      SELECT name, type
      FROM sqlite_master
      WHERE type IN ('table', 'view')
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `;

    const result = await this.executeQuery(sql);
    return result.rows.map((row: any) => ({
      name: row.name,
      type: row.type,
    }));
  }

  async getTableStructure(schemaName: string, tableName: string): Promise<ColumnInfo[]> {
    const sql = `PRAGMA table_info(${this.escapeIdentifier(tableName)})`;

    const result = await this.executeQuery(sql);
    return result.rows.map((row: any) => ({
      name: row.name,
      type: row.type,
      nullable: row.notnull === 0,
      default: row.dflt_value,
      key: row.pk ? 'PRI' : undefined,
    }));
  }

  async getIndexes(schemaName: string, tableName: string): Promise<IndexInfo[]> {
    const sql = `PRAGMA index_list(${this.escapeIdentifier(tableName)})`;

    const result = await this.executeQuery(sql);
    const indexes: IndexInfo[] = [];

    for (const row of result.rows) {
      const indexInfoSql = `PRAGMA index_info(${this.escapeIdentifier(row.name)})`;
      const indexInfo = await this.executeQuery(indexInfoSql);

      indexes.push({
        name: row.name,
        columns: indexInfo.rows.map((col: any) => col.name),
        unique: row.unique === 1,
      });
    }

    return indexes;
  }

  async getProcedures(schemaName: string): Promise<ProcedureInfo[]> {
    // SQLite doesn't support stored procedures
    return [];
  }

  async getProcedureDetails(schemaName: string, procedureName: string): Promise<ProcedureInfo | null> {
    // SQLite doesn't support stored procedures
    return null;
  }

  async ping(): Promise<boolean> {
    try {
      if (!this.db) {
        return false;
      }
      this.db.prepare('SELECT 1').get();
      return true;
    } catch {
      return false;
    }
  }

  protected escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }
}
