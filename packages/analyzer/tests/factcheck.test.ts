/**
 * FactChecker テスト
 *
 * @requirement REQ-ANALYZE-006
 * @design DES-ANALYZE-006-FactChecker
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FactChecker,
  ClaimParser,
  TrustedSourceRegistry,
  EvidenceCollector,
  ConsistencyChecker,
  VerdictGenerator,
  DEFAULT_FACTCHECKER_CONFIG,
  type Evidence,
  type ExtractedClaim,
  type ClaimVerification,
} from '../src/factcheck/index.js';

describe('FactChecker', () => {
  describe('ClaimParser', () => {
    let parser: ClaimParser;

    beforeEach(() => {
      parser = new ClaimParser();
    });

    it('単一の主張を解析できる', () => {
      const claim = parser.parseSingle('The Great Wall of China is visible from space.');

      expect(claim.original).toBe('The Great Wall of China is visible from space.');
      expect(claim.normalized).toContain('Great Wall');
      expect(claim.type).toBe('factual');
      expect(claim.verifiability).toBe('high');
      expect(claim.entities).toContain('The Great Wall');
    });

    it('統計的な主張を識別できる', () => {
      const claim = parser.parseSingle('70% of the Earth is covered by water.');

      expect(claim.type).toBe('statistical');
      expect(claim.verifiability).toBe('high');
      expect(claim.entities).toContain('70%');
    });

    it('引用を識別できる', () => {
      const claim = parser.parseSingle('Einstein said that "Imagination is more important than knowledge."');

      expect(claim.type).toBe('quote');
      expect(claim.entities).toContain('Einstein');
    });

    it('予測を識別し低い検証可能性を付与する', () => {
      const claim = parser.parseSingle('The economy will improve next year.');

      expect(claim.type).toBe('prediction');
      expect(claim.verifiability).toBe('low');
    });

    it('意見を識別し低い検証可能性を付与する', () => {
      const claim = parser.parseSingle('I think JavaScript is the best programming language.');

      expect(claim.type).toBe('opinion');
      expect(claim.verifiability).toBe('low');
    });

    it('複数の主張を含むテキストを解析できる', () => {
      const text = 'The moon landing was in 1969. Water boils at 100 degrees Celsius. The sky is blue.';
      const claims = parser.parse(text);

      expect(claims.length).toBeGreaterThanOrEqual(2);
      expect(claims.some(c => c.entities.includes('1969'))).toBe(true);
    });

    it('文を正規化できる', () => {
      const normalized = parser.normalize('  Extra   spaces   here  ');

      expect(normalized).toBe('Extra spaces here.');
    });
  });

  describe('TrustedSourceRegistry', () => {
    let registry: TrustedSourceRegistry;

    beforeEach(() => {
      registry = new TrustedSourceRegistry();
    });

    it('デフォルトの信頼できるソースが登録されている', () => {
      const sources = registry.getAllSources();

      expect(sources.length).toBeGreaterThan(0);
      expect(sources.some(s => s.name === 'Snopes')).toBe(true);
      expect(sources.some(s => s.name === 'Reuters')).toBe(true);
    });

    it('ドメインから信頼性スコアを取得できる', () => {
      const score = registry.getCredibility('snopes.com');

      expect(score).toBe(0.9);
    });

    it('www付きのドメインも正しく処理する', () => {
      const score = registry.getCredibility('www.reuters.com');

      expect(score).toBe(0.85);
    });

    it('未登録のドメインはデフォルトスコアを返す', () => {
      const score = registry.getCredibility('unknown-site.com');

      expect(score).toBe(0.5);
    });

    it('ソースの種類で絞り込める', () => {
      const factCheckOrgs = registry.getSourcesByType('factcheck_org');

      expect(factCheckOrgs.length).toBeGreaterThan(0);
      expect(factCheckOrgs.every(s => s.sourceType === 'factcheck_org')).toBe(true);
    });

    it('ドメインが信頼できるかチェックできる', () => {
      expect(registry.isTrusted('nature.com')).toBe(true);
      expect(registry.isTrusted('random-blog.com')).toBe(false);
    });

    it('新しいソースを登録できる', () => {
      registry.register({
        name: 'Test Source',
        domain: 'test-source.com',
        sourceType: 'trusted_news',
        baseCredibility: 0.75,
      });

      expect(registry.isTrusted('test-source.com')).toBe(true);
      expect(registry.getCredibility('test-source.com')).toBe(0.75);
    });
  });

  describe('ConsistencyChecker', () => {
    let checker: ConsistencyChecker;

    beforeEach(() => {
      checker = new ConsistencyChecker();
    });

    const createEvidence = (relation: Evidence['relation'], credibility = 0.8): Evidence => ({
      id: `ev-${Date.now()}-${Math.random()}`,
      sourceName: 'Test Source',
      sourceUrl: 'https://example.com',
      sourceType: 'trusted_news',
      excerpt: 'Test excerpt',
      relation,
      credibilityScore: credibility,
      retrievedAt: new Date(),
    });

    const createClaim = (): ExtractedClaim => ({
      original: 'Test claim',
      normalized: 'Test claim.',
      entities: ['Test'],
      type: 'factual',
      verifiability: 'high',
    });

    it('全てsupportingの場合は高い一貫性スコアを返す', () => {
      const evidence = [
        createEvidence('supports'),
        createEvidence('supports'),
        createEvidence('partially_supports'),
      ];

      const result = checker.check(createClaim(), evidence);

      expect(result.score).toBeGreaterThan(0.7);
      expect(result.supportingCount).toBe(3);
      expect(result.contradictingCount).toBe(0);
    });

    it('全てcontradictingの場合は低い一貫性スコアを返す', () => {
      const evidence = [
        createEvidence('contradicts'),
        createEvidence('contradicts'),
      ];

      const result = checker.check(createClaim(), evidence);

      expect(result.score).toBeLessThan(0.3);
      expect(result.contradictingCount).toBe(2);
    });

    it('混在している場合は中程度のスコアを返す', () => {
      const evidence = [
        createEvidence('supports'),
        createEvidence('contradicts'),
        createEvidence('neutral'),
      ];

      const result = checker.check(createClaim(), evidence);

      expect(result.score).toBeGreaterThan(0.2);
      expect(result.score).toBeLessThan(0.8);
      expect(result.contradictions.length).toBeGreaterThan(0);
    });

    it('エビデンスがない場合はスコア0を返す', () => {
      const result = checker.check(createClaim(), []);

      expect(result.score).toBe(0);
      expect(result.notes).toContain('No evidence available for consistency check');
    });

    it('主張を検証できる', () => {
      const evidence = [
        createEvidence('supports', 0.9),
        createEvidence('supports', 0.85),
      ];

      const verification = checker.verify(createClaim(), evidence);

      expect(verification.verified).toBe(true);
      expect(verification.evidence).toHaveLength(2);
    });

    it('矛盾するエビデンスのみの場合は検証失敗', () => {
      const evidence = [
        createEvidence('contradicts'),
        createEvidence('contradicts'),
      ];

      const verification = checker.verify(createClaim(), evidence);

      expect(verification.verified).toBe(false);
    });
  });

  describe('VerdictGenerator', () => {
    let generator: VerdictGenerator;

    beforeEach(() => {
      generator = new VerdictGenerator();
    });

    const createVerification = (verified: boolean | null): ClaimVerification => ({
      claim: {
        original: 'Test',
        normalized: 'Test.',
        entities: [],
        type: 'factual',
        verifiability: 'high',
      },
      verified,
      evidence: [],
      notes: [],
    });

    it('全て検証済みの場合は"true"を返す', () => {
      const verdict = generator.generate({
        claimVerifications: [
          createVerification(true),
          createVerification(true),
        ],
        consistencyScore: 0.9,
        evidenceCount: 5,
        strictnessLevel: 'moderate',
      });

      expect(verdict.label).toBe('true');
      expect(verdict.score).toBeGreaterThan(0.8);
    });

    it('全て反証済みの場合は"mostly_false"を返す', () => {
      const verdict = generator.generate({
        claimVerifications: [
          createVerification(false),
          createVerification(false),
        ],
        consistencyScore: 0.8,
        evidenceCount: 5,
        strictnessLevel: 'moderate',
      });

      expect(verdict.label).toBe('mostly_false');
      expect(verdict.score).toBeLessThan(-0.5);
    });

    it('エビデンス不足の場合は"unverifiable"を返す', () => {
      const verdict = generator.generate({
        claimVerifications: [createVerification(true)],
        consistencyScore: 0.5,
        evidenceCount: 1,
        strictnessLevel: 'moderate',
      });

      expect(verdict.label).toBe('unverifiable');
      expect(verdict.rationale).toContain('Insufficient evidence');
    });

    it('strictモードではより多くのエビデンスを要求する', () => {
      const verdict = generator.generate({
        claimVerifications: [createVerification(true)],
        consistencyScore: 0.9,
        evidenceCount: 3,
        strictnessLevel: 'strict',
      });

      expect(verdict.label).toBe('unverifiable');
    });

    it('lenientモードでは少ないエビデンスでも判定する', () => {
      const verdict = generator.generate({
        claimVerifications: [createVerification(true)],
        consistencyScore: 0.9,
        evidenceCount: 2,
        strictnessLevel: 'lenient',
      });

      expect(verdict.label).toBe('true');
    });

    it('既存のファクトチェック結果を考慮する', () => {
      const verdict = generator.generate({
        claimVerifications: [createVerification(null)],
        consistencyScore: 0.5,
        evidenceCount: 3,
        strictnessLevel: 'moderate',
        existingFactChecks: [
          { organization: 'Snopes', verdict: 'true', url: 'https://snopes.com', date: new Date() },
          { organization: 'PolitiFact', verdict: 'true', url: 'https://politifact.com', date: new Date() },
        ],
      });

      expect(verdict.label).toBe('true');
      expect(verdict.rationale).toContain('previously fact-checked');
    });
  });

  describe('EvidenceCollector', () => {
    let collector: EvidenceCollector;
    let registry: TrustedSourceRegistry;

    beforeEach(() => {
      registry = new TrustedSourceRegistry();
      collector = new EvidenceCollector(registry);
    });

    it('検索クライアントなしでもダミーエビデンスを生成する', async () => {
      const claim: ExtractedClaim = {
        original: 'Test claim',
        normalized: 'Test claim.',
        entities: ['Test'],
        type: 'factual',
        verifiability: 'high',
      };

      const evidence = await collector.collect(claim, ['trusted_news', 'factcheck_org']);

      expect(evidence.length).toBe(2);
      expect(evidence[0]?.sourceType).toBe('trusted_news');
    });

    it('クイック収集でも少数のエビデンスを返す', async () => {
      const claim: ExtractedClaim = {
        original: 'Test claim',
        normalized: 'Test claim.',
        entities: [],
        type: 'factual',
        verifiability: 'high',
      };

      const evidence = await collector.collectQuick(claim, 2);

      expect(evidence.length).toBeLessThanOrEqual(2);
    });
  });

  describe('FactChecker Integration', () => {
    let checker: FactChecker;

    beforeEach(() => {
      checker = new FactChecker();
    });

    it('デフォルト設定で初期化される', () => {
      expect(DEFAULT_FACTCHECKER_CONFIG.defaultStrictnessLevel).toBe('moderate');
      expect(DEFAULT_FACTCHECKER_CONFIG.defaultMinEvidence).toBe(3);
    });

    it('空の主張はエラーを返す', async () => {
      const result = await checker.check({ claim: '' });

      expect(result.isErr()).toBe(true);
      if (result._tag === 'Err') {
        expect(result.error.code).toBe('INVALID_CLAIM');
      }
    });

    it('有効な主張をチェックできる', async () => {
      const result = await checker.check({
        claim: 'Water boils at 100 degrees Celsius at sea level.',
      });

      expect(result.isOk()).toBe(true);
      if (result._tag === 'Ok') {
        expect(result.value.claim).toBe('Water boils at 100 degrees Celsius at sea level.');
        expect(result.value.verdict).toBeDefined();
        expect(result.value.confidenceScore).toBeGreaterThanOrEqual(0);
        expect(result.value.confidenceScore).toBeLessThanOrEqual(1);
        expect(result.value.metadata.version).toBe('0.2.3');
      }
    });

    it('クイックチェックが動作する', async () => {
      const result = await checker.quickCheck('The moon landing was in 1969.');

      expect(result.isOk()).toBe(true);
      if (result._tag === 'Ok') {
        expect(result.value.verdict).toBeDefined();
        expect(result.value.confidence).toBeGreaterThanOrEqual(0);
        expect(result.value.reason).toBeDefined();
      }
    });

    it('バッチチェックが動作する', async () => {
      const result = await checker.checkBatch([
        'The Earth is round.',
        'Water is H2O.',
      ]);

      expect(result.isOk()).toBe(true);
      if (result._tag === 'Ok') {
        expect(result.value.length).toBe(2);
      }
    });

    it('テキストから主張を抽出できる', () => {
      const text = 'The Great Wall of China is one of the wonders of the world. It was built over many centuries.';
      const claims = checker.extractClaims(text);

      expect(claims.length).toBeGreaterThan(0);
    });

    it('厳密さレベルを指定できる', async () => {
      const result = await checker.check({
        claim: 'The sky is blue.',
        strictnessLevel: 'lenient',
      });

      expect(result.isOk()).toBe(true);
    });

    it('検証ソースを指定できる', async () => {
      const result = await checker.check({
        claim: 'Climate change is happening.',
        verificationSources: ['academic', 'government'],
      });

      expect(result.isOk()).toBe(true);
      if (result._tag === 'Ok') {
        expect(result.value.metadata.verificationSourcesUsed).toContain('academic');
        expect(result.value.metadata.verificationSourcesUsed).toContain('government');
      }
    });
  });

  describe('REQ-EXT-FCK-001: 複数ソース検証', () => {
    let checker: FactChecker;

    beforeEach(() => {
      checker = new FactChecker();
    });

    it('verifyWithMultipleSources() が結果を返す', async () => {
      const result = await checker.verifyWithMultipleSources(
        'Water boils at 100 degrees Celsius at sea level.'
      );

      expect(result.isOk()).toBe(true);
      if (result._tag === 'Ok') {
        expect(result.value.claim).toBe('Water boils at 100 degrees Celsius at sea level.');
        expect(typeof result.value.sourceCount).toBe('number');
        expect(typeof result.value.meetsMinimumSources).toBe('boolean');
        expect(typeof result.value.agreementScore).toBe('number');
        expect(result.value.agreementScore).toBeGreaterThanOrEqual(0);
        expect(result.value.agreementScore).toBeLessThanOrEqual(1);
        expect(Array.isArray(result.value.sourceResults)).toBe(true);
        expect(typeof result.value.overallVerdict).toBe('string');
        expect(typeof result.value.confidenceScore).toBe('number');
        expect(result.value.confidenceScore).toBeGreaterThanOrEqual(0);
        expect(result.value.confidenceScore).toBeLessThanOrEqual(100);
        expect(typeof result.value.summary).toBe('string');
      }
    });

    it('minSources オプションが機能する', async () => {
      const result = await checker.verifyWithMultipleSources(
        'The Earth revolves around the Sun.',
        { minSources: 3 }
      );

      expect(result.isOk()).toBe(true);
      if (result._tag === 'Ok') {
        // meetsMinimumSources は sourceCount >= minSources
        if (result.value.sourceCount >= 3) {
          expect(result.value.meetsMinimumSources).toBe(true);
        } else {
          expect(result.value.meetsMinimumSources).toBe(false);
        }
      }
    });

    it('空の主張に対してエラーを返す', async () => {
      const result = await checker.verifyWithMultipleSources('');

      expect(result.isOk()).toBe(false);
      if (result._tag === 'Err') {
        expect(result.error.code).toBe('INVALID_CLAIM');
      }
    });

    it('sourceTypes オプションが機能する', async () => {
      const result = await checker.verifyWithMultipleSources(
        'Gravity is a fundamental force.',
        { sourceTypes: ['academic', 'government'] }
      );

      expect(result.isOk()).toBe(true);
    });
  });

  describe('REQ-EXT-FCK-002: 信頼度スコア計算', () => {
    let checker: FactChecker;

    beforeEach(() => {
      checker = new FactChecker();
    });

    it('calculateConfidenceScore() が正しい構造を返す', () => {
      const mockEvidence: Evidence[] = [
        {
          id: 'ev1',
          sourceName: 'Source A',
          sourceUrl: 'https://example.com/a',
          sourceType: 'trusted_news',
          excerpt: 'This is supporting evidence.',
          relation: 'supports',
          credibilityScore: 0.9,
          retrievedAt: new Date(),
          publishedDate: new Date(),
        },
        {
          id: 'ev2',
          sourceName: 'Source B',
          sourceUrl: 'https://example.com/b',
          sourceType: 'academic',
          excerpt: 'This also supports.',
          relation: 'supports',
          credibilityScore: 0.85,
          retrievedAt: new Date(),
          publishedDate: new Date(),
        },
      ];

      const result = checker.calculateConfidenceScore(mockEvidence);

      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.breakdown).toBeDefined();
      expect(typeof result.breakdown.sourceAgreement).toBe('number');
      expect(typeof result.breakdown.sourceCredibility).toBe('number');
      expect(typeof result.breakdown.evidenceQuantity).toBe('number');
      expect(typeof result.breakdown.consistency).toBe('number');
      expect(typeof result.breakdown.recency).toBe('number');
      expect(['very_high', 'high', 'moderate', 'low', 'very_low']).toContain(result.level);
      expect(typeof result.explanation).toBe('string');
    });

    it('エビデンスがない場合はスコア0を返す', () => {
      const result = checker.calculateConfidenceScore([]);

      expect(result.score).toBe(0);
      expect(result.level).toBe('very_low');
    });

    it('支持エビデンスが多いと高いスコアを返す', () => {
      const supportingEvidence: Evidence[] = Array.from({ length: 5 }, (_, i) => ({
        id: `ev${i}`,
        sourceName: `Source ${i}`,
        sourceUrl: `https://example${i}.com`,
        sourceType: 'trusted_news' as const,
        excerpt: 'Supporting evidence.',
        relation: 'supports' as const,
        credibilityScore: 0.9,
        retrievedAt: new Date(),
        publishedDate: new Date(),
      }));

      const result = checker.calculateConfidenceScore(supportingEvidence);

      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(['very_high', 'high']).toContain(result.level);
    });

    it('矛盾エビデンスがあると低いスコアを返す', () => {
      const mixedEvidence: Evidence[] = [
        {
          id: 'ev1',
          sourceName: 'Source A',
          sourceUrl: 'https://example.com/a',
          sourceType: 'trusted_news',
          excerpt: 'Supporting evidence.',
          relation: 'supports',
          credibilityScore: 0.8,
          retrievedAt: new Date(),
        },
        {
          id: 'ev2',
          sourceName: 'Source B',
          sourceUrl: 'https://example.com/b',
          sourceType: 'trusted_news',
          excerpt: 'Contradicting evidence.',
          relation: 'contradicts',
          credibilityScore: 0.8,
          retrievedAt: new Date(),
        },
      ];

      const result = checker.calculateConfidenceScore(mixedEvidence);

      // 矛盾があるとスコアが下がる
      expect(result.score).toBeLessThan(90);
    });

    it('agreementScore パラメータが反映される', () => {
      const evidence: Evidence[] = [
        {
          id: 'ev1',
          sourceName: 'Source A',
          sourceUrl: 'https://example.com/a',
          sourceType: 'trusted_news',
          excerpt: 'Neutral evidence.',
          relation: 'neutral',
          credibilityScore: 0.7,
          retrievedAt: new Date(),
        },
      ];

      const highAgreement = checker.calculateConfidenceScore(evidence, 0.9);
      const lowAgreement = checker.calculateConfidenceScore(evidence, 0.2);

      expect(highAgreement.score).toBeGreaterThan(lowAgreement.score);
    });
  });
});
