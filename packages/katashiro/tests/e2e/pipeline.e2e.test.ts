/**
 * E2E Pipeline Tests - Simplified
 * 完全なパイプラインフローのエンドツーエンドテスト（簡素化版）
 *
 * @since 0.2.0
 * @requirement Phase 4 - 統合・リリース
 */

import { describe, it, expect } from 'vitest';
import {
  // Analyzer
  TextAnalyzer,
  EntityExtractor,
  TopicModeler,
  StructureAnalyzer,
  QualityScorer,
  // Generator
  ReportGenerator,
  SummaryGenerator,
  ArticleGenerator,
  CitationGenerator,
  // Transparency
  ContributionAnalyzer,
  VersioningManager,
  CollaborationTracker,
  // Workflow
  WorkflowEngine,
  QualityGate,
  StyleGuideEnforcer,
  createStyleRule,
  // Knowledge
  KnowledgeGraph,
  GraphQuery,
} from '../../src/index.js';

describe('E2E Pipeline Tests', () => {
  describe('Research-to-Report Pipeline', () => {
    it('should execute complete research pipeline', async () => {
      // =====================
      // Stage 1: Content (simulated collection)
      // =====================
      const textContent = `
# TypeScript 5.0 の新機能

TypeScript 5.0 は2023年3月にリリースされました。

## 主な新機能

### デコレータ
ES decoratorsがサポートされました。

### const型パラメータ
ジェネリクスで const 修飾子が使用可能になりました。

## パフォーマンス改善

ビルド時間が10-25%改善されました。

詳細: https://devblogs.microsoft.com/typescript/
連絡先: team@typescript.org
      `;

      // =====================
      // Stage 2: Content Analysis
      // =====================

      // Text Analysis
      const textAnalyzer = new TextAnalyzer();
      const textAnalysis = await textAnalyzer.analyze(textContent);

      expect(textAnalysis.wordCount).toBeGreaterThan(0);
      expect(textAnalysis.keywords.length).toBeGreaterThan(0);

      // Entity Extraction
      const entityExtractor = new EntityExtractor();
      const entities = await entityExtractor.extract(textContent);

      expect(entities.urls.length).toBeGreaterThan(0);
      expect(entities.emails.length).toBeGreaterThan(0);

      // Structure Analysis
      const structureAnalyzer = new StructureAnalyzer();
      const structure = structureAnalyzer.analyze(textContent);

      expect(structure.headings.length).toBeGreaterThan(0);
      expect(structure.sections.length).toBeGreaterThan(0);

      // Topic Modeling
      const topicModeler = new TopicModeler();
      const topics = topicModeler.model(textContent, { numTopics: 3 });

      expect(topics.length).toBeGreaterThan(0);

      // Quality Scoring
      const qualityScorer = new QualityScorer();
      const quality = qualityScorer.score(textContent);

      expect(quality.overall).toBeGreaterThanOrEqual(0);
      expect(quality.overall).toBeLessThanOrEqual(100);

      // =====================
      // Stage 3: Knowledge Management
      // =====================
      const kg = new KnowledgeGraph();

      // Add article node
      kg.addNode({
        id: 'article-ts5',
        type: 'article',
        properties: {
          title: 'TypeScript 5.0 の新機能',
          keywords: textAnalysis.keywords,
        },
      });

      // Add feature nodes
      const features = ['デコレータ', 'const型パラメータ', 'パフォーマンス改善'];
      features.forEach((feature, idx) => {
        kg.addNode({
          id: `feature-${idx}`,
          type: 'concept',
          properties: { name: feature },
        });
        kg.addEdge({
          id: `edge-${idx}`,
          source: 'article-ts5',
          target: `feature-${idx}`,
          type: 'describes',
          properties: {},
        });
      });

      const query = new GraphQuery(kg);
      const foundFeatures = query.findByType('concept');
      expect(foundFeatures.length).toBe(3);

      // =====================
      // Stage 4: Content Generation
      // =====================

      // Summary
      const summarizer = new SummaryGenerator();
      const summary = await summarizer.generate(textContent, { maxLength: 100 });

      expect(summary.length).toBeGreaterThan(0);
      expect(summary.length).toBeLessThanOrEqual(150);

      // Report
      const reportGen = new ReportGenerator();
      const report = await reportGen.generate({
        title: 'TypeScript 5.0 技術レポート',
        sections: [
          { heading: '概要', content: summary },
          { heading: 'キーワード', content: textAnalysis.keywords.join(', ') },
          { heading: '品質スコア', content: `${quality.overall}/100` },
        ],
        format: 'markdown',
      });

      expect(report).toContain('TypeScript 5.0 技術レポート');
      expect(report).toContain('概要');

      // Citations
      const citationGen = new CitationGenerator();
      const citation = citationGen.generate({
        title: 'TypeScript 5.0 の新機能',
        author: 'TypeScript Team',
        url: 'https://typescript-blog.example.com/ts5',
      }, 'apa');

      // CitationGenerator.generate returns GeneratedCitation object
      expect(citation.formatted).toBeDefined();
      expect(citation.formatted).toContain('TypeScript');

      // =====================
      // Stage 5: Quality Validation
      // =====================
      const qualityGate = new QualityGate();
      const qualityResult = await qualityGate.evaluate(report);

      expect(qualityResult.overallScore).toBeGreaterThanOrEqual(0);

      // Style Enforcement
      const styleEnforcer = new StyleGuideEnforcer();
      // createStyleRule(id, name, validate, options)
      styleEnforcer.registerRule(createStyleRule(
        'heading-required',
        'Heading Required',
        (content: string) => {
          // Returns empty array if valid (has headings), otherwise returns violations
          if (content.includes('#')) {
            return [];
          }
          return [{
            ruleId: 'heading-required',
            severity: 'error' as const,
            message: 'Document should have headings',
          }];
        },
        { description: 'Document should have headings', severity: 'error' }
      ));

      const styleResult = styleEnforcer.validate(report);
      expect(styleResult.passed).toBe(true);
    });

    it('should track AI/Human contributions through pipeline', async () => {
      const tracker = new CollaborationTracker();
      const contribAnalyzer = new ContributionAnalyzer();
      const versionManager = new VersioningManager();

      // Start collaborative session
      const session = tracker.startSession('research-doc', 'Research Document', {
        name: 'Researcher',
        type: 'human',
      });

      // Human writes initial content
      const humanContent = `
# 研究テーマ

本研究では機械学習の応用について調査します。
      `;

      tracker.recordOperation(session.id, {
        type: 'edit',
        participantId: session.participants[0].id,
        content: humanContent,
      });

      // Add AI assistant
      tracker.addParticipant(session.id, {
        name: 'Claude',
        type: 'ai',
        aiModel: 'claude-3',
      });

      // AI generates summary
      const summarizer = new SummaryGenerator();
      const aiSummary = await summarizer.generate(humanContent, { maxLength: 50 });

      tracker.recordOperation(session.id, {
        type: 'generate',
        participantId: session.participants[1]?.id || 'ai',
        content: aiSummary,
      });

      // Complete session
      tracker.completeSession(session.id);

      // Analyze contributions
      const contributions = contribAnalyzer.analyze(
        'research-doc',
        'Research Document',
        [
          { id: 'intro', name: '導入', content: humanContent, isAIGenerated: false },
          { id: 'summary', name: '要約', content: aiSummary, isAIGenerated: true, aiModel: 'claude-3' },
        ]
      );

      expect(contributions.overallAIRatio + contributions.overallHumanRatio).toBe(100);
      expect(contributions.sections.length).toBe(2);

      // Version tracking
      const fullContent = humanContent + '\n' + aiSummary;
      versionManager.initializeHistory('research-doc', fullContent, {
        changeSummary: 'Initial research document',
        author: { name: 'Researcher', type: 'human' },
      });

      const history = versionManager.getHistory('research-doc');
      expect(history?.versions.length).toBe(1);
      expect(history?.currentVersion).toBe('1.0.0');
    });
  });

  describe('Workflow Automation Pipeline', () => {
    it('should execute workflow steps with quality gates', async () => {
      const content = 'TypeScriptは型安全なプログラミング言語です。JavaScriptのスーパーセットとして機能します。';

      // Step 1: Analyze
      const analyzer = new TextAnalyzer();
      const analysis = await analyzer.analyze(content);

      expect(analysis.keywords.length).toBeGreaterThan(0);

      // Step 2: Generate Summary
      const summarizer = new SummaryGenerator();
      const summary = await summarizer.generate(content, { maxLength: 50 });

      expect(summary.length).toBeGreaterThan(0);

      // Step 3: Quality Check
      const qualityGate = new QualityGate();
      const qualityResult = await qualityGate.evaluate(summary);

      expect(qualityResult.overallScore).toBeGreaterThanOrEqual(0);
      expect(qualityResult.checks.length).toBeGreaterThan(0);
    });

    it('should use WorkflowEngine for multi-step processing', async () => {
      // WorkflowEngine requires a WorkflowDefinition with specific format
      const definition = {
        id: 'test-workflow-001',
        name: 'test-workflow',
        version: '1.0.0',
        steps: [
          {
            id: 'analyze',
            name: 'Analyze Content',
            type: 'analyze' as const,
            execute: async (input: { content: string }) => {
              const analyzer = new TextAnalyzer();
              return analyzer.analyze(input.content);
            },
          },
        ],
      };

      const engine = new WorkflowEngine();
      engine.loadDefinition(definition);
      const result = await engine.execute({
        content: 'テスト用のコンテンツです。',
      });

      expect(result.status).toBe('completed');
      // stepResults is a Map<string, StepResult>
      expect(result.stepResults.get('analyze')).toBeDefined();
      expect(result.stepResults.get('analyze')?.status).toBe('completed');
    });
  });

  describe('Knowledge Graph Integration Pipeline', () => {
    it('should build knowledge graph from analyzed content', async () => {
      const documents = [
        {
          id: 'doc1',
          title: 'JavaScript入門',
          content: 'JavaScriptはWeb開発の基盤言語です。',
        },
        {
          id: 'doc2',
          title: 'TypeScript入門',
          content: 'TypeScriptはJavaScriptのスーパーセットです。',
        },
      ];

      const kg = new KnowledgeGraph();
      const textAnalyzer = new TextAnalyzer();

      // Process each document
      for (const doc of documents) {
        const analysis = await textAnalyzer.analyze(doc.content);

        // Add document node
        kg.addNode({
          id: doc.id,
          type: 'document',
          properties: {
            title: doc.title,
            keywords: analysis.keywords,
          },
        });
      }

      // Add technology nodes
      kg.addNode({
        id: 'tech-js',
        type: 'technology',
        properties: { name: 'JavaScript' },
      });
      kg.addNode({
        id: 'tech-ts',
        type: 'technology',
        properties: { name: 'TypeScript' },
      });

      // Create relationships
      kg.addEdge({
        id: 'rel-1',
        source: 'tech-ts',
        target: 'tech-js',
        type: 'extends',
        properties: {},
      });
      kg.addEdge({
        id: 'rel-2',
        source: 'doc1',
        target: 'tech-js',
        type: 'describes',
        properties: {},
      });

      // Query the graph
      const query = new GraphQuery(kg);
      const docs = query.findByType('document');
      const techs = query.findByType('technology');

      expect(docs.length).toBe(2);
      expect(techs.length).toBe(2);
      expect(kg.getAllEdges().length).toBe(2);
    });
  });

  describe('Article Generation Pipeline', () => {
    it('should generate full article with SEO optimization', async () => {
      const topic = 'TypeScriptベストプラクティス';

      // Step 1: Research (simulated)
      const researchContent = `
TypeScriptは型安全なプログラミングを可能にします。
厳密な型定義により、バグを早期に発見できます。
      `;

      // Step 2: Analyze
      const analyzer = new TextAnalyzer();
      const analysis = await analyzer.analyze(researchContent);

      // Step 3: Generate Article
      const articleGen = new ArticleGenerator();
      const article = await articleGen.generate({
        title: topic,
        topic: topic,
        tone: 'technical',
        audience: 'intermediate',
        length: 'medium',
        seo: {
          keywords: analysis.keywords,
          metaDescription: 'TypeScriptの型安全なプログラミングのベストプラクティスを解説',
        },
      });

      expect(article.title).toBe(topic);
      expect(article.body.length).toBeGreaterThan(0);
      expect(article.meta.keywords.length).toBeGreaterThan(0);
      expect(article.meta.readingTime).toBeGreaterThan(0);

      // Step 4: Quality Check
      const qualityGate = new QualityGate();
      const qualityResult = await qualityGate.evaluate(article.body);

      expect(qualityResult.overallScore).toBeGreaterThanOrEqual(0);

      // Step 5: Style Check using validate() method
      const styleEnforcer = new StyleGuideEnforcer();
      const styleResult = styleEnforcer.validate(article.body);

      expect(styleResult.passed).toBeDefined();
    });
  });

  describe('Complete End-to-End Flow', () => {
    it('should process content through full pipeline', async () => {
      // Input
      const inputContent = `
# AI技術の進歩

人工知能（AI）は急速に進化しています。
機械学習、深層学習、自然言語処理などの技術が発展しています。
GoogleやOpenAIなどの企業が研究開発をリードしています。

## 主なトレンド

1. 大規模言語モデル（LLM）
2. マルチモーダルAI
3. エッジAI

## 今後の展望

AI技術は様々な産業に影響を与えていきます。
      `;

      // Analysis Phase
      const textAnalyzer = new TextAnalyzer();
      const analysis = await textAnalyzer.analyze(inputContent);

      const entityExtractor = new EntityExtractor();
      const entities = await entityExtractor.extract(inputContent);

      const structureAnalyzer = new StructureAnalyzer();
      const structure = structureAnalyzer.analyze(inputContent);

      // Verify analysis results
      expect(analysis.wordCount).toBeGreaterThan(0);
      expect(structure.headings.length).toBeGreaterThan(0);

      // Knowledge Phase
      const kg = new KnowledgeGraph();
      kg.addNode({
        id: 'article',
        type: 'document',
        properties: { title: 'AI技術の進歩', keywords: analysis.keywords },
      });

      // Generation Phase
      const summarizer = new SummaryGenerator();
      const summary = await summarizer.generate(inputContent, { maxLength: 80 });

      const reportGen = new ReportGenerator();
      const report = await reportGen.generate({
        title: 'AI技術分析レポート',
        sections: [
          { heading: '要約', content: summary },
          { heading: 'キーワード', content: analysis.keywords.slice(0, 5).join(', ') },
          { heading: '構造', content: `${structure.headings.length}個の見出し` },
        ],
        format: 'markdown',
      });

      // Validation Phase
      const qualityGate = new QualityGate();
      const qualityResult = await qualityGate.evaluate(report);

      // Final assertions
      expect(report).toContain('AI技術分析レポート');
      expect(summary.length).toBeGreaterThan(0);
      expect(qualityResult.overallScore).toBeGreaterThanOrEqual(0);
    });
  });
});
