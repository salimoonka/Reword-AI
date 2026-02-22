/**
 * Reword AI Backend - Main Entry Point
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import config from './config.js';
import logger from './services/logging/logger.js';
import authPlugin from './plugins/auth.js';
import routes from './routes/index.js';

// Create Fastify instance
const fastify = Fastify({
  logger: false, // We use custom Pino logger
  trustProxy: true,
});

// Register plugins
async function start() {
  try {
    // Security headers
    await fastify.register(helmet, {
      contentSecurityPolicy: false,
    });

    // CORS — allow mobile app from any origin (deep link scheme + Expo Go)
    await fastify.register(cors, {
      origin: true,
      credentials: true,
    });

    // Rate limiting
    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
      keyGenerator: (request) => {
        return request.userId || request.ip;
      },
    });

    // Auth plugin
    await fastify.register(authPlugin);

    // Routes
    await fastify.register(routes);

    // Global error handler
    fastify.setErrorHandler((error: Error, request, reply) => {
      logger.error({
        event: 'unhandled_error',
        error: error.message,
        // Only include stack traces in development to prevent potential PII leaks
        ...(config.nodeEnv === 'development' && { stack: error.stack }),
        url: request.url,
        method: request.method,
      });

      reply.status(500).send({
        error: 'Internal server error',
      });
    });

    // Start server
    const address = await fastify.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    logger.info({
      event: 'server_started',
      address,
      env: config.nodeEnv,
    });

    console.log(`🚀 Server running at ${address}`);
  } catch (error) {
    logger.error({
      event: 'server_start_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Graceful shutdown
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    logger.info({ event: 'shutdown_started', signal });

    try {
      await fastify.close();
      logger.info({ event: 'shutdown_complete' });
      process.exit(0);
    } catch (error) {
      logger.error({
        event: 'shutdown_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  });
});

// Start the server
start();

export default fastify;
