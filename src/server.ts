import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { BaseConnector } from './connectors/base.js';
import { MySQLConnector } from './connectors/mysql.js';
import { PostgresConnector } from './connectors/postgres.js';
import { MariaDBConnector } from './connectors/mariadb.js';
import { SQLiteConnector } from './connectors/sqlite.js';
import { ServerConfig } from './types/index.js';
import { createLogger } from './utils/logger.js';
import { createSSHTunnel, SSHTunnel } from './utils/ssh-tunnel.js';
import {
  getSchemas,
  getTablesInSchema,
  getTableStructure,
  getIndexesInTable,
  getProceduresInSchema,
  getProcedureDetails,
} from './resources/index.js';
import { executeSql } from './tools/index.js';
import { RESOURCE_TEMPLATES } from './types/mcp.js';

export class LaravelDatabaseServer {
  private server: Server;
  private connector: BaseConnector | null = null;
  private sshTunnel: SSHTunnel | null = null;
  private config: ServerConfig;
  private logger;

  constructor(config: ServerConfig) {
    this.config = config;
    this.logger = createLogger(config.logLevel, config.id);

    this.server = new Server(
      {
        name: 'mcp-server-laravel-database',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: RESOURCE_TEMPLATES.schemas,
            name: 'Database Schemas',
            description: 'List all database schemas',
            mimeType: 'text/plain',
          },
          {
            uri: RESOURCE_TEMPLATES.tables_in_schema,
            name: 'Tables in Schema',
            description: 'List all tables in a schema',
            mimeType: 'text/plain',
          },
          {
            uri: RESOURCE_TEMPLATES.table_structure_in_schema,
            name: 'Table Structure',
            description: 'Get the structure of a table',
            mimeType: 'text/plain',
          },
          {
            uri: RESOURCE_TEMPLATES.indexes_in_table,
            name: 'Table Indexes',
            description: 'Get indexes for a table',
            mimeType: 'text/plain',
          },
          {
            uri: RESOURCE_TEMPLATES.procedures_in_schema,
            name: 'Procedures in Schema',
            description: 'List all procedures in a schema',
            mimeType: 'text/plain',
          },
          {
            uri: RESOURCE_TEMPLATES.procedure_details_in_schema,
            name: 'Procedure Details',
            description: 'Get details of a procedure',
            mimeType: 'text/plain',
          },
        ],
      };
    });

    // Read resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;

      if (!this.connector) {
        throw new Error('Database connection not established');
      }

      // Parse URI
      if (uri === RESOURCE_TEMPLATES.schemas) {
        const content = await getSchemas(this.connector);
        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: content,
            },
          ],
        };
      }

      // db://schemas/{schemaName}/tables
      const tablesMatch = uri.match(/^db:\/\/schemas\/([^\/]+)\/tables$/);
      if (tablesMatch) {
        const schemaName = decodeURIComponent(tablesMatch[1]);
        const content = await getTablesInSchema(this.connector, schemaName);
        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: content,
            },
          ],
        };
      }

      // db://schemas/{schemaName}/tables/{tableName}
      const tableStructureMatch = uri.match(/^db:\/\/schemas\/([^\/]+)\/tables\/([^\/]+)$/);
      if (tableStructureMatch) {
        const schemaName = decodeURIComponent(tableStructureMatch[1]);
        const tableName = decodeURIComponent(tableStructureMatch[2]);
        const content = await getTableStructure(this.connector, schemaName, tableName);
        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: content,
            },
          ],
        };
      }

      // db://schemas/{schemaName}/tables/{tableName}/indexes
      const indexesMatch = uri.match(/^db:\/\/schemas\/([^\/]+)\/tables\/([^\/]+)\/indexes$/);
      if (indexesMatch) {
        const schemaName = decodeURIComponent(indexesMatch[1]);
        const tableName = decodeURIComponent(indexesMatch[2]);
        const content = await getIndexesInTable(this.connector, schemaName, tableName);
        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: content,
            },
          ],
        };
      }

      // db://schemas/{schemaName}/procedures
      const proceduresMatch = uri.match(/^db:\/\/schemas\/([^\/]+)\/procedures$/);
      if (proceduresMatch) {
        const schemaName = decodeURIComponent(proceduresMatch[1]);
        const content = await getProceduresInSchema(this.connector, schemaName);
        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: content,
            },
          ],
        };
      }

      // db://schemas/{schemaName}/procedures/{procedureName}
      const procedureDetailsMatch = uri.match(/^db:\/\/schemas\/([^\/]+)\/procedures\/([^\/]+)$/);
      if (procedureDetailsMatch) {
        const schemaName = decodeURIComponent(procedureDetailsMatch[1]);
        const procedureName = decodeURIComponent(procedureDetailsMatch[2]);
        const content = await getProcedureDetails(this.connector, schemaName, procedureName);
        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: content,
            },
          ],
        };
      }

      throw new Error(`Unknown resource URI: ${uri}`);
    });

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'execute_sql',
            description: 'Execute a SQL query',
            inputSchema: {
              type: 'object',
              properties: {
                sql: {
                  type: 'string',
                  description: 'SQL query to execute',
                },
                max_rows: {
                  type: 'number',
                  description: 'Maximum number of rows to return',
                },
                offset: {
                  type: 'number',
                  description: 'Offset for pagination',
                },
                page: {
                  type: 'number',
                  description: 'Page number (1-based)',
                },
                per_page: {
                  type: 'number',
                  description: 'Number of rows per page',
                },
              },
              required: ['sql'],
            },
          },
        ],
      };
    });

    // Call tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!this.connector) {
        throw new Error('Database connection not established');
      }

      if (name === 'execute_sql') {
        const content = await executeSql(
          this.connector,
          args as any,
          this.config.readonly,
          this.config.maxRows
        );

        return {
          content: [
            {
              type: 'text',
              text: content,
            },
          ],
        };
      }

      throw new Error(`Unknown tool: ${name}`);
    });
  }

  async start(): Promise<void> {
    try {
      this.logger.info('Starting Laravel Database MCP Server');

      // Setup SSH tunnel if configured
      if (this.config.ssh) {
        this.logger.info('Setting up SSH tunnel');
        this.sshTunnel = await createSSHTunnel(
          this.config.ssh,
          this.config.database.host || 'localhost',
          this.config.database.port || 3306
        );

        // Update database config to use tunnel
        this.config.database.host = this.sshTunnel.getLocalHost();
        this.config.database.port = this.sshTunnel.getLocalPort();

        this.logger.info(
          `SSH tunnel established: ${this.sshTunnel.getLocalHost()}:${this.sshTunnel.getLocalPort()}`
        );
      }

      // Create database connector
      this.logger.info(`Connecting to ${this.config.database.type} database`);
      this.connector = this.createConnector();
      await this.connector.connect();
      this.logger.info('Database connection established');

      // Start MCP server
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      this.logger.info('MCP Server started successfully');
    } catch (error) {
      this.logger.error('Failed to start server', { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping server');

    if (this.connector) {
      await this.connector.disconnect();
      this.connector = null;
    }

    if (this.sshTunnel) {
      await this.sshTunnel.close();
      this.sshTunnel = null;
    }

    await this.server.close();
    this.logger.info('Server stopped');
  }

  private createConnector(): BaseConnector {
    const { database } = this.config;

    switch (database.type) {
      case 'mysql':
        return new MySQLConnector(database, this.config.readonly);

      case 'pgsql':
        return new PostgresConnector(database, this.config.readonly);

      case 'mariadb':
        return new MariaDBConnector(database, this.config.readonly);

      case 'sqlite':
        return new SQLiteConnector(database, this.config.readonly);

      default:
        throw new Error(`Unsupported database type: ${database.type}`);
    }
  }
}
