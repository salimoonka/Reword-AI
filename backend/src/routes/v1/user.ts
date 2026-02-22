/**
 * User Routes - GET/PUT /v1/user
 * User profile management
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../../services/supabase/client.js';
import { getQuotaInfo } from '../../services/quota/service.js';
import { getSubscription } from '../../services/subscription/service.js';
import logger from '../../services/logging/logger.js';

// Update profile schema
const updateProfileSchema = z.object({
  display_name: z.string().max(100).optional(),
  preferred_mode: z.enum(['lite', 'moderate', 'creative']).optional(),
  theme: z.enum(['auto', 'dark', 'light']).optional(),
  language: z.enum(['ru', 'en']).optional(),
  sound_enabled: z.boolean().optional(),
  haptic_enabled: z.boolean().optional(),
  auto_correct_enabled: z.boolean().optional(),
  show_suggestions: z.boolean().optional(),
});

const userRoute: FastifyPluginAsync = async (fastify) => {
  // GET /v1/user - Get current user profile with subscription info
  fastify.get('/user', async (request, reply) => {
    const userId = request.userId;

    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      // Fetch profile, subscription, and quota in parallel
      const [profileResult, subscription, quota] = await Promise.all([
        supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        getSubscription(userId),
        getQuotaInfo(userId),
      ]);

      if (profileResult.error || !profileResult.data) {
        logger.warn({
          event: 'user_profile_not_found',
          userId,
          error: profileResult.error?.message,
        });
        return reply.status(404).send({ error: 'Profile not found' });
      }

      const profile = profileResult.data;

      return reply.status(200).send({
        id: profile.id,
        email: profile.email,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        settings: {
          preferred_mode: profile.preferred_mode,
          theme: profile.theme,
          language: profile.language,
          sound_enabled: profile.sound_enabled,
          haptic_enabled: profile.haptic_enabled,
          auto_correct_enabled: profile.auto_correct_enabled,
          show_suggestions: profile.show_suggestions,
        },
        subscription: {
          status: subscription.status,
          plan: subscription.plan,
          is_premium: subscription.isPremium,
          expires_at: subscription.expiresAt?.toISOString() || null,
          trial_ends_at: subscription.trialEndsAt?.toISOString() || null,
          days_remaining: subscription.daysRemaining,
        },
        quota: {
          tier: quota.tier,
          daily_limit: quota.dailyLimit,
          daily_used: quota.dailyUsed,
          remaining: quota.remaining,
          reset_at: quota.resetAt.toISOString(),
        },
        created_at: profile.created_at,
      });
    } catch (error) {
      logger.error({
        event: 'user_get_error',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // PUT /v1/user - Update user profile settings
  fastify.put('/user', async (request, reply) => {
    const userId = request.userId;

    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    // Validate request body
    const parseResult = updateProfileSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parseResult.error.issues,
      });
    }

    const updates = parseResult.data;

    // Don't allow empty updates
    if (Object.keys(updates).length === 0) {
      return reply.status(400).send({ error: 'No fields to update' });
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        logger.error({
          event: 'user_update_error',
          userId,
          error: error.message,
        });
        return reply.status(500).send({ error: 'Failed to update profile' });
      }

      logger.info({
        event: 'user_profile_updated',
        userId,
        fields: Object.keys(updates),
      });

      return reply.status(200).send({
        message: 'Profile updated successfully',
        profile: {
          id: data.id,
          display_name: data.display_name,
          settings: {
            preferred_mode: data.preferred_mode,
            theme: data.theme,
            language: data.language,
            sound_enabled: data.sound_enabled,
            haptic_enabled: data.haptic_enabled,
            auto_correct_enabled: data.auto_correct_enabled,
            show_suggestions: data.show_suggestions,
          },
        },
      });
    } catch (error) {
      logger.error({
        event: 'user_update_error',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /v1/user/quota - Get quota info only
  fastify.get('/user/quota', async (request, reply) => {
    const userId = request.userId;

    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const quota = await getQuotaInfo(userId);

      return reply.status(200).send({
        tier: quota.tier,
        daily_limit: quota.dailyLimit,
        daily_used: quota.dailyUsed,
        remaining: quota.remaining,
        reset_at: quota.resetAt.toISOString(),
        unlimited: quota.remaining === -1,
      });
    } catch (error) {
      logger.error({
        event: 'quota_get_error',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // DELETE /v1/user/delete - GDPR data purge
  // Deletes all user data and the auth account
  fastify.delete('/user/delete', async (request, reply) => {
    const userId = request.userId;

    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      logger.info({
        event: 'user_delete_requested',
        userId,
      });

      // 1. Delete user data from all tables (cascaded from profiles)
      // Order: usage_log → subscriptions → paraphrase_cache → profiles
      // Note: ON DELETE CASCADE on foreign keys handles this, but we do it explicitly for safety

      const deleteTasks = [
        supabaseAdmin.from('usage_log').delete().eq('user_id', userId),
        supabaseAdmin.from('subscriptions').delete().eq('user_id', userId),
        supabaseAdmin.from('paraphrase_cache').delete().eq('user_id', userId),
      ];

      const results = await Promise.allSettled(deleteTasks);

      // Log any failures (non-critical — tables may not have data)
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          logger.warn({
            event: 'user_delete_table_warning',
            userId,
            tableIndex: index,
            error: result.reason?.message || 'Unknown error',
          });
        }
      });

      // 2. Delete the profile (triggers remaining cascades)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        logger.error({
          event: 'user_delete_profile_error',
          userId,
          error: profileError.message,
        });
        // Continue anyway — try to delete auth user
      }

      // 3. Delete the auth user from Supabase Auth
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (authError) {
        logger.error({
          event: 'user_delete_auth_error',
          userId,
          error: authError.message,
        });
        return reply.status(500).send({
          error: 'Failed to delete auth account. Some data may have been removed.',
        });
      }

      logger.info({
        event: 'user_deleted',
        userId,
      });

      return reply.status(200).send({
        message: 'All user data has been permanently deleted',
        deleted: true,
      });
    } catch (error) {
      logger.error({
        event: 'user_delete_error',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return reply.status(500).send({ error: 'Failed to delete user data' });
    }
  });
};

export default userRoute;
