/**
 * TemplateEngine Unit Tests
 *
 * @task TSK-034
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TemplateEngine,
  Template,
} from '../../src/template/template-engine.js';

describe('TemplateEngine', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine();
  });

  describe('render', () => {
    it('should render simple template', () => {
      const template = 'Hello, {{name}}!';
      const data = { name: 'World' };
      
      const result = engine.render(template, data);
      
      expect(result).toBe('Hello, World!');
    });

    it('should render multiple variables', () => {
      const template = '{{greeting}}, {{name}}! Today is {{day}}.';
      const data = { greeting: 'Hi', name: 'Alice', day: 'Monday' };
      
      const result = engine.render(template, data);
      
      expect(result).toBe('Hi, Alice! Today is Monday.');
    });

    it('should handle nested objects', () => {
      const template = '{{user.name}} works at {{user.company}}';
      const data = { user: { name: 'Bob', company: 'Acme' } };
      
      const result = engine.render(template, data);
      
      expect(result).toBe('Bob works at Acme');
    });

    it('should handle missing variables', () => {
      const template = 'Hello, {{name}}!';
      const data = {};
      
      const result = engine.render(template, data);
      
      expect(result).toBe('Hello, !');
    });

    it('should handle arrays with each helper', () => {
      const template = '{{#each items}}{{this}}, {{/each}}';
      const data = { items: ['a', 'b', 'c'] };
      
      const result = engine.render(template, data);
      
      expect(result).toContain('a');
      expect(result).toContain('b');
      expect(result).toContain('c');
    });

    it('should handle conditionals', () => {
      const template = '{{#if show}}Visible{{/if}}';
      const data = { show: true };
      
      const result = engine.render(template, data);
      
      expect(result).toBe('Visible');
    });

    it('should handle false conditionals', () => {
      const template = '{{#if show}}Visible{{/if}}';
      const data = { show: false };
      
      const result = engine.render(template, data);
      
      expect(result).toBe('');
    });
  });

  describe('registerTemplate', () => {
    it('should register and use named template', () => {
      engine.registerTemplate('greeting', 'Hello, {{name}}!');
      
      const result = engine.renderNamed('greeting', { name: 'World' });
      
      expect(result).toBe('Hello, World!');
    });

    it('should throw for unknown template', () => {
      expect(() => engine.renderNamed('unknown', {})).toThrow();
    });
  });

  describe('registerHelper', () => {
    it('should register and use custom helper', () => {
      engine.registerHelper('upper', (value: string) => value.toUpperCase());
      const template = '{{upper name}}';
      
      const result = engine.render(template, { name: 'hello' });
      
      expect(result).toBe('HELLO');
    });
  });

  describe('getBuiltInTemplates', () => {
    it('should return built-in templates', () => {
      const templates = engine.getBuiltInTemplates();
      
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.name === 'report')).toBe(true);
    });
  });
});
