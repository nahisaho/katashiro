/**
 * QualityScorer Unit Tests
 *
 * @task TSK-025
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  QualityScorer,
  QualityScore,
  QualityDimension,
} from '../../src/quality/quality-scorer.js';

describe('QualityScorer', () => {
  let scorer: QualityScorer;

  beforeEach(() => {
    scorer = new QualityScorer();
  });

  describe('scoreContent', () => {
    it('should score content quality', () => {
      const text = `
        このドキュメントでは、TypeScriptの基本について説明します。
        
        ## 型システム
        TypeScriptは静的型付け言語です。変数に型を指定できます。
        
        ## インターフェース
        インターフェースはオブジェクトの構造を定義します。
        
        ## 参考文献
        - TypeScript公式ドキュメント: https://typescriptlang.org
      `;
      
      const score = scorer.scoreContent(text);
      expect(score.overall).toBeGreaterThan(0);
      expect(score.overall).toBeLessThanOrEqual(1);
      expect(score.dimensions.length).toBeGreaterThan(0);
    });

    it('should handle empty text', () => {
      const score = scorer.scoreContent('');
      expect(score.overall).toBe(0);
    });

    it('should include dimension scores', () => {
      const text = 'サンプルテキストです。これはテスト用の文章です。';
      const score = scorer.scoreContent(text);
      
      const dimensions = score.dimensions.map(d => d.name);
      expect(dimensions).toContain('readability');
      expect(dimensions).toContain('completeness');
    });
  });

  describe('scoreReadability', () => {
    it('should score readability', () => {
      const text = '短い文章。もう一つの文。';
      const score = scorer.scoreReadability(text);
      
      expect(score.score).toBeGreaterThan(0);
      expect(score.score).toBeLessThanOrEqual(1);
    });

    it('should penalize very long sentences', () => {
      const shortText = '短い文。これも短い。もう一つの短い文。';
      const longText = 'この文章は非常に長い文章であり、読みにくさを増加させるために意図的に長く書かれており、一般的な読者にとっては理解しにくい構造になっている可能性があります。';
      
      const shortScore = scorer.scoreReadability(shortText);
      const longScore = scorer.scoreReadability(longText);
      
      expect(shortScore.score).toBeGreaterThanOrEqual(longScore.score);
    });
  });

  describe('scoreCompleteness', () => {
    it('should score completeness with headings', () => {
      const withStructure = `
# タイトル

これは概要文です。

## セクション1

ここに内容があります。詳細な説明が続きます。

## セクション2

別の内容があります。さらに詳しく説明します。

- リスト項目1
- リスト項目2
      `;
      
      const score = scorer.scoreCompleteness(withStructure);
      expect(score.score).toBeGreaterThanOrEqual(0.3);
    });

    it('should score completeness without structure', () => {
      const noStructure = '単なるテキスト';
      const score = scorer.scoreCompleteness(noStructure);
      expect(score.score).toBeLessThan(0.5);
    });
  });

  describe('scoreCitation', () => {
    it('should score content with citations', () => {
      const withCitations = `
        研究によると[1]、この結果は重要です。
        参考: https://example.com
      `;
      
      const score = scorer.scoreCitation(withCitations);
      expect(score.score).toBeGreaterThan(0.3);
    });

    it('should penalize no citations', () => {
      const noCitations = 'この文章には参照がありません。';
      const score = scorer.scoreCitation(noCitations);
      expect(score.score).toBeLessThan(0.5);
    });
  });

  describe('scoreObjectivity', () => {
    it('should score objective text higher', () => {
      const objective = 'データによると、売上は10%増加しました。';
      const subjective = '私は絶対にこれが最高だと思います！素晴らしい！';
      
      const objectiveScore = scorer.scoreObjectivity(objective);
      const subjectiveScore = scorer.scoreObjectivity(subjective);
      
      expect(objectiveScore.score).toBeGreaterThan(subjectiveScore.score);
    });
  });

  describe('scoreFreshness', () => {
    it('should score content with recent dates higher', () => {
      const currentYear = new Date().getFullYear();
      const recent = `${currentYear}年の最新情報です。`;
      const old = '2010年の情報です。';
      
      const recentScore = scorer.scoreFreshness(recent);
      const oldScore = scorer.scoreFreshness(old);
      
      expect(recentScore.score).toBeGreaterThan(oldScore.score);
    });

    it('should handle no dates', () => {
      const noDate = '日付のない文章です。';
      const score = scorer.scoreFreshness(noDate);
      expect(score.score).toBe(0.5); // Default neutral score
    });
  });

  describe('getQualityReport', () => {
    it('should generate comprehensive report', () => {
      const text = `
        # ガイド
        このガイドでは基本を説明します。
        
        ## 概要
        重要な内容です。
        
        ## 参考
        - https://example.com
      `;
      
      const report = scorer.getQualityReport(text);
      expect(report.summary).toBeDefined();
      expect(report.strengths.length).toBeGreaterThanOrEqual(0);
      expect(report.improvements.length).toBeGreaterThanOrEqual(0);
    });
  });
});
