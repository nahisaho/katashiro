/**
 * EntityExtractor Unit Tests
 *
 * @task TSK-022
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EntityExtractor,
  Entity,
  EntityType,
} from '../../src/entity/entity-extractor.js';

describe('EntityExtractor', () => {
  let extractor: EntityExtractor;

  beforeEach(() => {
    extractor = new EntityExtractor();
  });

  describe('extractEntities', () => {
    it('should extract person names', () => {
      const text = '田中太郎さんと山田花子さんが会議に参加しました。';
      const entities = extractor.extractEntities(text);
      
      const persons = entities.filter(e => e.type === 'person');
      expect(persons.length).toBeGreaterThan(0);
    });

    it('should extract organization names', () => {
      const text = '株式会社ABC商事と有限会社XYZ工業が提携しました。';
      const entities = extractor.extractEntities(text);
      
      const orgs = entities.filter(e => e.type === 'organization');
      expect(orgs.length).toBeGreaterThan(0);
    });

    it('should extract location names', () => {
      const text = '東京都渋谷区と大阪府大阪市で開催されます。';
      const entities = extractor.extractEntities(text);
      
      const locations = entities.filter(e => e.type === 'location');
      expect(locations.length).toBeGreaterThan(0);
    });

    it('should extract dates', () => {
      const text = '2024年12月25日に開催予定です。来年の1月15日も予定があります。';
      const entities = extractor.extractEntities(text);
      
      const dates = entities.filter(e => e.type === 'date');
      expect(dates.length).toBeGreaterThan(0);
    });

    it('should extract URLs', () => {
      const text = '詳細はhttps://example.comをご覧ください。';
      const entities = extractor.extractEntities(text);
      
      const urls = entities.filter(e => e.type === 'url');
      expect(urls.length).toBe(1);
      expect(urls[0]?.text).toBe('https://example.com');
    });

    it('should extract email addresses', () => {
      const text = 'お問い合わせはcontact@example.comまで。';
      const entities = extractor.extractEntities(text);
      
      const emails = entities.filter(e => e.type === 'email');
      expect(emails.length).toBe(1);
      expect(emails[0]?.text).toBe('contact@example.com');
    });

    it('should extract phone numbers', () => {
      const text = '電話番号: 03-1234-5678 または 090-1234-5678';
      const entities = extractor.extractEntities(text);
      
      const phones = entities.filter(e => e.type === 'phone');
      expect(phones.length).toBe(2);
    });

    it('should extract money amounts', () => {
      const text = '価格は¥1,000です。または$50.00でも購入できます。';
      const entities = extractor.extractEntities(text);
      
      const money = entities.filter(e => e.type === 'money');
      expect(money.length).toBe(2);
    });

    it('should handle empty text', () => {
      const entities = extractor.extractEntities('');
      expect(entities).toEqual([]);
    });

    it('should include position information', () => {
      const text = 'test@example.com is my email';
      const entities = extractor.extractEntities(text);
      
      const email = entities.find(e => e.type === 'email');
      expect(email?.start).toBe(0);
      expect(email?.end).toBe(16);
    });
  });

  describe('extractByType', () => {
    it('should extract only specified entity type', () => {
      const text = 'Contact: test@example.com or call 03-1234-5678';
      const emails = extractor.extractByType(text, 'email');
      
      expect(emails.length).toBe(1);
      expect(emails[0]?.type).toBe('email');
    });
  });

  describe('normalizeEntity', () => {
    it('should normalize date entities', () => {
      const entity: Entity = {
        type: 'date',
        text: '2024年12月25日',
        start: 0,
        end: 11,
      };
      
      const normalized = extractor.normalizeEntity(entity);
      expect(normalized.normalized).toBeDefined();
    });

    it('should normalize phone numbers', () => {
      const entity: Entity = {
        type: 'phone',
        text: '03-1234-5678',
        start: 0,
        end: 12,
      };
      
      const normalized = extractor.normalizeEntity(entity);
      expect(normalized.normalized).toBe('0312345678');
    });
  });

  describe('mergeEntities', () => {
    it('should merge duplicate entities', () => {
      const text = 'Contact test@example.com. Email: test@example.com';
      const entities = extractor.extractEntities(text);
      const merged = extractor.mergeEntities(entities);
      
      const emails = merged.filter(e => e.type === 'email');
      expect(emails.length).toBe(1);
      expect(emails[0]?.count).toBe(2);
    });
  });
});
