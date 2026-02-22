/**
 * V1 API Routes Index
 */

import { FastifyPluginAsync } from 'fastify';
import paraphraseRoute from './paraphrase.js';
import checkRoute from './check.js';
import userRoute from './user.js';
import subscriptionRoute from './subscription.js';
import webhooksRoute from './webhooks.js';

const v1Routes: FastifyPluginAsync = async (fastify) => {
  fastify.register(paraphraseRoute);
  fastify.register(checkRoute);
  fastify.register(userRoute);
  fastify.register(subscriptionRoute);
  fastify.register(webhooksRoute);
};

export default v1Routes;
