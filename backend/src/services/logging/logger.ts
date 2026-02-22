/**
 * Pino Logger Configuration
 * Structured logging - NO RAW TEXT, only metadata
 */

import pino from 'pino';
import config from '../../config.js';

const isDevelopment = config.nodeEnv === 'development';

export const logger = pino({
  level: isDevelopment ? 'debug' : 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    // NEVER log raw text content
    paths: [
      'text',
      'inputText',
      'outputText',
      'content',
      'message.content',
      'req.body.text',
      'req.body.content',
      'request.body.text',
      'request.body.content',
      'body.text',
      'body.content',
    ],
    censor: '[REDACTED]',
  },
});

export default logger;
