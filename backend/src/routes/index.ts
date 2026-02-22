/**
 * Routes Index - Register all routes
 */

import { FastifyPluginAsync } from 'fastify';
import healthRoute from './health.js';
import v1Routes from './v1/index.js';

const routes: FastifyPluginAsync = async (fastify) => {
  // Health check (no auth required)
  fastify.register(healthRoute);

  // V1 API routes
  fastify.register(v1Routes, { prefix: '/v1' });
};

export default routes;
