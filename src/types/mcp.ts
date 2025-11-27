export interface ExecuteSqlParams {
    sql: string;
    max_rows?: number;
    offset?: number;
    page?: number;
    per_page?: number;
}

export interface ResourceTemplateParams {
    schemaName?: string;
    tableName?: string;
    procedureName?: string;
}

export const RESOURCE_TEMPLATES = {
    schemas: 'db://schemas',
    tables_in_schema: 'db://schemas/{schemaName}/tables',
    table_structure_in_schema: 'db://schemas/{schemaName}/tables/{tableName}',
    indexes_in_table: 'db://schemas/{schemaName}/tables/{tableName}/indexes',
    procedures_in_schema: 'db://schemas/{schemaName}/procedures',
    procedure_details_in_schema: 'db://schemas/{schemaName}/procedures/{procedureName}',
} as const;

export type ResourceTemplate = keyof typeof RESOURCE_TEMPLATES;
