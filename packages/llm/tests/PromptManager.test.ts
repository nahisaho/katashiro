/**
 * PromptManager Tests
 *
 * @design DES-KATASHIRO-003-LLM §3.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PromptManager,
  getPromptManager,
  resetPromptManager,
} from '../src/PromptManager.js';
import type { PromptTemplate } from '../src/types.js';

describe('PromptManager', () => {
  beforeEach(() => {
    resetPromptManager();
  });

  describe('registration', () => {
    it('should register template', () => {
      const manager = new PromptManager();
      const template: PromptTemplate = {
        id: 'test-1',
        name: 'Test Template',
        template: 'Hello, {{name}}!',
        variables: [{ name: 'name', type: 'string', required: true }],
      };

      manager.register(template);
      const retrieved = manager.get('test-1');

      expect(retrieved).toEqual(template);
    });

    it('should list all templates', () => {
      const manager = new PromptManager();
      manager.register({
        id: 'tmpl-1',
        name: 'Template 1',
        template: 'Template 1',
        variables: [],
      });
      manager.register({
        id: 'tmpl-2',
        name: 'Template 2',
        template: 'Template 2',
        variables: [],
      });

      const templates = manager.list();
      expect(templates).toHaveLength(2);
    });

    it('should unregister template', () => {
      const manager = new PromptManager();
      manager.register({
        id: 'to-remove',
        name: 'To Remove',
        template: 'Will be removed',
        variables: [],
      });

      expect(manager.unregister('to-remove')).toBe(true);
      expect(manager.get('to-remove')).toBeUndefined();
    });
  });

  describe('rendering', () => {
    it('should render template with variables', () => {
      const manager = new PromptManager();
      manager.register({
        id: 'greeting',
        name: 'Greeting',
        template: 'Hello, {{name}}! You are {{age}} years old.',
        variables: [
          { name: 'name', type: 'string', required: true },
          { name: 'age', type: 'number', required: true },
        ],
      });

      const result = manager.render('greeting', { name: 'Alice', age: 30 });
      expect(result).toBe('Hello, Alice! You are 30 years old.');
    });

    it('should use default values', () => {
      const manager = new PromptManager();
      manager.register({
        id: 'with-default',
        name: 'With Default',
        template: 'Language: {{lang}}',
        variables: [
          { name: 'lang', type: 'string', required: false, default: 'English' },
        ],
      });

      const result = manager.render('with-default', {});
      expect(result).toBe('Language: English');
    });

    it('should throw on missing required variable', () => {
      const manager = new PromptManager();
      manager.register({
        id: 'required-var',
        name: 'Required Var',
        template: 'Name: {{name}}',
        variables: [{ name: 'name', type: 'string', required: true }],
      });

      expect(() => manager.render('required-var', {})).toThrow('Missing required variable');
    });

    it('should throw on unknown template', () => {
      const manager = new PromptManager();
      expect(() => manager.render('unknown', {})).toThrow('Template not found');
    });

    it('should preserve unmatched placeholders', () => {
      const manager = new PromptManager();
      const result = manager.renderString('Hello, {{name}} and {{unknown}}!', { name: 'World' });
      expect(result).toBe('Hello, World and {{unknown}}!');
    });
  });

  describe('renderAsMessage', () => {
    it('should render template as message', () => {
      const manager = new PromptManager();
      manager.register({
        id: 'msg-template',
        name: 'Message Template',
        template: 'Please analyze: {{topic}}',
        variables: [{ name: 'topic', type: 'string', required: true }],
      });

      const message = manager.renderAsMessage('msg-template', { topic: 'AI trends' }, 'user');
      expect(message.role).toBe('user');
      expect(message.content).toBe('Please analyze: AI trends');
    });

    it('should default to user role', () => {
      const manager = new PromptManager();
      manager.register({
        id: 'simple',
        name: 'Simple',
        template: 'Hello',
        variables: [],
      });

      const message = manager.renderAsMessage('simple', {});
      expect(message.role).toBe('user');
    });
  });

  describe('chain', () => {
    it('should chain multiple templates', () => {
      const manager = new PromptManager();
      manager.register({
        id: 'intro',
        name: 'Intro',
        template: 'Welcome, {{name}}.',
        variables: [{ name: 'name', type: 'string', required: true }],
      });
      manager.register({
        id: 'body',
        name: 'Body',
        template: 'Your task is {{task}}.',
        variables: [{ name: 'task', type: 'string', required: true }],
      });
      manager.register({
        id: 'outro',
        name: 'Outro',
        template: 'Good luck!',
        variables: [],
      });

      const result = manager.chain(
        ['intro', 'body', 'outro'],
        { name: 'Developer', task: 'coding' }
      );

      expect(result).toBe('Welcome, Developer.\n\nYour task is coding.\n\nGood luck!');
    });

    it('should use custom separator', () => {
      const manager = new PromptManager();
      manager.register({
        id: 'a',
        name: 'A',
        template: 'Part A',
        variables: [],
      });
      manager.register({
        id: 'b',
        name: 'B',
        template: 'Part B',
        variables: [],
      });

      const result = manager.chain(['a', 'b'], {}, ' | ');
      expect(result).toBe('Part A | Part B');
    });
  });

  describe('singleton', () => {
    it('should return singleton instance', () => {
      const manager1 = getPromptManager();
      const manager2 = getPromptManager();
      expect(manager1).toBe(manager2);
    });

    it('should reset singleton', () => {
      const manager1 = getPromptManager();
      manager1.register({
        id: 'test',
        name: 'Test',
        template: 'Test',
        variables: [],
      });

      resetPromptManager();
      const manager2 = getPromptManager();

      expect(manager2.get('test')).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should clear all templates', () => {
      const manager = new PromptManager();
      manager.register({ id: '1', name: '1', template: '1', variables: [] });
      manager.register({ id: '2', name: '2', template: '2', variables: [] });

      manager.clear();
      expect(manager.list()).toHaveLength(0);
    });
  });
});
