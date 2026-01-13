/**
 * BrowserOperator テスト
 *
 * REQ-008準拠のBrowserOperatorテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserOperator } from '../src/browser/BrowserOperator.js';
import type { BrowserAction, BrowserObservation } from '../src/browser/BrowserOperator.js';

// モックのBrowserAutomation
const mockScrapeResult = {
  url: 'https://example.com',
  title: 'Example Domain',
  content: 'This is example content',
  html: '<html>...</html>',
  links: [],
  images: [],
  metadata: {},
};

const mockActionResult = {
  actionType: 'click',
  success: true,
  data: null,
  duration: 100,
};

const mockScreenshot = Buffer.from('fake-screenshot-data');

// BrowserAutomationのモック
vi.mock('../src/browser/BrowserAutomation.js', () => ({
  BrowserAutomation: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    isInitialized: vi.fn().mockReturnValue(true),
    scrape: vi.fn().mockResolvedValue({ type: 'ok', value: mockScrapeResult }),
    executeAction: vi.fn().mockResolvedValue({ type: 'ok', value: mockActionResult }),
    screenshot: vi.fn().mockResolvedValue({ type: 'ok', value: mockScreenshot }),
    setPuppeteer: vi.fn(),
  })),
  BrowserAutomationError: class extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
}));

describe('BrowserOperator', () => {
  let operator: BrowserOperator;

  beforeEach(() => {
    operator = new BrowserOperator({ headless: true });
  });

  afterEach(async () => {
    await operator.close();
    vi.clearAllMocks();
  });

  describe('lifecycle', () => {
    it('should initialize with default options', () => {
      expect(operator).toBeInstanceOf(BrowserOperator);
      expect(operator.isLaunched()).toBe(false);
    });

    it('should launch successfully', async () => {
      await operator.launch();
      expect(operator.isLaunched()).toBe(true);
    });

    it('should not re-launch if already launched', async () => {
      await operator.launch();
      await operator.launch();
      expect(operator.isLaunched()).toBe(true);
    });

    it('should close successfully', async () => {
      await operator.launch();
      await operator.close();
      expect(operator.isLaunched()).toBe(false);
    });

    it('should emit lifecycle events', async () => {
      const events: string[] = [];
      operator.on('launching', () => events.push('launching'));
      operator.on('launched', () => events.push('launched'));
      operator.on('closing', () => events.push('closing'));
      operator.on('closed', () => events.push('closed'));

      await operator.launch();
      await operator.close();

      expect(events).toEqual(['launching', 'launched', 'closing', 'closed']);
    });
  });

  describe('execute - not launched', () => {
    it('should return error if not launched', async () => {
      const result = await operator.execute({ type: 'goto', value: 'https://example.com' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not launched');
    });
  });

  describe('execute - goto (REQ-008-02)', () => {
    beforeEach(async () => {
      await operator.launch();
    });

    it('should navigate to URL', async () => {
      const result = await operator.execute({
        type: 'goto',
        value: 'https://example.com',
      });

      expect(result.success).toBe(true);
      expect(result.actionType).toBe('goto');
      expect(result.data).toHaveProperty('url');
      expect(operator.getCurrentUrl()).toBe('https://example.com');
    });

    it('should return error if URL is not provided', async () => {
      const result = await operator.execute({ type: 'goto' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('URL is required');
    });
  });

  describe('execute - click (REQ-008-03)', () => {
    beforeEach(async () => {
      await operator.launch();
      await operator.execute({ type: 'goto', value: 'https://example.com' });
    });

    it('should click element', async () => {
      const result = await operator.execute({
        type: 'click',
        selector: '#submit',
      });

      expect(result.success).toBe(true);
      expect(result.actionType).toBe('click');
    });

    it('should return error if selector is not provided', async () => {
      const result = await operator.execute({ type: 'click' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Selector is required');
    });

    it('should return error if no page loaded', async () => {
      const freshOperator = new BrowserOperator();
      await freshOperator.launch();
      // getCurrentUrl will be null because we mock scrape but not set currentUrl in constructor
      // Re-test with proper setup
      const result = await freshOperator.execute({ type: 'click', selector: '#btn' });
      // This will fail because currentUrl is null
      expect(result.success).toBe(false);
      await freshOperator.close();
    });
  });

  describe('execute - type (REQ-008-03)', () => {
    beforeEach(async () => {
      await operator.launch();
      await operator.execute({ type: 'goto', value: 'https://example.com' });
    });

    it('should type text into element', async () => {
      const result = await operator.execute({
        type: 'type',
        selector: '#input',
        value: 'test text',
      });

      expect(result.success).toBe(true);
      expect(result.actionType).toBe('type');
    });

    it('should return error if selector is not provided', async () => {
      const result = await operator.execute({ type: 'type', value: 'text' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Selector is required');
    });

    it('should return error if value is not provided', async () => {
      const result = await operator.execute({ type: 'type', selector: '#input' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Value is required');
    });
  });

  describe('execute - scroll (REQ-008-03)', () => {
    beforeEach(async () => {
      await operator.launch();
      await operator.execute({ type: 'goto', value: 'https://example.com' });
    });

    it('should scroll page', async () => {
      const result = await operator.execute({
        type: 'scroll',
        options: { target: { x: 0, y: 500 } },
      });

      expect(result.success).toBe(true);
      expect(result.actionType).toBe('scroll');
    });
  });

  describe('execute - wait (REQ-008-03)', () => {
    beforeEach(async () => {
      await operator.launch();
    });

    it('should wait for specified duration', async () => {
      const start = Date.now();
      const result = await operator.execute({
        type: 'wait',
        options: { duration: 100 },
      });
      const elapsed = Date.now() - start;

      expect(result.success).toBe(true);
      expect(result.actionType).toBe('wait');
      expect(elapsed).toBeGreaterThanOrEqual(90);
    });

    it('should use default duration if not specified', async () => {
      const result = await operator.execute({ type: 'wait' });
      expect(result.success).toBe(true);
    });
  });

  describe('execute - screenshot (REQ-008-04)', () => {
    beforeEach(async () => {
      await operator.launch();
      await operator.execute({ type: 'goto', value: 'https://example.com' });
    });

    it('should capture screenshot', async () => {
      const result = await operator.execute({ type: 'screenshot' });

      expect(result.success).toBe(true);
      expect(result.actionType).toBe('screenshot');
      expect(result.screenshot).toBeInstanceOf(Buffer);
    });

    it('should accept screenshot options', async () => {
      const result = await operator.execute({
        type: 'screenshot',
        options: { fullPage: false, type: 'jpeg' },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('execute - evaluate (REQ-008-05)', () => {
    beforeEach(async () => {
      await operator.launch();
      await operator.execute({ type: 'goto', value: 'https://example.com' });
    });

    it('should execute JavaScript', async () => {
      const result = await operator.execute({
        type: 'evaluate',
        value: 'return document.title',
      });

      expect(result.success).toBe(true);
      expect(result.actionType).toBe('evaluate');
    });

    it('should return error if script is not provided', async () => {
      const result = await operator.execute({ type: 'evaluate' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Script is required');
    });
  });

  describe('execute - waitForSelector', () => {
    beforeEach(async () => {
      await operator.launch();
      await operator.execute({ type: 'goto', value: 'https://example.com' });
    });

    it('should wait for selector', async () => {
      const result = await operator.execute({
        type: 'waitForSelector',
        selector: '#content',
      });

      expect(result.success).toBe(true);
      expect(result.actionType).toBe('waitForSelector');
    });

    it('should return error if selector is not provided', async () => {
      const result = await operator.execute({ type: 'waitForSelector' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Selector is required');
    });
  });

  describe('element not found error (REQ-008-06)', () => {
    it('should return error with selector details when element not found', async () => {
      await operator.launch();
      await operator.execute({ type: 'goto', value: 'https://example.com' });

      // Mock executeAction to return error with _tag format
      const mockAutomation = (operator as any).automation;
      mockAutomation.executeAction = vi.fn().mockResolvedValue({
        _tag: 'Err',
        error: { message: 'Element not found' },
        isOk: () => false,
        isErr: () => true,
      });

      const result = await operator.execute({
        type: 'click',
        selector: '#non-existent',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('#non-existent');
      expect(result.error).toContain('Element not found');
    });
  });

  describe('executeSequence', () => {
    beforeEach(async () => {
      await operator.launch();
    });

    it('should execute multiple actions in sequence', async () => {
      const actions: BrowserAction[] = [
        { type: 'goto', value: 'https://example.com' },
        { type: 'wait', options: { duration: 50 } },
      ];

      const results = await operator.executeSequence(actions);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should stop on first error', async () => {
      const actions: BrowserAction[] = [
        { type: 'click' }, // Will fail - no selector
        { type: 'wait', options: { duration: 50 } },
      ];

      const results = await operator.executeSequence(actions);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });
  });

  describe('action events', () => {
    beforeEach(async () => {
      await operator.launch();
    });

    it('should emit action events', async () => {
      const events: string[] = [];
      operator.on('action:start', () => events.push('start'));
      operator.on('action:complete', () => events.push('complete'));

      await operator.execute({ type: 'goto', value: 'https://example.com' });

      expect(events).toContain('start');
      expect(events).toContain('complete');
    });
  });
});
