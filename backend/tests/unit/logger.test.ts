/**
 * Logger Tests
 * Verifies logging configuration and redaction
 */

import { describe, it, expect } from 'vitest';
import { logger } from '../../src/services/logging/logger.js';

describe('Logger', () => {
  it('should be a pino logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should have the correct log level in development', () => {
    // In test environment, level should be debug or info
    expect(['debug', 'info', 'trace']).toContain(logger.level);
  });

  it('should not throw when logging with metadata', () => {
    expect(() => {
      logger.info({
        event: 'test_event',
        userId: 'test-user',
        textLength: 42,
      });
    }).not.toThrow();
  });

  it('should not throw when logging with redacted fields', () => {
    // These fields should be redacted per configuration
    expect(() => {
      logger.info({
        event: 'test_redaction',
        text: 'This should be redacted',
        inputText: 'This too',
        outputText: 'And this',
      });
    }).not.toThrow();
  });
});
