import { LaravelDatabaseServer } from './server.js';
import { parseArguments, buildConfig } from './config.js';
import { createLogger } from './utils/logger.js';

async function main() {
  let server: LaravelDatabaseServer | null = null;

  try {
    // Parse command line arguments
    const args = parseArguments();

    // Build configuration
    const config = buildConfig(args);

    // Create logger for startup
    const logger = createLogger(config.logLevel, config.id);

    logger.info('Initializing Laravel Database MCP Server', {
      database: config.database.type,
      readonly: config.readonly,
      transport: config.transport,
    });

    // Create and start server
    server = new LaravelDatabaseServer(config);
    await server.start();

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);

      if (server) {
        await server.stop();
      }

      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', { reason });
      process.exit(1);
    });
  } catch (error) {
    const logger = createLogger('error');
    logger.error('Failed to start server', { error });

    if (server) {
      await server.stop();
    }

    process.exit(1);
  }
}

main();
