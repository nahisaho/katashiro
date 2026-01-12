/**
 * Transparency Module Tests
 * Phase 2 - AI使用透明性機能のテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ContributionAnalyzer,
  VersioningManager,
  CollaborationTracker,
  TransparencyReportGenerator,
} from '../../src/transparency/index.js';

describe('ContributionAnalyzer', () => {
  let analyzer: ContributionAnalyzer;

  beforeEach(() => {
    analyzer = new ContributionAnalyzer();
  });

  describe('analyze', () => {
    it('should analyze document with multiple sections', () => {
      const sections = [
        { id: '1', name: 'Introduction', content: 'This is an introduction to the topic.' },
        { id: '2', name: 'Main Content', content: 'Here is the detailed explanation with examples.' },
        { id: '3', name: 'Conclusion', content: 'In summary, we learned about the topic.' },
      ];

      const result = analyzer.analyze('doc-1', 'Test Document', sections);

      expect(result.documentId).toBe('doc-1');
      expect(result.title).toBe('Test Document');
      expect(result.sections).toHaveLength(3);
      expect(result.overallAIRatio).toBeGreaterThanOrEqual(0);
      expect(result.overallAIRatio).toBeLessThanOrEqual(100);
      expect(result.overallHumanRatio).toBe(100 - result.overallAIRatio);
    });

    it('should handle explicitly marked AI-generated sections', () => {
      const sections = [
        { id: '1', name: 'Human Section', content: 'Human written content.', isAIGenerated: false },
        { id: '2', name: 'AI Section', content: 'AI generated content.', isAIGenerated: true, aiModel: 'GPT-4' },
      ];

      const result = analyzer.analyze('doc-1', 'Mixed Document', sections);

      expect(result.sections[0]?.aiContributionRatio).toBe(0);
      expect(result.sections[1]?.aiContributionRatio).toBe(100);
      expect(result.aiModelsUsed).toContain('GPT-4');
    });

    it('should calculate contribution summary correctly', () => {
      const sections = [
        { id: '1', name: 'S1', content: 'A'.repeat(100), isAIGenerated: true },
        { id: '2', name: 'S2', content: 'B'.repeat(200), isAIGenerated: false },
      ];

      const result = analyzer.analyze('doc-1', 'Test', sections);

      expect(result.summary.totalChars).toBe(300);
      expect(result.summary.totalSections).toBe(2);
      expect(result.summary.aiDominantSections).toBe(1);
      expect(result.summary.humanDominantSections).toBe(1);
    });
  });

  describe('analyzeSection', () => {
    it('should detect AI patterns in structured content', () => {
      const structuredContent = `
## Introduction
まず、このトピックについて説明します。
つまり、具体的には以下のとおりです。

- ポイント1
- ポイント2
- ポイント3
- ポイント4
- ポイント5

## Conclusion
要するに、これらが重要なポイントです。
したがって、次のステップに進みましょう。
`;

      const result = analyzer.analyzeSection({
        id: '1',
        name: 'Test',
        content: structuredContent,
      });

      // 構造化されたコンテンツはAI生成の可能性が高い
      expect(result.aiContributionRatio).toBeGreaterThanOrEqual(50);
    });

    it('should detect human-like patterns in casual content', () => {
      const casualContent = `
ちょっと調べてみたんだけどさ、やっぱりこれすごいよね。
めっちゃ便利だなって思ったんだよね。
`;

      const result = analyzer.analyzeSection({
        id: '1',
        name: 'Test',
        content: casualContent,
      });

      // カジュアルなコンテンツは人間作成の可能性が高い
      expect(result.aiContributionRatio).toBeLessThan(50);
    });
  });

  describe('mergeSections', () => {
    it('should merge multiple sections into one', () => {
      const sections = [
        { sectionId: '1', sectionName: 'S1', content: 'Content 1', charCount: 10, contributorType: 'ai' as const, aiContributionRatio: 80, aiContributions: ['generation' as const], humanContributions: [], createdAt: new Date(), updatedAt: new Date() },
        { sectionId: '2', sectionName: 'S2', content: 'Content 2', charCount: 20, contributorType: 'human' as const, aiContributionRatio: 20, aiContributions: [], humanContributions: ['original' as const], createdAt: new Date(), updatedAt: new Date() },
      ];

      const merged = analyzer.mergeSections(sections);

      expect(merged.charCount).toBe(30);
      // Weighted average: (80*10 + 20*20) / 30 = 1200 / 30 = 40
      expect(merged.aiContributionRatio).toBe(40);
    });

    it('should throw error for empty sections array', () => {
      expect(() => analyzer.mergeSections([])).toThrow('At least one section is required');
    });
  });
});

describe('VersioningManager', () => {
  let manager: VersioningManager;

  beforeEach(() => {
    manager = new VersioningManager();
  });

  describe('initializeHistory', () => {
    it('should create initial version history', () => {
      const history = manager.initializeHistory('doc-1', 'Initial content', {
        changeSummary: 'First version',
        author: { type: 'human', name: 'Test User' },
      });

      expect(history.documentId).toBe('doc-1');
      expect(history.currentVersion).toBe('1.0.0');
      expect(history.totalVersions).toBe(1);
      expect(history.versions[0]?.changeType).toBe('create');
    });
  });

  describe('createVersion', () => {
    it('should create new version with diff', () => {
      manager.initializeHistory('doc-1', 'Line 1\nLine 2', {
        changeSummary: 'Initial',
        author: { type: 'human', name: 'User' },
      });

      const newVersion = manager.createVersion('doc-1', 'Line 1\nLine 2\nLine 3', {
        changeSummary: 'Added line 3',
        author: { type: 'ai', name: 'AI Assistant', aiModel: 'GPT-4' },
      });

      expect(newVersion.version).toBe('1.0.1');
      expect(newVersion.diff?.additions).toBe(1);
      expect(newVersion.author.type).toBe('ai');
    });

    it('should increment major version on merge', () => {
      manager.initializeHistory('doc-1', 'Content', {
        changeSummary: 'Initial',
        author: { type: 'human', name: 'User' },
      });

      const newVersion = manager.createVersion('doc-1', 'Merged content', {
        changeSummary: 'Merged',
        author: { type: 'mixed', name: 'Team' },
        changeType: 'merge',
      });

      expect(newVersion.version).toBe('2.0.0');
    });
  });

  describe('calculateDiff', () => {
    it('should calculate diff between two contents', () => {
      const diff = manager.calculateDiff('Line 1\nLine 2', 'Line 1\nLine 3\nLine 4');

      expect(diff.modifications).toBe(1); // Line 2 -> Line 3
      expect(diff.additions).toBe(1); // Line 4
      expect(diff.deletions).toBe(0);
    });

    it('should detect deletions', () => {
      const diff = manager.calculateDiff('Line 1\nLine 2\nLine 3', 'Line 1');

      expect(diff.deletions).toBe(2);
    });
  });

  describe('revertTo', () => {
    it('should revert to previous version', () => {
      manager.initializeHistory('doc-1', 'Version 1', {
        changeSummary: 'Initial',
        author: { type: 'human', name: 'User' },
      });

      manager.createVersion('doc-1', 'Version 2', {
        changeSummary: 'Update',
        author: { type: 'human', name: 'User' },
      });

      const reverted = manager.revertTo('doc-1', '1.0.0', { type: 'human', name: 'User' });

      expect(reverted.content).toBe('Version 1');
      expect(reverted.tags).toContain('revert');
    });
  });

  describe('findByTag', () => {
    it('should find versions by tag', () => {
      manager.initializeHistory('doc-1', 'Content', {
        changeSummary: 'Initial',
        author: { type: 'human', name: 'User' },
        tags: ['release'],
      });

      const found = manager.findByTag('doc-1', 'release');
      expect(found).toHaveLength(1);
    });
  });

  describe('getStatistics', () => {
    it('should return version statistics', () => {
      manager.initializeHistory('doc-1', 'Content', {
        changeSummary: 'Initial',
        author: { type: 'human', name: 'User' },
      });

      manager.createVersion('doc-1', 'Updated', {
        changeSummary: 'AI update',
        author: { type: 'ai', name: 'AI', aiModel: 'GPT-4' },
      });

      const stats = manager.getStatistics('doc-1');

      expect(stats?.totalVersions).toBe(2);
      expect(stats?.humanVersions).toBe(1);
      expect(stats?.aiVersions).toBe(1);
    });
  });
});

describe('CollaborationTracker', () => {
  let tracker: CollaborationTracker;

  beforeEach(() => {
    tracker = new CollaborationTracker();
  });

  describe('startSession', () => {
    it('should start new collaboration session', () => {
      const session = tracker.startSession('doc-1', 'Review Session', {
        name: 'Owner',
        type: 'human',
        role: 'owner',
      });

      expect(session.documentId).toBe('doc-1');
      expect(session.status).toBe('active');
      expect(session.participants).toHaveLength(1);
      expect(session.participants[0]?.role).toBe('owner');
    });
  });

  describe('addParticipant', () => {
    it('should add participant to active session', () => {
      const session = tracker.startSession('doc-1', 'Session', {
        name: 'Owner',
        type: 'human',
        role: 'owner',
      });

      const participant = tracker.addParticipant(session.id, {
        name: 'AI Assistant',
        type: 'ai',
        aiModel: 'Claude',
        role: 'ai-assistant',
      });

      expect(participant.type).toBe('ai');
      expect(participant.aiModel).toBe('Claude');

      const updated = tracker.getSession(session.id);
      expect(updated?.participants).toHaveLength(2);
    });
  });

  describe('recordOperation', () => {
    it('should record operation and update stats', () => {
      const session = tracker.startSession('doc-1', 'Session', {
        name: 'User',
        type: 'human',
        role: 'owner',
      });

      const participant = session.participants[0]!;
      const operation = tracker.recordOperation(session.id, {
        type: 'edit',
        participantId: participant.id,
        content: 'Made an edit',
      });

      expect(operation.type).toBe('edit');

      const stats = tracker.getStats(session.id);
      expect(stats?.totalOperations).toBe(1);
      expect(stats?.edits).toBe(1);
      expect(stats?.humanOperations).toBe(1);
    });
  });

  describe('session lifecycle', () => {
    it('should handle pause/resume/complete', () => {
      const session = tracker.startSession('doc-1', 'Session', {
        name: 'User',
        type: 'human',
        role: 'owner',
      });

      tracker.pauseSession(session.id);
      expect(tracker.getSession(session.id)?.status).toBe('paused');

      tracker.resumeSession(session.id);
      expect(tracker.getSession(session.id)?.status).toBe('active');

      const completed = tracker.completeSession(session.id);
      expect(completed.status).toBe('completed');
      expect(completed.endedAt).toBeDefined();
    });

    it('should not allow operations on completed session', () => {
      const session = tracker.startSession('doc-1', 'Session', {
        name: 'User',
        type: 'human',
        role: 'owner',
      });

      tracker.completeSession(session.id);

      expect(() => tracker.recordOperation(session.id, {
        type: 'edit',
        participantId: session.participants[0]!.id,
        content: 'Test',
      })).toThrow();
    });
  });

  describe('getDocumentCollaborationSummary', () => {
    it('should summarize all sessions for a document', () => {
      const session1 = tracker.startSession('doc-1', 'Session 1', {
        name: 'User 1',
        type: 'human',
        role: 'owner',
      });
      tracker.completeSession(session1.id);

      const session2 = tracker.startSession('doc-1', 'Session 2', {
        name: 'User 2',
        type: 'human',
        role: 'owner',
      });
      tracker.completeSession(session2.id);

      const summary = tracker.getDocumentCollaborationSummary('doc-1');

      expect(summary.totalSessions).toBe(2);
      expect(summary.completedSessions).toBe(2);
      expect(summary.totalParticipants).toContain('User 1');
      expect(summary.totalParticipants).toContain('User 2');
    });
  });
});

describe('TransparencyReportGenerator', () => {
  let generator: TransparencyReportGenerator;

  beforeEach(() => {
    generator = new TransparencyReportGenerator({
      defaultLanguage: 'ja',
      organizationName: 'Test Org',
    });
  });

  describe('generate', () => {
    it('should generate markdown report', () => {
      const report = generator.generate({
        documentId: 'doc-1',
        title: 'Test Document',
        content: '## Introduction\nThis is a test document.\n\n## Content\nHere is the content.',
      });

      expect(report.documentId).toBe('doc-1');
      expect(report.format).toBe('markdown');
      expect(report.content).toContain('# AI使用透明性レポート');
      expect(report.aiDisclosure).toBeDefined();
    });

    it('should generate JSON report', () => {
      const report = generator.generate({
        documentId: 'doc-1',
        title: 'Test Document',
        content: 'Test content',
        format: 'json',
      });

      expect(report.format).toBe('json');
      const parsed = JSON.parse(report.content);
      expect(parsed.documentId).toBe('doc-1');
    });

    it('should generate HTML report', () => {
      const report = generator.generate({
        documentId: 'doc-1',
        title: 'Test Document',
        content: 'Test content',
        format: 'html',
      });

      expect(report.format).toBe('html');
      expect(report.content).toContain('<!DOCTYPE html>');
      expect(report.content).toContain('AI使用透明性レポート');
    });

    it('should use provided sections for analysis', () => {
      const report = generator.generate({
        documentId: 'doc-1',
        title: 'Test',
        content: '',
        sections: [
          {
            sectionId: '1',
            sectionName: 'AI Section',
            content: 'AI content',
            charCount: 10,
            contributorType: 'ai',
            aiContributionRatio: 100,
            aiContributions: ['generation'],
            humanContributions: [],
            aiModel: 'GPT-4',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      expect(report.contribution.overallAIRatio).toBe(100);
      expect(report.aiDisclosure.aiUsed).toBe(true);
      expect(report.aiDisclosure.models).toContain('GPT-4');
    });

    it('should include version summary', () => {
      const versioningManager = new VersioningManager();
      versioningManager.initializeHistory('doc-1', 'v1', {
        changeSummary: 'Init',
        author: { type: 'human', name: 'User' },
      });
      const history = versioningManager.getHistory('doc-1');

      const report = generator.generate({
        documentId: 'doc-1',
        title: 'Test',
        content: 'Content',
        versionHistory: history!,
      });

      expect(report.versionSummary.totalVersions).toBe(1);
    });

    it('should include collaboration summary', () => {
      const collaborationTracker = new CollaborationTracker();
      const session = collaborationTracker.startSession('doc-1', 'Session', {
        name: 'User',
        type: 'human',
        role: 'owner',
      });
      collaborationTracker.completeSession(session.id);

      const report = generator.generate({
        documentId: 'doc-1',
        title: 'Test',
        content: 'Content',
        collaborationSessions: [collaborationTracker.getSession(session.id)!],
      });

      expect(report.collaboration?.totalSessions).toBe(1);
    });
  });

  describe('generateQuickDisclosure', () => {
    it('should generate disclosure for AI-heavy content', () => {
      const disclosure = generator.generateQuickDisclosure(85, ['GPT-4'], true, 'ja');

      expect(disclosure).toContain('主にAI');
      expect(disclosure).toContain('GPT-4');
      expect(disclosure).toContain('85%');
      expect(disclosure).toContain('検証されています');
    });

    it('should generate disclosure for human content', () => {
      const disclosure = generator.generateQuickDisclosure(0, [], false, 'ja');

      expect(disclosure).toContain('人間によって作成');
    });

    it('should generate English disclosure', () => {
      const disclosure = generator.generateQuickDisclosure(50, ['Claude'], true, 'en');

      expect(disclosure).toContain('collaboration');
      expect(disclosure).toContain('Claude');
    });
  });

  describe('generateBadgeText', () => {
    it('should return correct badge text', () => {
      expect(generator.generateBadgeText(0, 'ja')).toBe('100% 人間作成');
      expect(generator.generateBadgeText(20, 'ja')).toBe('AI支援あり');
      expect(generator.generateBadgeText(50, 'ja')).toBe('AI・人間共同作成');
      expect(generator.generateBadgeText(80, 'ja')).toBe('AI生成');
    });

    it('should return English badge text', () => {
      expect(generator.generateBadgeText(0, 'en')).toBe('100% Human Created');
      expect(generator.generateBadgeText(50, 'en')).toBe('AI-Human Collaboration');
    });
  });
});
