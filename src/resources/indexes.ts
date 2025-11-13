import { BaseConnector } from '../connectors/base.js';

export async function getIndexesInTable(
  connector: BaseConnector,
  schemaName: string,
  tableName: string
): Promise<string> {
  const indexes = await connector.getIndexes(schemaName, tableName);

  const lines = [`# Indexes in Table: ${schemaName}.${tableName}`, ''];

  if (indexes.length === 0) {
    lines.push('No indexes found.');
  } else {
    lines.push(`Found ${indexes.length} index(es):`);
    lines.push('');
    lines.push('| Index Name | Columns | Unique | Type |');
    lines.push('|------------|---------|--------|------|');

    for (const idx of indexes) {
      const cells = [
        idx.name,
        idx.columns.join(', '),
        idx.unique ? 'YES' : 'NO',
        idx.type || '',
      ];

      lines.push(`| ${cells.join(' | ')} |`);
    }
  }

  return lines.join('\n');
}
