import http, { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  isInitializeRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { BaseConnector } from './connectors/base.js';
import { MySQLConnector } from './connectors/mysql.js';
import { PostgresConnector } from './connectors/postgres.js';
import { MariaDBConnector } from './connectors/mariadb.js';
import { SQLiteConnector } from './connectors/sqlite.js';
import { ServerConfig, TransportMode } from './types/index.js';
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

const STREAMABLE_ENDPOINT = '/mcp';

export class LaravelDatabaseServer {
  private server: McpServer['server'];
  private mcpServer: McpServer;
  private connector: BaseConnector | null = null;
  private sshTunnel: SSHTunnel | null = null;
  private config: ServerConfig;
  private logger;
  private httpServer: http.Server | null = null;
  private currentTransport: TransportMode | null = null;
  private streamableTransport: StreamableHTTPServerTransport | null = null;
  private streamableSessionId: string | null = null;

  constructor(config: ServerConfig) {
    this.config = config;
    this.logger = createLogger(config.logLevel, config.id);

    this.mcpServer = new McpServer(
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

    this.server = this.mcpServer.server;

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

      switch (this.config.transport) {
        case 'stdio':
          await this.startStdioTransport();
          break;
        case 'http':
          await this.startStreamableHttpServer();
          break;
        default:
          throw new Error(`Unsupported transport mode: ${this.config.transport}`);
      }

      const transportInfo =
        this.config.transport === 'stdio'
          ? { transport: this.config.transport }
          : {
              transport: this.config.transport,
              endpoint: `http://${this.getHttpHost()}:${this.getHttpPort()}${STREAMABLE_ENDPOINT}`,
            };

      this.logger.info('MCP Server started successfully', transportInfo);
    } catch (error) {
      this.logger.error('Failed to start server', { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping server');

    if (this.httpServer) {
      await this.shutdownHttpServer();
    }

    await this.mcpServer.close();
    this.currentTransport = null;
    this.streamableTransport = null;
    this.streamableSessionId = null;

    if (this.connector) {
      await this.connector.disconnect();
      this.connector = null;
    }

    if (this.sshTunnel) {
      await this.sshTunnel.close();
      this.sshTunnel = null;
    }

    this.logger.info('Server stopped');
  }

  private async startStdioTransport(): Promise<void> {
    const transport = new StdioServerTransport();

    transport.onclose = () => {
      this.logger.info('STDIO transport closed');
      if (this.currentTransport === 'stdio') {
        this.currentTransport = null;
      }
    };

    transport.onerror = (error) => {
      this.logger.error('STDIO transport error', { error: error.message });
    };

    await this.mcpServer.connect(transport);
    this.currentTransport = 'stdio';
  }

  private async startStreamableHttpServer(): Promise<void> {
    await this.startHttpListener((req, res) => this.handleStreamableHttpRequest(req, res));

    this.logger.info('Listening for Streamable HTTP transport', {
      host: this.getHttpHost(),
      port: this.getHttpPort(),
      endpoint: STREAMABLE_ENDPOINT,
    });
  }

  private async startHttpListener(
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>
  ): Promise<void> {
    if (this.httpServer) {
      throw new Error('HTTP listener already initialized');
    }

    this.httpServer = http.createServer((req, res) => {
      handler(req, res).catch((error) => {
        this.logger.error('HTTP transport handler error', {
          error: error instanceof Error ? error.message : String(error),
        });

        if (!res.headersSent) {
          res.writeHead(500).end('Internal Server Error');
        }
      });
    });

    await new Promise<void>((resolve, reject) => {
      this.httpServer?.listen(this.getHttpPort(), this.getHttpHost(), (err?: Error) => {
        if (err) {
          this.httpServer?.close(() => undefined);
          this.httpServer = null;
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private async handleStreamableHttpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (!req.url) {
      this.sendJsonRpcError(res, 404, -32004, 'Not Found');
      return;
    }

    const requestUrl = new URL(req.url, `http://${this.getHttpHost()}:${this.getHttpPort()}`);

    if (requestUrl.pathname !== STREAMABLE_ENDPOINT) {
      this.sendJsonRpcError(res, 404, -32004, 'Not Found');
      return;
    }

    switch (req.method) {
      case 'POST':
        await this.handleStreamablePost(req, res);
        return;
      case 'GET':
        await this.handleStreamableGet(req, res);
        return;
      case 'DELETE':
        await this.handleStreamableDelete(req, res);
        return;
      default:
        this.sendJsonRpcError(res, 405, -32000, 'Method Not Allowed');
    }
  }

  private async handleStreamablePost(req: IncomingMessage, res: ServerResponse): Promise<void> {
    let body: unknown;

    try {
      body = await this.readJsonBody(req);
    } catch (error) {
      this.logger.warn('Invalid JSON body received for Streamable HTTP POST', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.sendJsonRpcError(res, 400, -32700, 'Invalid JSON body');
      return;
    }

    const sessionId = this.getSessionIdHeader(req);

    if (sessionId) {
      if (!this.streamableTransport || sessionId !== this.streamableSessionId) {
        this.sendJsonRpcError(res, 404, -32004, 'Session not found');
        return;
      }

      await this.streamableTransport.handleRequest(req, res, body);
      return;
    }

    if (this.currentTransport) {
      this.sendJsonRpcError(res, 409, -32000, 'An MCP session is already active');
      return;
    }

    if (!body || typeof body !== 'object' || !isInitializeRequest(body)) {
      this.sendJsonRpcError(res, 400, -32600, 'Initialization request required');
      return;
    }

    const transport = this.createStreamableTransport();
    this.streamableTransport = transport;
    this.currentTransport = 'http';

    try {
      await this.mcpServer.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch (error) {
      await transport.close().catch(() => undefined);
      this.cleanupStreamableSession();
      this.logger.error('Failed to establish Streamable HTTP session', { error });
      throw error;
    }
  }

  private async handleStreamableGet(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const sessionId = this.getSessionIdHeader(req);

    if (!sessionId || !this.streamableTransport || sessionId !== this.streamableSessionId) {
      this.sendJsonRpcError(res, 404, -32004, 'Session not found');
      return;
    }

    await this.streamableTransport.handleRequest(req, res);
  }

  private async handleStreamableDelete(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const sessionId = this.getSessionIdHeader(req);

    if (!sessionId || !this.streamableTransport || sessionId !== this.streamableSessionId) {
      this.sendJsonRpcError(res, 404, -32004, 'Session not found');
      return;
    }

    await this.streamableTransport.handleRequest(req, res);
  }

  private createStreamableTransport(): StreamableHTTPServerTransport {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId: string) => {
        this.streamableSessionId = sessionId;
        this.logger.info('Streamable HTTP session initialized', { sessionId });
      },
      onsessionclosed: (sessionId: string) => {
        this.logger.info('Streamable HTTP session closed by client', { sessionId });
        this.cleanupStreamableSession();
      },
    });

    transport.onclose = () => {
      this.logger.info('Streamable HTTP transport closed');
      this.cleanupStreamableSession();
    };

    transport.onerror = (error) => {
      this.logger.error('Streamable HTTP transport error', { error: error.message });
    };

    return transport;
  }

  private async readJsonBody(req: IncomingMessage): Promise<unknown> {
    const chunks: Uint8Array[] = [];

    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }

    const rawBody = Buffer.concat(chunks).toString('utf-8').trim();

    if (!rawBody) {
      return undefined;
    }

    return JSON.parse(rawBody);
  }

  private sendJsonResponse(res: ServerResponse, status: number, payload: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }

  private sendJsonRpcError(res: ServerResponse, status: number, code: number, message: string): void {
    this.sendJsonResponse(res, status, {
      jsonrpc: '2.0',
      error: { code, message },
      id: null,
    });
  }

  private getSessionIdHeader(req: IncomingMessage): string | undefined {
    const header = req.headers['mcp-session-id'];

    if (Array.isArray(header)) {
      return header[0];
    }

    return header;
  }

  private getHttpHost(): string {
    return this.config.host ?? 'localhost';
  }

  private getHttpPort(): number {
    return this.config.port ?? 8080;
  }

  private cleanupStreamableSession(): void {
    if (this.currentTransport === 'http') {
      this.currentTransport = null;
    }
    this.streamableTransport = null;
    this.streamableSessionId = null;
  }

  private async shutdownHttpServer(): Promise<void> {
    if (!this.httpServer) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.httpServer?.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    this.httpServer = null;
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
