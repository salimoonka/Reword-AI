/**
 * Health Check Routes
 * Basic health check and detailed status endpoints
 */

import { FastifyPluginAsync } from 'fastify';
import { checkSupabaseHealth, pingDatabase } from '../services/supabase/health.js';

const healthRoute: FastifyPluginAsync = async (fastify) => {
  // Basic health check - fast, for load balancers
  fastify.get('/health', async (_request, reply) => {
    return reply.status(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'reword-ai-backend',
    });
  });

  // Liveness probe - checks if service is running
  fastify.get('/health/live', async (_request, reply) => {
    return reply.status(200).send({ status: 'alive' });
  });

  // Readiness probe - checks if service can handle requests
  fastify.get('/health/ready', async (_request, reply) => {
    const dbPing = await pingDatabase();

    if (!dbPing.ok) {
      return reply.status(503).send({
        status: 'not_ready',
        reason: 'database_unavailable',
        error: dbPing.error,
      });
    }

    return reply.status(200).send({
      status: 'ready',
      database_latency_ms: dbPing.latencyMs,
    });
  });

  // Detailed status - full health check with all components
  fastify.get('/health/detailed', async (_request, reply) => {
    const health = await checkSupabaseHealth();

    const statusCode = health.status === 'healthy' ? 200 
      : health.status === 'degraded' ? 200 
      : 503;

    return reply.status(statusCode).send({
      status: health.status,
      service: 'reword-ai-backend',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      database: health.database,
      tables: health.tables,
      timestamp: health.timestamp,
    });
  });
};

export default healthRoute;
