/**
 * ResourceManager テスト
 *
 * @task TSK-063
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResourceManager } from '../../src/resources/resource-manager.js';
import { isOk } from '@nahisaho/katashiro-core';

describe('ResourceManager', () => {
  let manager: ResourceManager;

  beforeEach(() => {
    manager = new ResourceManager();
  });

  describe('registration', () => {
    it('should register a resource', () => {
      const result = manager.register({
        uri: 'katashiro://test/resource',
        name: 'Test Resource',
        description: 'A test resource',
        mimeType: 'application/json',
      });

      expect(isOk(result)).toBe(true);
    });

    it('should register resource with content provider', () => {
      const result = manager.register({
        uri: 'katashiro://dynamic/data',
        name: 'Dynamic Data',
        provider: async () => ({ content: 'Dynamic content' }),
      });

      expect(isOk(result)).toBe(true);
    });

    it('should reject duplicate URI', () => {
      manager.register({
        uri: 'katashiro://test',
        name: 'First',
      });

      const result = manager.register({
        uri: 'katashiro://test',
        name: 'Second',
      });

      expect(isOk(result)).toBe(false);
    });
  });

  describe('listing', () => {
    it('should list all resources', () => {
      manager.register({ uri: 'katashiro://a', name: 'A' });
      manager.register({ uri: 'katashiro://b', name: 'B' });

      const result = manager.list();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toHaveLength(2);
      }
    });

    it('should filter by prefix', () => {
      manager.register({ uri: 'katashiro://data/one', name: 'One' });
      manager.register({ uri: 'katashiro://data/two', name: 'Two' });
      manager.register({ uri: 'katashiro://other/three', name: 'Three' });

      const result = manager.list({ prefix: 'katashiro://data/' });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toHaveLength(2);
      }
    });
  });

  describe('reading', () => {
    it('should read static content', async () => {
      manager.register({
        uri: 'katashiro://static',
        name: 'Static',
        content: 'Static content here',
      });

      const result = await manager.read('katashiro://static');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.content).toBe('Static content here');
      }
    });

    it('should read dynamic content from provider', async () => {
      manager.register({
        uri: 'katashiro://dynamic',
        name: 'Dynamic',
        provider: async () => ({ content: 'Generated content' }),
      });

      const result = await manager.read('katashiro://dynamic');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.content).toBe('Generated content');
      }
    });

    it('should return error for unknown resource', async () => {
      const result = await manager.read('katashiro://unknown');
      expect(isOk(result)).toBe(false);
    });
  });

  describe('subscriptions', () => {
    it('should subscribe to resource changes', () => {
      manager.register({ uri: 'katashiro://watched', name: 'Watched' });

      const result = manager.subscribe('katashiro://watched', () => {});
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeDefined(); // subscription id
      }
    });

    it('should unsubscribe', () => {
      manager.register({ uri: 'katashiro://watched', name: 'Watched' });
      const subResult = manager.subscribe('katashiro://watched', () => {});

      if (isOk(subResult)) {
        const result = manager.unsubscribe(subResult.value);
        expect(isOk(result)).toBe(true);
      }
    });

    it('should notify subscribers on update', async () => {
      let notified = false;
      manager.register({
        uri: 'katashiro://notify-test',
        name: 'Notify Test',
        content: 'Initial',
      });

      manager.subscribe('katashiro://notify-test', () => {
        notified = true;
      });

      await manager.update('katashiro://notify-test', 'Updated');
      expect(notified).toBe(true);
    });
  });

  describe('templates', () => {
    it('should list resource templates', () => {
      const result = manager.listTemplates();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(Array.isArray(result.value)).toBe(true);
      }
    });
  });
});
