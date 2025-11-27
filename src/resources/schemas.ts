import { BaseConnector } from '../connectors/base.js';

export async function getSchemas(connector: BaseConnector): Promise<string> {
    const schemas = await connector.getSchemas();

    const lines = ['# Database Schemas', ''];

    if (schemas.length === 0) {
        lines.push('No schemas found.');
    } else {
        lines.push(`Found ${schemas.length} schema(s):`);
        lines.push('');

        for (const schema of schemas) {
            lines.push(`- ${schema.name}`);
        }
    }

    return lines.join('\n');
}
