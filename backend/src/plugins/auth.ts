/**
 * Auth Plugin - Supabase JWT Validation
 * Verifies ECC P-256 JWT locally via JWKS (no network call after first fetch)
 * for maximum speed. Falls back to supabase.auth.getUser() if JWKS fails.
 */

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { supabaseAdmin, isSupabaseConfigured } from '../services/supabase/client.js';
import logger from '../services/logging/logger.js';
import config from '../config.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    userEmail?: string;
  }
}

// Development test user ID
const DEV_USER_ID = 'dev-test-user-00000000';

// ─── JWKS setup (ECC P-256) ──────────────────────────────────────────
// Supabase publishes the public key at /auth/v1/.well-known/jwks.json
// jose fetches & caches it — all subsequent verifications are local (~0ms).
const SUPABASE_JWKS_URL = config.supabase.url
  ? new URL('/auth/v1/.well-known/jwks.json', config.supabase.url)
  : null;

const JWKS = SUPABASE_JWKS_URL
  ? createRemoteJWKSet(SUPABASE_JWKS_URL, {
      cacheMaxAge: 600_000, // cache public key for 10 minutes
      cooldownDuration: 30_000,
    })
  : null;

if (JWKS) {
  logger.info({ event: 'auth_init', mode: 'jwks_ecc_p256', url: SUPABASE_JWKS_URL?.href });
} else {
  logger.warn({ event: 'auth_init', mode: 'supabase_getuser', msg: 'SUPABASE_URL not set — falling back to supabase.auth.getUser()' });
}

// In-memory verified-user cache (avoids repeated JWT decode for the same token)
const tokenCache = new Map<string, { userId: string; email?: string; expiresAt: number }>();
const TOKEN_CACHE_MAX = 2000;
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedToken(token: string) {
  const entry = tokenCache.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tokenCache.delete(token);
    return null;
  }
  return entry;
}

function setCachedToken(token: string, userId: string, email?: string) {
  // Evict oldest entries when cache is full
  if (tokenCache.size >= TOKEN_CACHE_MAX) {
    const firstKey = tokenCache.keys().next().value;
    if (firstKey) tokenCache.delete(firstKey);
  }
  tokenCache.set(token, {
    userId,
    email,
    expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
  });
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('userId', undefined);
  fastify.decorateRequest('userEmail', undefined);

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health, public routes, and webhooks
    if (
      request.url === '/health' ||
      request.url.startsWith('/health/') ||
      request.url === '/' ||
      request.url.startsWith('/v1/webhooks/')
    ) {
      return;
    }

    // Development mode: allow X-Dev-Mode header to bypass auth
    if (config.nodeEnv === 'development') {
      const devMode = request.headers['x-dev-mode'];
      if (devMode === 'true') {
        request.userId = DEV_USER_ID;
        request.userEmail = 'dev@test.local';
        logger.debug({ event: 'auth_dev_mode', userId: DEV_USER_ID });
        return;
      }
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn({ event: 'auth_missing_token', url: request.url });
      return reply.status(401).send({ error: 'Missing authorization token' });
    }

    const token = authHeader.replace('Bearer ', '');

    // If Supabase not configured, use dev mode in development
    if (!isSupabaseConfigured && config.nodeEnv === 'development') {
      request.userId = DEV_USER_ID;
      request.userEmail = 'dev@test.local';
      logger.warn({ event: 'auth_supabase_not_configured', using: 'dev_mode' });
      return;
    }

    // ── Fast path: check in-memory token cache ──
    const cached = getCachedToken(token);
    if (cached) {
      request.userId = cached.userId;
      request.userEmail = cached.email;
      return;
    }

    // ── Primary path: local JWT verification via JWKS (no network call) ──
    if (JWKS) {
      try {
        const { payload } = await jwtVerify(token, JWKS, {
          issuer: `${config.supabase.url}/auth/v1`,
          audience: 'authenticated',
        });

        const userId = payload.sub;
        const email = (payload as JWTPayload & { email?: string }).email;

        if (!userId) {
          logger.warn({ event: 'auth_no_sub_in_jwt', url: request.url });
          return reply.status(401).send({ error: 'Invalid authorization token' });
        }

        request.userId = userId;
        request.userEmail = email;

        // Cache for subsequent requests
        setCachedToken(token, userId, email);

        logger.debug({
          event: 'auth_jwks_success',
          userId,
          url: request.url,
        });
        return;
      } catch (jwtError) {
        // JWT verification failed — fall through to Supabase getUser as backup
        logger.debug({
          event: 'auth_jwks_failed',
          error: jwtError instanceof Error ? jwtError.message : 'Unknown',
        });
      }
    }

    // ── Fallback path: verify via Supabase getUser (network call) ──
    try {
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(token);

      if (error || !user) {
        logger.warn({
          event: 'auth_invalid_token',
          url: request.url,
          error: error?.message,
        });
        return reply.status(401).send({ error: 'Invalid authorization token' });
      }

      request.userId = user.id;
      request.userEmail = user.email;

      // Cache for subsequent requests
      setCachedToken(token, user.id, user.email);

      logger.debug({
        event: 'auth_supabase_success',
        userId: user.id,
        url: request.url,
      });
    } catch (error) {
      logger.error({
        event: 'auth_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return reply.status(500).send({ error: 'Authentication error' });
    }
  });
};

export default fp(authPlugin, {
  name: 'auth',
});
