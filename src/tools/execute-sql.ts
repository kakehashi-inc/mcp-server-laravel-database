import { BaseConnector } from '../connectors/base.js';
import { ExecuteSqlParams } from '../types/index.js';
import { calculatePagination, applySqlPagination } from '../utils/pagination.js';
import { validateReadOnlyQuery } from '../utils/query-validator.js';

export async function executeSql(
  connector: BaseConnector,
  params: ExecuteSqlParams,
  readonly: boolean,
  globalMaxRows?: number
): Promise<string> {
  let { sql } = params;

  // Validate read-only mode
  if (readonly) {
    validateReadOnlyQuery(sql);
  }

  // Calculate pagination
  const pagination = calculatePagination({
    maxRows: params.max_rows || globalMaxRows,
    offset: params.offset,
    page: params.page,
    perPage: params.per_page,
  });

  // Apply pagination if specified
  if (pagination) {
    sql = applySqlPagination(sql, pagination);
  }

  try {
    const result = await connector.executeQuery(sql);

    const lines = ['# SQL Execution Result', ''];

    // Show row count
    lines.push(`**Rows affected/returned:** ${result.rowCount || 0}`);
    lines.push('');

    // Show results if any
    if (result.rows.length > 0) {
      // Get column names from first row
      const columns = Object.keys(result.rows[0]);

      if (columns.length > 0) {
        // Create markdown table
        lines.push(`| ${columns.join(' | ')} |`);
        lines.push(`| ${columns.map(() => '---').join(' | ')} |`);

        for (const row of result.rows) {
          const cells = columns.map((col) => {
            const value = row[col];
            if (value === null) {
              return 'NULL';
            }
            if (typeof value === 'object') {
              return JSON.stringify(value);
            }
            return String(value);
          });

          lines.push(`| ${cells.join(' | ')} |`);
        }
      }
    } else {
      lines.push('*No rows returned.*');
    }

    return lines.join('\n');
  } catch (error) {
    throw new Error(`SQL execution failed: ${error}`);
  }
}
