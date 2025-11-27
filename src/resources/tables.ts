import { BaseConnector } from '../connectors/base.js';

export async function getTablesInSchema(connector: BaseConnector, schemaName: string): Promise<string> {
    const tables = await connector.getTables(schemaName);

    const lines = [`# Tables in Schema: ${schemaName}`, ''];

    if (tables.length === 0) {
        lines.push('No tables found.');
    } else {
        lines.push(`Found ${tables.length} table(s):`);
        lines.push('');

        for (const table of tables) {
            let line = `- ${table.name}`;
            if (table.type) {
                line += ` (${table.type})`;
            }
            if (table.comment) {
                line += ` - ${table.comment}`;
            }
            lines.push(line);
        }
    }

    return lines.join('\n');
}

export async function getTableStructure(
    connector: BaseConnector,
    schemaName: string,
    tableName: string
): Promise<string> {
    const columns = await connector.getTableStructure(schemaName, tableName);

    const lines = [`# Table Structure: ${schemaName}.${tableName}`, ''];

    if (columns.length === 0) {
        lines.push('No columns found.');
    } else {
        lines.push(`Found ${columns.length} column(s):`);
        lines.push('');
        lines.push('| Column | Type | Nullable | Default | Key | Extra | Comment |');
        lines.push('|--------|------|----------|---------|-----|-------|---------|');

        for (const col of columns) {
            const cells = [
                col.name,
                col.type,
                col.nullable ? 'YES' : 'NO',
                col.default || '',
                col.key || '',
                col.extra || '',
                col.comment || '',
            ];

            lines.push(`| ${cells.join(' | ')} |`);
        }
    }

    return lines.join('\n');
}
