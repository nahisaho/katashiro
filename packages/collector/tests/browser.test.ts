/**
 * Browser Automation Tests
 * REQ-COLLECT-009: ブラウザ自動化・スクレイピング機能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BrowserAutomation,
  BrowserAutomationError,
  ActionExecutor,
  ContentExtractor,
  SessionManager,
  DEFAULT_BROWSER_CONFIG,
  type BrowserConfig,
  type BrowserAction,
  type BrowserPage,
} from '../src/index.js';

// =============================================================================
// Mock Types
// =============================================================================

/**
 * Create a mock BrowserPage for testing
 */
function createMockPage(overrides: Partial<BrowserPage> = {}): BrowserPage {
  return {
    goto: vi.fn().mockResolvedValue(undefined),
    click: vi.fn().mockResolvedValue(undefined),
    type: vi.fn().mockResolvedValue(undefined),
    select: vi.fn().mockResolvedValue(['option1']),
    hover: vi.fn().mockResolvedValue(undefined),
    screenshot: vi.fn().mockResolvedValue(Buffer.from('fake-screenshot')),
    pdf: vi.fn().mockResolvedValue(Buffer.from('fake-pdf')),
    evaluate: vi.fn().mockResolvedValue('Extracted content'),
    waitForSelector: vi.fn().mockResolvedValue({}),
    $eval: vi.fn().mockResolvedValue(''),
    $$eval: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

/**
 * Create a mock Puppeteer browser
 */
function createMockBrowser(page: BrowserPage) {
  return {
    newPage: vi.fn().mockResolvedValue(page),
    close: vi.fn().mockResolvedValue(undefined),
    pages: vi.fn().mockResolvedValue([page]),
  };
}

/**
 * Create a mock Puppeteer module
 */
function createMockPuppeteer(browser: ReturnType<typeof createMockBrowser>) {
  return {
    launch: vi.fn().mockResolvedValue(browser),
  };
}

// =============================================================================
// ActionExecutor Tests
// =============================================================================

describe('ActionExecutor', () => {
  let executor: ActionExecutor;
  let mockPage: BrowserPage;

  beforeEach(() => {
    executor = new ActionExecutor();
    mockPage = createMockPage();
  });

  describe('navigate action', () => {
    it('should execute navigate action', async () => {
      const action: BrowserAction = {
        type: 'navigate',
        url: 'https://example.com',
      };

      const result = await executor.execute(mockPage, action);

      expect(result.success).toBe(true);
      expect(result.actionType).toBe('navigate');
      expect(mockPage.goto).toHaveBeenCalled();
    });

    it('should handle navigation error', async () => {
      mockPage.goto = vi.fn().mockRejectedValue(new Error('Navigation failed'));

      const action: BrowserAction = {
        type: 'navigate',
        url: 'https://invalid.url',
      };

      const result = await executor.execute(mockPage, action);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Navigation failed');
    });
  });

  describe('click action', () => {
    it('should execute click action', async () => {
      const action: BrowserAction = {
        type: 'click',
        selector: '#submit-button',
      };

      const result = await executor.execute(mockPage, action);

      expect(result.success).toBe(true);
      expect(result.actionType).toBe('click');
      expect(mockPage.click).toHaveBeenCalled();
    });
  });

  describe('type action', () => {
    it('should execute type action', async () => {
      const action: BrowserAction = {
        type: 'type',
        selector: '#username',
        text: 'testuser',
      };

      const result = await executor.execute(mockPage, action);

      expect(result.success).toBe(true);
      expect(result.actionType).toBe('type');
      expect(mockPage.type).toHaveBeenCalledWith('#username', 'testuser', expect.any(Object));
    });
  });

  describe('wait action', () => {
    it('should execute wait with duration', async () => {
      const action: BrowserAction = {
        type: 'wait',
        duration: 100,
      };

      const result = await executor.execute(mockPage, action);

      expect(result.success).toBe(true);
      expect(result.actionType).toBe('wait');
    });
  });

  describe('scroll action', () => {
    it('should execute scroll action', async () => {
      const action: BrowserAction = {
        type: 'scroll',
        options: {
          direction: 'down',
          distance: 500,
        },
      };

      const result = await executor.execute(mockPage, action);

      expect(result.success).toBe(true);
      expect(result.actionType).toBe('scroll');
    });
  });

  describe('select action', () => {
    it('should execute select action', async () => {
      const action: BrowserAction = {
        type: 'select',
        selector: '#country',
        values: ['jp'],
      };

      const result = await executor.execute(mockPage, action);

      expect(result.success).toBe(true);
      expect(mockPage.select).toHaveBeenCalledWith('#country', 'jp');
    });
  });

  describe('hover action', () => {
    it('should execute hover action', async () => {
      const action: BrowserAction = {
        type: 'hover',
        selector: '.menu-item',
      };

      const result = await executor.execute(mockPage, action);

      expect(result.success).toBe(true);
      expect(mockPage.hover).toHaveBeenCalledWith('.menu-item');
    });
  });

  describe('screenshot action', () => {
    it('should execute screenshot action', async () => {
      const action: BrowserAction = {
        type: 'screenshot',
        options: {
          fullPage: true,
          format: 'png',
        },
      };

      const result = await executor.execute(mockPage, action);

      expect(result.success).toBe(true);
      expect(result.screenshot).toBeInstanceOf(Buffer);
      expect(mockPage.screenshot).toHaveBeenCalled();
    });
  });

  describe('pdf action', () => {
    it('should execute pdf action', async () => {
      const action: BrowserAction = {
        type: 'pdf',
        options: {
          format: 'A4',
          printBackground: true,
        },
      };

      const result = await executor.execute(mockPage, action);

      expect(result.success).toBe(true);
      expect(result.pdf).toBeInstanceOf(Buffer);
      expect(mockPage.pdf).toHaveBeenCalled();
    });
  });

  describe('evaluate action', () => {
    it('should execute evaluate action', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue({ count: 42 });

      const action: BrowserAction = {
        type: 'evaluate',
        script: '() => ({ count: document.querySelectorAll("a").length })',
      };

      const result = await executor.execute(mockPage, action);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ count: 42 });
    });

    it('should handle evaluate error', async () => {
      mockPage.evaluate = vi.fn().mockRejectedValue(new Error('Script error'));

      const action: BrowserAction = {
        type: 'evaluate',
        script: '() => { throw new Error("test"); }',
      };

      const result = await executor.execute(mockPage, action);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Script error');
    });
  });

  describe('waitForSelector action', () => {
    it('should execute waitForSelector action', async () => {
      const action: BrowserAction = {
        type: 'waitForSelector',
        selector: '.loaded',
        options: {
          visible: true,
          timeout: 10000,
        },
      };

      const result = await executor.execute(mockPage, action);

      expect(result.success).toBe(true);
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('.loaded', {
        visible: true,
        timeout: 10000,
      });
    });
  });

  describe('extract action', () => {
    it('should execute extract action', async () => {
      mockPage.$eval = vi.fn().mockResolvedValue('Extracted text');

      const action: BrowserAction = {
        type: 'extract',
        selector: '.article-content',
      };

      const result = await executor.execute(mockPage, action);

      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// ContentExtractor Tests
// =============================================================================

describe('ContentExtractor', () => {
  let extractor: ContentExtractor;
  let mockPage: BrowserPage;

  beforeEach(() => {
    extractor = new ContentExtractor();
    mockPage = createMockPage();
  });

  describe('extractMainContent', () => {
    it('should extract main text content', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue('Main content text');

      const content = await extractor.extractMainContent(mockPage);

      expect(content).toBe('Main content text');
    });
  });

  describe('extractText', () => {
    it('should extract text from selector', async () => {
      mockPage.$eval = vi.fn().mockResolvedValue('Button text');

      const text = await extractor.extractText(mockPage, '.button');

      expect(text).toBe('Button text');
    });
  });

  describe('extractAttribute', () => {
    it('should extract attribute from element', async () => {
      mockPage.$eval = vi.fn().mockResolvedValue('https://example.com');

      const href = await extractor.extractAttribute(mockPage, 'a', 'href');

      expect(href).toBe('https://example.com');
    });
  });

  describe('extractAllText', () => {
    it('should extract all text from multiple elements', async () => {
      mockPage.$$eval = vi.fn().mockResolvedValue(['Item 1', 'Item 2', 'Item 3']);

      const texts = await extractor.extractAllText(mockPage, '.items li');

      expect(texts).toEqual(['Item 1', 'Item 2', 'Item 3']);
    });
  });
});

// =============================================================================
// SessionManager Tests
// =============================================================================

describe('SessionManager', () => {
  let manager: SessionManager;
  let mockPage: BrowserPage & { cookies: () => Promise<any[]>; setCookie: (...cookies: any[]) => Promise<void> };

  beforeEach(() => {
    manager = new SessionManager();
    mockPage = {
      ...createMockPage(),
      cookies: vi.fn().mockResolvedValue([{ name: 'test', value: 'value' }]),
      setCookie: vi.fn().mockResolvedValue(undefined),
    } as any;
  });

  describe('save and load', () => {
    it('should save session from page', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue({
        localStorage: {},
        sessionStorage: {},
      });

      const session = await manager.save(mockPage, 'test-session');

      expect(session.id).toContain('test-session');
      expect(manager.has('test-session')).toBe(true);
    });

    it('should load session to page', async () => {
      // First save
      mockPage.evaluate = vi.fn().mockResolvedValue({
        localStorage: {},
        sessionStorage: {},
      });
      await manager.save(mockPage, 'load-session');

      // Then load
      await manager.load(mockPage, 'load-session');

      expect(mockPage.setCookie).toHaveBeenCalled();
    });

    it('should throw error for non-existent session', async () => {
      await expect(manager.load(mockPage, 'non-existent')).rejects.toThrow('Session not found');
    });
  });

  describe('delete', () => {
    it('should delete existing session', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue({ localStorage: {}, sessionStorage: {} });
      await manager.save(mockPage, 'to-delete');

      const deleted = manager.delete('to-delete');

      expect(deleted).toBe(true);
      expect(manager.has('to-delete')).toBe(false);
    });

    it('should return false for non-existent session', () => {
      const deleted = manager.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('list', () => {
    it('should list all session names', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue({ localStorage: {}, sessionStorage: {} });
      await manager.save(mockPage, 'session-a');
      await manager.save(mockPage, 'session-b');

      const sessions = manager.list();

      expect(sessions).toContain('session-a');
      expect(sessions).toContain('session-b');
    });

    it('should return empty array when no sessions', () => {
      const sessions = manager.list();
      expect(sessions).toEqual([]);
    });
  });

  describe('has', () => {
    it('should return true for existing session', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue({ localStorage: {}, sessionStorage: {} });
      await manager.save(mockPage, 'exists');

      expect(manager.has('exists')).toBe(true);
    });

    it('should return false for non-existent session', () => {
      expect(manager.has('not-exists')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all sessions', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue({ localStorage: {}, sessionStorage: {} });
      await manager.save(mockPage, 'session-1');
      await manager.save(mockPage, 'session-2');

      manager.clear();

      expect(manager.list()).toEqual([]);
    });
  });

  describe('export and import', () => {
    it('should export session to JSON', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue({ localStorage: { key: 'value' }, sessionStorage: {} });
      await manager.save(mockPage, 'export-test');

      const exported = manager.export('export-test');
      const parsed = JSON.parse(exported);

      expect(parsed.id).toContain('export-test');
    });

    it('should import session from JSON', () => {
      const sessionData = JSON.stringify({
        id: 'imported-session',
        cookies: [],
        localStorage: {},
        sessionStorage: {},
      });

      manager.import('imported', sessionData);

      expect(manager.has('imported')).toBe(true);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => manager.import('bad', 'invalid json')).toThrow();
    });
  });
});

// =============================================================================
// BrowserAutomation Tests
// =============================================================================

describe('BrowserAutomation', () => {
  let automation: BrowserAutomation;
  let mockPage: BrowserPage & Record<string, any>;
  let mockBrowser: ReturnType<typeof createMockBrowser>;
  let mockPuppeteer: ReturnType<typeof createMockPuppeteer>;

  beforeEach(() => {
    mockPage = {
      ...createMockPage(),
      setViewport: vi.fn().mockResolvedValue(undefined),
      setUserAgent: vi.fn().mockResolvedValue(undefined),
      setJavaScriptEnabled: vi.fn().mockResolvedValue(undefined),
      setRequestInterception: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      url: vi.fn().mockReturnValue('https://example.com'),
      title: vi.fn().mockResolvedValue('Test Page'),
      content: vi.fn().mockResolvedValue('<html><body>Test</body></html>'),
      close: vi.fn().mockResolvedValue(undefined),
      cookies: vi.fn().mockResolvedValue([]),
      setCookie: vi.fn().mockResolvedValue(undefined),
    };
    mockBrowser = createMockBrowser(mockPage as any);
    mockPuppeteer = createMockPuppeteer(mockBrowser);

    automation = new BrowserAutomation();
    automation.setPuppeteer(mockPuppeteer as any);
  });

  describe('initialization', () => {
    it('should initialize browser', async () => {
      await automation.initialize();

      expect(automation.isInitialized()).toBe(true);
      expect(mockPuppeteer.launch).toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      await automation.initialize();
      await automation.initialize();

      expect(mockPuppeteer.launch).toHaveBeenCalledTimes(1);
    });
  });

  describe('close', () => {
    it('should close browser', async () => {
      await automation.initialize();
      await automation.close();

      expect(automation.isInitialized()).toBe(false);
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle close when not initialized', async () => {
      await expect(automation.close()).resolves.not.toThrow();
    });
  });
});

// =============================================================================
// DEFAULT_BROWSER_CONFIG Tests
// =============================================================================

describe('DEFAULT_BROWSER_CONFIG', () => {
  it('should have default values', () => {
    expect(DEFAULT_BROWSER_CONFIG).toBeDefined();
    expect(DEFAULT_BROWSER_CONFIG.headless).toBe(true);
    expect(DEFAULT_BROWSER_CONFIG.timeout).toBe(30000);
    expect(DEFAULT_BROWSER_CONFIG.viewport).toBeDefined();
    // Viewport values from actual implementation
    expect(DEFAULT_BROWSER_CONFIG.viewport?.width).toBe(1920);
    expect(DEFAULT_BROWSER_CONFIG.viewport?.height).toBe(1080);
  });
});

// =============================================================================
// BrowserAutomationError Tests
// =============================================================================

describe('BrowserAutomationError', () => {
  it('should create error with code and message', () => {
    const error = new BrowserAutomationError('BROWSER_NOT_INITIALIZED', 'Test error');

    expect(error.code).toBe('BROWSER_NOT_INITIALIZED');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('BrowserAutomationError');
  });

  it('should include cause if provided', () => {
    const cause = new Error('Original error');
    const error = new BrowserAutomationError('NAVIGATION_FAILED', 'Wrapped error', cause);

    expect(error.cause).toBe(cause);
  });
});
