/**
 * ログ機構 単体テスト
 *
 * @requirement REQ-DR-U-002 - ログ機構
 * @design DES-KATASHIRO-005-DR-LOG
 * @task TASK-010〜015
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  StructuredLogger,
  ConsoleTransport,
  MemoryTransport,
  SensitiveDataMasker,
  LOG_LEVEL_PRIORITY,
  DEFAULT_MASKING_PATTERNS,
  getLogger,
  setLogger,
  type LogEntry,
} from '../../src/logging/index.js';

describe('LogLevel', () => {
  it('should have correct priority order', () => {
    expect(LOG_LEVEL_PRIORITY.debug).toBeLessThan(LOG_LEVEL_PRIORITY.info);
    expect(LOG_LEVEL_PRIORITY.info).toBeLessThan(LOG_LEVEL_PRIORITY.warn);
    expect(LOG_LEVEL_PRIORITY.warn).toBeLessThan(LOG_LEVEL_PRIORITY.error);
  });
});

describe('SensitiveDataMasker', () => {
  let masker: SensitiveDataMasker;

  beforeEach(() => {
    masker = new SensitiveDataMasker();
  });

  describe('mask', () => {
    it('should mask API keys in key-value format', () => {
      const input = 'api_key="sk-1234567890abcdef"';
      const masked = masker.mask(input);
      expect(masked).toContain('[MASKED]');
    });

    it('should mask Bearer tokens', () => {
      const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const masked = masker.mask(input);
      expect(masked).toContain('Bearer [MASKED]');
    });

    it('should mask email addresses', () => {
      const input = 'Contact: user@example.com';
      const masked = masker.mask(input);
      expect(masked).toContain('[EMAIL]@example.com');
      expect(masked).not.toContain('user@');
    });

    it('should mask credit card numbers', () => {
      const input = 'Card: 4111-1111-1111-1111';
      const masked = masker.mask(input);
      expect(masked).toContain('4111-****-****-1111');
    });

    it('should mask IP addresses', () => {
      const input = 'IP: 192.168.1.100';
      const masked = masker.mask(input);
      expect(masked).toContain('192.168.xxx.xxx');
    });

    it('should mask Japanese phone numbers', () => {
      const input = 'Tel: 03-1234-5678';
      const masked = masker.mask(input);
      expect(masked).toContain('03-****-5678');
    });
  });

  describe('maskObject', () => {
    it('should mask sensitive keys', () => {
      const obj = {
        username: 'john',
        password: 'secret123',
        data: 'public',
      };
      const masked = masker.maskObject(obj);
      expect(masked.username).toBe('john');
      expect(masked.password).toBe('[MASKED]');
      expect(masked.data).toBe('public');
    });

    it('should recursively mask nested objects', () => {
      const obj = {
        user: {
          name: 'John',
          config: {
            setting: 'Bearer token12345',
          },
        },
      };
      const masked = masker.maskObject(obj);
      // Bearer tokenパターンにマッチするのでマスクされる
      expect((masked.user as { config: { setting: string } }).config.setting).toContain('[MASKED]');
    });

    it('should mask arrays', () => {
      const arr = ['normal', 'api_key: secret123', 'test'];
      const masked = masker.maskObject(arr);
      expect(masked[0]).toBe('normal');
      expect(masked[1]).toContain('[MASKED]');
      expect(masked[2]).toBe('test');
    });

    it('should handle null and undefined', () => {
      expect(masker.maskObject(null)).toBeNull();
      expect(masker.maskObject(undefined)).toBeUndefined();
    });
  });

  describe('maskUrl', () => {
    it('should mask sensitive query parameters', () => {
      const url = 'https://api.example.com?key=secret123&name=test';
      const masked = masker.maskUrl(url);
      expect(masked).toContain('key=%5BMASKED%5D');
      expect(masked).toContain('name=test');
    });

    it('should mask user credentials in URL', () => {
      const url = 'https://user:password@example.com/path';
      const masked = masker.maskUrl(url);
      expect(masked).not.toContain('password');
    });

    it('should handle invalid URLs gracefully', () => {
      const input = 'not a valid url with api_key: secret';
      const masked = masker.maskUrl(input);
      expect(masked).toContain('[MASKED]');
    });
  });

  describe('maskHeaders', () => {
    it('should mask Authorization header', () => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token123',
      };
      const masked = masker.maskHeaders(headers);
      expect(masked['Content-Type']).toBe('application/json');
      expect(masked['Authorization']).toBe('[MASKED]');
    });

    it('should mask X-API-Key header', () => {
      const headers = {
        'X-API-Key': 'secret-key-123',
      };
      const masked = masker.maskHeaders(headers);
      expect(masked['X-API-Key']).toBe('[MASKED]');
    });
  });

  describe('maskError', () => {
    it('should mask error message', () => {
      const error = new Error('Failed to authenticate with api_key: sk-12345');
      const masked = masker.maskError(error);
      expect(masked.message).toContain('[MASKED]');
      expect(masked.name).toBe('Error');
    });
  });

  describe('addPattern', () => {
    it('should add custom masking pattern', () => {
      masker.addPattern({
        name: 'custom',
        pattern: /SECRET_\w+/g,
        replacement: '[CUSTOM_MASKED]',
      });

      const input = 'Value: SECRET_ABC123';
      const masked = masker.mask(input);
      expect(masked).toContain('[CUSTOM_MASKED]');
    });
  });
});

describe('ConsoleTransport', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should write entry to console', () => {
    const transport = new ConsoleTransport('json');
    const entry: LogEntry = {
      level: 'info',
      message: 'Test message',
      timestamp: new Date(),
      component: 'test',
    };

    transport.write(entry);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should format as JSON', () => {
    const transport = new ConsoleTransport('json');
    const entry: LogEntry = {
      level: 'info',
      message: 'Test',
      timestamp: new Date('2024-01-01T00:00:00Z'),
      component: 'test',
    };

    transport.write(entry);
    const output = consoleSpy.mock.calls[0]?.[0];
    expect(output).toContain('"level":"info"');
  });

  it('should format as text', () => {
    const transport = new ConsoleTransport('text');
    const entry: LogEntry = {
      level: 'info',
      message: 'Test message',
      timestamp: new Date('2024-01-01T00:00:00Z'),
      component: 'test',
    };

    transport.write(entry);
    const output = consoleSpy.mock.calls[0]?.[0];
    expect(output).toContain('[INFO]');
    expect(output).toContain('test:');
  });
});

describe('MemoryTransport', () => {
  it('should store entries in memory', () => {
    const transport = new MemoryTransport();
    const entry: LogEntry = {
      level: 'info',
      message: 'Test',
      timestamp: new Date(),
      component: 'test',
    };

    transport.write(entry);
    expect(transport.getEntries()).toHaveLength(1);
  });

  it('should filter by level', () => {
    const transport = new MemoryTransport();

    transport.write({ level: 'info', message: 'Info', timestamp: new Date(), component: 'test' });
    transport.write({ level: 'error', message: 'Error', timestamp: new Date(), component: 'test' });
    transport.write({ level: 'info', message: 'Info2', timestamp: new Date(), component: 'test' });

    expect(transport.getEntriesByLevel('info')).toHaveLength(2);
    expect(transport.getEntriesByLevel('error')).toHaveLength(1);
  });

  it('should respect maxEntries limit', () => {
    const transport = new MemoryTransport(3);

    for (let i = 0; i < 5; i++) {
      transport.write({ level: 'info', message: `Msg ${i}`, timestamp: new Date(), component: 'test' });
    }

    expect(transport.getEntries()).toHaveLength(3);
    expect(transport.getEntries()[0]?.message).toBe('Msg 2');
  });

  it('should clear entries', () => {
    const transport = new MemoryTransport();
    transport.write({ level: 'info', message: 'Test', timestamp: new Date(), component: 'test' });
    transport.clear();
    expect(transport.getEntries()).toHaveLength(0);
  });

  it('should get last entry', () => {
    const transport = new MemoryTransport();
    transport.write({ level: 'info', message: 'First', timestamp: new Date(), component: 'test' });
    transport.write({ level: 'info', message: 'Last', timestamp: new Date(), component: 'test' });
    expect(transport.getLastEntry()?.message).toBe('Last');
  });
});

describe('StructuredLogger', () => {
  let memory: MemoryTransport;
  let logger: StructuredLogger;

  beforeEach(() => {
    memory = new MemoryTransport();
    logger = new StructuredLogger({
      component: 'test',
      level: 'debug',
      transports: [memory],
    });
  });

  describe('basic logging', () => {
    it('should log debug messages', () => {
      logger.debug('Debug message');
      expect(memory.getLastEntry()?.level).toBe('debug');
      expect(memory.getLastEntry()?.message).toBe('Debug message');
    });

    it('should log info messages', () => {
      logger.info('Info message');
      expect(memory.getLastEntry()?.level).toBe('info');
    });

    it('should log warn messages', () => {
      logger.warn('Warning message');
      expect(memory.getLastEntry()?.level).toBe('warn');
    });

    it('should log error messages', () => {
      logger.error('Error message');
      expect(memory.getLastEntry()?.level).toBe('error');
    });

    it('should include context', () => {
      logger.info('With context', { key: 'value' });
      expect(memory.getLastEntry()?.context).toEqual({ key: 'value' });
    });

    it('should include error details', () => {
      const error = new Error('Test error');
      logger.error('Failed', undefined, error);
      expect(memory.getLastEntry()?.error?.name).toBe('Error');
      expect(memory.getLastEntry()?.error?.message).toBe('Test error');
    });
  });

  describe('log level filtering', () => {
    it('should filter logs below configured level', () => {
      const warnLogger = new StructuredLogger({
        component: 'test',
        level: 'warn',
        transports: [memory],
      });

      warnLogger.debug('Debug');
      warnLogger.info('Info');
      warnLogger.warn('Warn');
      warnLogger.error('Error');

      const entries = memory.getEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0]?.level).toBe('warn');
      expect(entries[1]?.level).toBe('error');
    });
  });

  describe('request ID', () => {
    it('should include request ID when set', () => {
      logger.setRequestId('req-123');
      logger.info('Test');
      expect(memory.getLastEntry()?.requestId).toBe('req-123');
    });
  });

  describe('child logger', () => {
    it('should create child with extended component name', () => {
      const child = logger.child('subcomponent');
      child.info('Child message');
      expect(memory.getLastEntry()?.component).toBe('test:subcomponent');
    });

    it('should inherit request ID', () => {
      logger.setRequestId('req-456');
      const child = logger.child('sub');
      child.info('Test');
      expect(memory.getLastEntry()?.requestId).toBe('req-456');
    });
  });

  describe('startOperation', () => {
    it('should log start and completion', () => {
      const endOp = logger.startOperation('fetchData', { url: 'https://example.com' });
      endOp();

      const entries = memory.getEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0]?.message).toContain('Starting fetchData');
      expect(entries[1]?.message).toContain('Completed fetchData');
      expect(entries[1]?.context?.durationMs).toBeDefined();
    });
  });

  describe('logRetry', () => {
    it('should log retry information', () => {
      logger.logRetry('Retrying request', { attempt: 2, maxRetries: 3, delayMs: 2000 });

      const entry = memory.getLastEntry();
      expect(entry?.level).toBe('warn');
      expect(entry?.retry?.attempt).toBe(2);
      expect(entry?.retry?.maxRetries).toBe(3);
      expect(entry?.retry?.delayMs).toBe(2000);
    });
  });

  describe('logHttp', () => {
    it('should log HTTP success', () => {
      logger.logHttp('Request completed', { url: 'https://example.com', statusCode: 200, durationMs: 150 });

      const entry = memory.getLastEntry();
      expect(entry?.level).toBe('info');
      expect(entry?.url).toContain('example.com');
      expect(entry?.statusCode).toBe(200);
      expect(entry?.durationMs).toBe(150);
    });

    it('should log HTTP error as error level', () => {
      logger.logHttp('Request failed', { url: 'https://example.com', statusCode: 500 });

      const entry = memory.getLastEntry();
      expect(entry?.level).toBe('error');
      expect(entry?.statusCode).toBe(500);
    });

    it('should mask sensitive URL parameters', () => {
      logger.logHttp('Request', { url: 'https://api.example.com?api_key=secret123' });

      const entry = memory.getLastEntry();
      expect(entry?.url).not.toContain('secret123');
    });
  });

  describe('sensitive data masking', () => {
    it('should mask sensitive data in messages', () => {
      logger.info('Authorization: Bearer token12345');

      const entry = memory.getLastEntry();
      expect(entry?.message).toContain('[MASKED]');
      expect(entry?.message).not.toContain('token12345');
    });

    it('should mask sensitive data in context', () => {
      logger.info('Test', { password: 'secret' });

      const entry = memory.getLastEntry();
      expect(entry?.context?.password).toBe('[MASKED]');
    });
  });
});

describe('Global Logger', () => {
  it('should return default logger', () => {
    const logger = getLogger();
    expect(logger).toBeInstanceOf(StructuredLogger);
  });

  it('should return child logger for component', () => {
    const logger = getLogger('MyComponent');
    expect(logger).toBeInstanceOf(StructuredLogger);
  });

  it('should allow setting custom logger', () => {
    const memory = new MemoryTransport();
    const customLogger = new StructuredLogger({
      component: 'custom',
      transports: [memory],
    });

    setLogger(customLogger);
    const logger = getLogger();

    logger.info('Test');
    expect(memory.getEntries()).toHaveLength(1);
  });
});

describe('DEFAULT_MASKING_PATTERNS', () => {
  it('should have common patterns defined', () => {
    const patternNames = DEFAULT_MASKING_PATTERNS.map((p) => p.name);
    expect(patternNames).toContain('api_key');
    expect(patternNames).toContain('bearer_token');
    expect(patternNames).toContain('email');
    expect(patternNames).toContain('credit_card');
    expect(patternNames).toContain('ip_address');
  });
});
