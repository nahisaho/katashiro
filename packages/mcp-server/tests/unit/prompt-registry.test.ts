/**
 * PromptRegistry テスト
 *
 * @task TSK-062
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PromptRegistry } from '../../src/prompts/prompt-registry.js';
import { isOk } from '@nahisaho/katashiro-core';

describe('PromptRegistry', () => {
  let registry: PromptRegistry;

  beforeEach(() => {
    registry = new PromptRegistry();
  });

  describe('registration', () => {
    it('should register a prompt', () => {
      const result = registry.register({
        name: 'test_prompt',
        description: 'A test prompt',
        template: 'Hello, {{name}}!',
      });

      expect(isOk(result)).toBe(true);
    });

    it('should register prompt with arguments', () => {
      const result = registry.register({
        name: 'greeting',
        description: 'Greeting prompt',
        template: 'Hello, {{name}}! Welcome to {{place}}.',
        arguments: [
          { name: 'name', description: 'User name', required: true },
          { name: 'place', description: 'Location', required: false },
        ],
      });

      expect(isOk(result)).toBe(true);
    });

    it('should reject duplicate registration', () => {
      registry.register({
        name: 'test',
        description: 'First',
        template: 'First template',
      });

      const result = registry.register({
        name: 'test',
        description: 'Second',
        template: 'Second template',
      });

      expect(isOk(result)).toBe(false);
    });
  });

  describe('lookup', () => {
    it('should get registered prompt', () => {
      registry.register({
        name: 'my_prompt',
        description: 'My prompt',
        template: 'Template',
      });

      const result = registry.get('my_prompt');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value?.name).toBe('my_prompt');
      }
    });

    it('should return null for unknown prompt', () => {
      const result = registry.get('unknown');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeNull();
      }
    });

    it('should list all prompts', () => {
      registry.register({
        name: 'prompt1',
        description: 'Prompt 1',
        template: 'T1',
      });
      registry.register({
        name: 'prompt2',
        description: 'Prompt 2',
        template: 'T2',
      });

      const result = registry.list();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toHaveLength(2);
      }
    });
  });

  describe('rendering', () => {
    it('should render template with arguments', () => {
      registry.register({
        name: 'greeting',
        description: 'Greeting',
        template: 'Hello, {{name}}!',
      });

      const result = registry.render('greeting', { name: 'World' });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('Hello, World!');
      }
    });

    it('should render multiple placeholders', () => {
      registry.register({
        name: 'intro',
        description: 'Introduction',
        template: 'I am {{name}}, age {{age}}, from {{city}}.',
      });

      const result = registry.render('intro', {
        name: 'Alice',
        age: '30',
        city: 'Tokyo',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('I am Alice, age 30, from Tokyo.');
      }
    });

    it('should handle missing arguments', () => {
      registry.register({
        name: 'test',
        description: 'Test',
        template: 'Hello, {{name}}!',
      });

      const result = registry.render('test', {});
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toContain('{{name}}');
      }
    });

    it('should return error for unknown prompt', () => {
      const result = registry.render('unknown', {});
      expect(isOk(result)).toBe(false);
    });
  });

  describe('validation', () => {
    it('should validate required arguments', () => {
      registry.register({
        name: 'required_test',
        description: 'Test required',
        template: '{{required_arg}}',
        arguments: [
          { name: 'required_arg', description: 'Required', required: true },
        ],
      });

      const result = registry.validate('required_test', {});
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.valid).toBe(false);
        expect(result.value.missing).toContain('required_arg');
      }
    });

    it('should pass validation with all required args', () => {
      registry.register({
        name: 'valid_test',
        description: 'Test',
        template: '{{arg}}',
        arguments: [
          { name: 'arg', description: 'Arg', required: true },
        ],
      });

      const result = registry.validate('valid_test', { arg: 'value' });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.valid).toBe(true);
      }
    });
  });
});
