/**
 * Source Tracking Unit Tests
 * SourceTracker, CredibilityScorer
 *
 * @task Phase1テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SourceTracker, CredibilityScorer } from '../../src/source/index.js';

describe('SourceTracker', () => {
  let tracker: SourceTracker;

  beforeEach(() => {
    tracker = new SourceTracker();
  });

  describe('track', () => {
    it('should track a new source', async () => {
      const source = await tracker.track(
        'https://example.com/article',
        'Article content here'
      );

      expect(source.id).toBeDefined();
      expect(source.url).toBe('https://example.com/article');
      expect(source.contentHash).toBeDefined();
      expect(source.accessedAt).toBeInstanceOf(Date);
      expect(source.metadata.domain).toBe('example.com');
    });

    it('should generate content hash', async () => {
      const source1 = await tracker.track(
        'https://example.com/1',
        'Same content'
      );

      const source2 = await tracker.track(
        'https://example.com/2',
        'Same content'
      );

      // 同じコンテンツは同じハッシュ
      expect(source1.contentHash).toBe(source2.contentHash);
    });

    it('should detect different content', async () => {
      const source1 = await tracker.track(
        'https://example.com/1',
        'Content A'
      );

      const source2 = await tracker.track(
        'https://example.com/2',
        'Content B'
      );

      expect(source1.contentHash).not.toBe(source2.contentHash);
    });

    it('should update hash when content changes', async () => {
      const url = 'https://example.com/changing';
      const source1 = await tracker.track(url, 'Original content');
      const originalHash = source1.contentHash;

      const source2 = await tracker.track(url, 'Updated content');

      expect(source2.contentHash).not.toBe(originalHash);
    });
  });

  describe('getByUrl', () => {
    it('should retrieve tracked source by URL', async () => {
      const url = 'https://example.com/tracked';
      await tracker.track(url, 'Content');

      const retrieved = await tracker.getByUrl(url);

      expect(retrieved).toBeDefined();
      expect(retrieved?.url).toBe(url);
    });

    it('should return null for untracked URL', async () => {
      const retrieved = await tracker.getByUrl('https://not-tracked.com');
      expect(retrieved).toBeNull();
    });
  });

  describe('detectChange', () => {
    it('should detect content changes', async () => {
      const url = 'https://example.com/changing';
      
      await tracker.track(url, 'Original content');
      
      const hasChanged = await tracker.detectChange(url, 'Updated content');

      expect(hasChanged).toBe(true);
    });

    it('should report no changes for same content', async () => {
      const url = 'https://example.com/static';
      const content = 'Static content';
      
      await tracker.track(url, content);
      
      const hasChanged = await tracker.detectChange(url, content);

      expect(hasChanged).toBe(false);
    });

    it('should return true for new URLs', async () => {
      const hasChanged = await tracker.detectChange('https://new.com', 'Content');
      expect(hasChanged).toBe(true);
    });
  });

  describe('linkToContent', () => {
    it('should link source to generated content', async () => {
      const source = await tracker.track(
        'https://example.com/source',
        'Source content'
      );

      await tracker.linkToContent(source.id, 'generated-article-1');

      const updated = await tracker.getById(source.id);
      expect(updated?.usedIn).toContain('generated-article-1');
    });

    it('should support multiple links', async () => {
      const source = await tracker.track(
        'https://example.com/multi',
        'Content'
      );

      await tracker.linkToContent(source.id, 'article-1');
      await tracker.linkToContent(source.id, 'article-2');
      await tracker.linkToContent(source.id, 'article-3');

      const updated = await tracker.getById(source.id);
      expect(updated?.usedIn).toHaveLength(3);
    });
  });

  describe('getSourcesByContent', () => {
    it('should get all sources for generated content', async () => {
      const source1 = await tracker.track('https://a.com', 'A');
      const source2 = await tracker.track('https://b.com', 'B');

      await tracker.linkToContent(source1.id, 'my-article');
      await tracker.linkToContent(source2.id, 'my-article');

      const sources = await tracker.getSourcesByContent('my-article');
      expect(sources).toHaveLength(2);
    });
  });

  describe('updateMetadata', () => {
    it('should update source metadata', async () => {
      const source = await tracker.track('https://example.com', 'Content');

      const updated = await tracker.updateMetadata(source.id, {
        title: 'Test Article',
        author: 'John Doe',
      });

      expect(updated?.metadata.title).toBe('Test Article');
      expect(updated?.metadata.author).toBe('John Doe');
    });
  });
});

describe('CredibilityScorer', () => {
  let scorer: CredibilityScorer;
  let tracker: SourceTracker;

  beforeEach(() => {
    scorer = new CredibilityScorer();
    tracker = new SourceTracker();
  });

  describe('score', () => {
    it('should score source credibility', async () => {
      const source = await tracker.track(
        'https://www.nature.com/articles/example',
        'Scientific Research Paper content'
      );

      const score = await scorer.score(source);

      expect(score.total).toBeGreaterThan(0);
      expect(score.total).toBeLessThanOrEqual(100);
      expect(score.factors).toBeDefined();
      expect(score.explanation).toBeDefined();
    });

    it('should give higher score to academic domains', async () => {
      const academicSource = await tracker.track(
        'https://arxiv.org/abs/1234',
        'Research paper'
      );

      const blogSource = await tracker.track(
        'https://random-blog.blogspot.com/post',
        'Blog post'
      );

      const academicScore = await scorer.score(academicSource);
      const blogScore = await scorer.score(blogSource);

      expect(academicScore.factors.domainReputation).toBeGreaterThan(
        blogScore.factors.domainReputation
      );
    });

    it('should give HTTPS bonus', async () => {
      const httpsSource = await tracker.track(
        'https://example.com/secure',
        'Content'
      );

      const score = await scorer.score(httpsSource);

      expect(score.factors.httpsBonus).toBe(5);
    });

    it('should include citation bonus when source is used', async () => {
      const source = await tracker.track('https://example.com', 'Content');
      await tracker.linkToContent(source.id, 'article-1');
      await tracker.linkToContent(source.id, 'article-2');

      const updatedSource = await tracker.getById(source.id);
      const score = await scorer.score(updatedSource!);

      expect(score.factors.citationBonus).toBeGreaterThan(0);
    });
  });

  describe('setDomainReputation', () => {
    it('should set custom domain score', async () => {
      scorer.setDomainReputation('custom-trusted.com', 80);

      const source = await tracker.track(
        'https://custom-trusted.com/page',
        'Content'
      );

      const score = await scorer.score(source);

      expect(score.factors.domainReputation).toBe(80);
    });
  });

  describe('addKnownAuthor', () => {
    it('should add known author credentials', async () => {
      scorer.addKnownAuthor('Dr. Jane Smith', ['PhD', 'Professor']);

      const source = await tracker.track('https://example.com', 'Content');
      await tracker.updateMetadata(source.id, { author: 'Dr. Jane Smith' });

      const updatedSource = await tracker.getById(source.id);
      const score = await scorer.score(updatedSource!);

      expect(score.factors.authorBonus).toBe(10);
    });
  });
});
