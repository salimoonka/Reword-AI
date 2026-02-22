/**
 * Test Helper - creates a Fastify instance for integration testing
 * Uses Fastify's built-in inject() method
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import routes from '../../src/routes/index.js';
import authPlugin from '../../src/plugins/auth.js';

/**
 * Build a Fastify app instance for testing (without listen)
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: true });
  await app.register(authPlugin);
  await app.register(routes);

  await app.ready();
  return app;
}
