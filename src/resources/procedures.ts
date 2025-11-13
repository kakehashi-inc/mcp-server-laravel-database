import { BaseConnector } from '../connectors/base.js';

export async function getProceduresInSchema(
  connector: BaseConnector,
  schemaName: string
): Promise<string> {
  const procedures = await connector.getProcedures(schemaName);

  const lines = [`# Procedures in Schema: ${schemaName}`, ''];

  if (procedures.length === 0) {
    lines.push('No procedures found.');
  } else {
    lines.push(`Found ${procedures.length} procedure(s):`);
    lines.push('');
    lines.push('| Name | Type |');
    lines.push('|------|------|');

    for (const proc of procedures) {
      lines.push(`| ${proc.name} | ${proc.type} |`);
    }
  }

  return lines.join('\n');
}

export async function getProcedureDetails(
  connector: BaseConnector,
  schemaName: string,
  procedureName: string
): Promise<string> {
  const procedure = await connector.getProcedureDetails(schemaName, procedureName);

  const lines = [`# Procedure Details: ${schemaName}.${procedureName}`, ''];

  if (!procedure) {
    lines.push('Procedure not found.');
  } else {
    lines.push(`**Name:** ${procedure.name}`);
    lines.push(`**Type:** ${procedure.type}`);
    lines.push('');

    if (procedure.definition) {
      lines.push('**Definition:**');
      lines.push('```sql');
      lines.push(procedure.definition);
      lines.push('```');
    }
  }

  return lines.join('\n');
}
