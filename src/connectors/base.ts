import {
  DatabaseConfig,
  QueryResult,
  SchemaInfo,
  TableInfo,
  ColumnInfo,
  IndexInfo,
  ProcedureInfo,
} from '../types/index.js';

export abstract class BaseConnector {
  protected config: DatabaseConfig;
  protected readonly: boolean;

  constructor(config: DatabaseConfig, readonly: boolean = false) {
    this.config = config;
    this.readonly = readonly;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract executeQuery(sql: string): Promise<QueryResult>;

  // Schema operations
  abstract getSchemas(): Promise<SchemaInfo[]>;

  // Table operations
  abstract getTables(schemaName: string): Promise<TableInfo[]>;
  abstract getTableStructure(schemaName: string, tableName: string): Promise<ColumnInfo[]>;

  // Index operations
  abstract getIndexes(schemaName: string, tableName: string): Promise<IndexInfo[]>;

  // Procedure operations
  abstract getProcedures(schemaName: string): Promise<ProcedureInfo[]>;
  abstract getProcedureDetails(schemaName: string, procedureName: string): Promise<ProcedureInfo | null>;

  // Utility methods
  abstract ping(): Promise<boolean>;

  protected abstract escapeIdentifier(identifier: string): string;
}
