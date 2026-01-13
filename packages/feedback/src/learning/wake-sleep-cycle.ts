/**
 * Wake-Sleep Learning Cycle
 * 
 * @fileoverview DreamCoder風Wake-Sleep自動学習システム
 * @module @nahisaho/katashiro-feedback
 * @since 0.2.12
 * 
 * @description
 * Wake Phase: ユーザーインタラクションを観察してパターンを抽出
 * Sleep Phase: パターンライブラリを圧縮・最適化
 */

import { generateId, formatTimestamp } from '@nahisaho/katashiro-core';
import type {
  WakeSleepConfig,
  WakeObservation,
  LearnedPattern,
  SleepResult,
  WakeSleepStats,
  PatternMatch,
  LibraryExport,
  ObservationType,
} from './wake-sleep-types.js';
import { PatternQualityEvaluator } from './quality-evaluator.js';
import { PatternCompressor } from './pattern-compressor.js';

/**
 * 内部用の変更可能なパターン型
 */
interface MutableLearnedPattern extends Omit<LearnedPattern, 'contexts'> {
  contexts: string[];
}

/**
 * Wake-Sleep Learning Cycle
 * 
 * @example
 * ```typescript
 * const wakeSleep = new WakeSleepCycle();
 * 
 * // Wakeフェーズ: 観察を記録
 * wakeSleep.wake({
 *   id: 'obs-1',
 *   type: 'search_query',
 *   input: 'AI 機械学習',
 *   output: JSON.stringify({ results: [...] }),
 *   context: { domain: 'technology' },
 *   timestamp: new Date().toISOString(),
 *   success: true,
 * });
 * 
 * // パターンマッチング
 * const matches = wakeSleep.matchPatterns('AI ディープラーニング', 'search_query');
 * 
 * // Sleepフェーズ: ライブラリ最適化
 * const result = await wakeSleep.sleep();
 * ```
 */
export class WakeSleepCycle {
  private config: WakeSleepConfig;
  private library: Map<string, MutableLearnedPattern>;
  private observations: WakeObservation[];
  private qualityEvaluator: PatternQualityEvaluator;
  private compressor: PatternCompressor;
  private stats: {
    totalWakeObservations: number;
    totalSleepCycles: number;
    currentLibrarySize: number;
    averagePatternQuality: number;
    totalPatternsExtracted: number;
    totalPatternsRemoved: number;
    patternsByType: Record<ObservationType, number>;
    lastWakeAt?: string;
    lastSleepAt?: string;
  };
  private sleepTimer?: ReturnType<typeof setInterval>;

  constructor(config?: Partial<WakeSleepConfig>) {
    this.config = {
      minQualityThreshold: 0.3,
      maxLibrarySize: 500,
      compressionIterations: 3,
      autoSleep: true,
      wakeThreshold: 50,
      patternTTLDays: 90,
      ...config,
    };
    this.library = new Map();
    this.observations = [];
    this.qualityEvaluator = new PatternQualityEvaluator();
    this.compressor = new PatternCompressor();
    this.stats = {
      totalWakeObservations: 0,
      totalSleepCycles: 0,
      currentLibrarySize: 0,
      averagePatternQuality: 0,
      totalPatternsExtracted: 0,
      totalPatternsRemoved: 0,
      patternsByType: {
        search_query: 0,
        analysis_result: 0,
        report_generation: 0,
        user_feedback: 0,
        entity_extraction: 0,
        summary_creation: 0,
        citation_format: 0,
      },
    };

    // 自動Sleepを有効化
    if (this.config.autoSleep) {
      this.startAutoSleep();
    }
  }

  // ========================================
  // Wake Phase
  // ========================================

  /**
   * 観察を記録してパターンを抽出（Wakeフェーズ）
   */
  wake(observation: WakeObservation): void {
    this.observations.push(observation);
    this.stats.totalWakeObservations++;
    this.stats.lastWakeAt = formatTimestamp(new Date());

    // 観察からパターンを抽出
    const patterns = this.extractPatternsFromObservation(observation);

    // ライブラリに追加
    for (const pattern of patterns) {
      this.addToLibrary(pattern);
      this.stats.totalPatternsExtracted++;
      this.stats.patternsByType[pattern.type]++;
    }

    // 閾値を超えたら自動Sleep
    if (this.config.autoSleep && this.observations.length >= this.config.wakeThreshold) {
      void this.sleep();
    }
  }

  /**
   * 観察からパターンを抽出
   * v0.3.0: 高度なテンプレート生成、キーワード抽出強化
   */
  private extractPatternsFromObservation(observation: WakeObservation): MutableLearnedPattern[] {
    const patterns: MutableLearnedPattern[] = [];
    const now = formatTimestamp(new Date());

    // キーワードを抽出（v0.3.0: 高度な抽出）
    const keywords = this.extractKeywords(observation.input);
    const domain = observation.context.domain || 'general';
    
    // 入力テンプレートを生成（v0.3.0: ドメイン対応）
    const inputTemplate = this.createInputTemplate(observation.input, observation.type, {
      domain,
      keywords,
      context: { ...observation.context } as Record<string, unknown>,
    });
    
    // 出力テンプレートを生成
    const outputTemplate = this.createOutputTemplate(observation.output, observation.type);

    // コンテキストを抽出（v0.3.0: 拡張コンテキスト）
    const contexts = this.extractContexts(observation);
    
    // 入力の特徴を抽出
    const inputFeatures = this.extractInputFeatures(observation.input);

    // パターンを作成
    const pattern: MutableLearnedPattern = {
      id: this.generatePatternId(observation),
      name: this.generatePatternName(observation),
      type: observation.type,
      inputTemplate,
      outputTemplate,
      quality: observation.success ? (observation.rating ?? 0.7) : 0.3,
      frequency: 1,
      holes: this.countHoles(inputTemplate) + this.countHoles(outputTemplate),
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
      contexts: [...contexts, ...inputFeatures],
    };

    patterns.push(pattern);
    return patterns;
  }

  /**
   * キーワードを抽出（v0.3.0）
   * TF-IDF風の重要語抽出
   */
  private extractKeywords(input: string): string[] {
    // 日本語と英語の単語を抽出
    const words = input
      .split(/[\s、。！？,.!?\n]+/)
      .filter(w => w.length >= 2)
      .map(w => w.toLowerCase());
    
    // ストップワードを除外
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
      'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
      'から', 'まで', 'より', 'など', 'ため', 'こと', 'もの', 'ところ',
      'について', 'として', 'において', 'に関して', 'によって',
    ]);
    
    const filtered = words.filter(w => !stopWords.has(w));
    
    // 頻度でソートして上位5件を返す
    const freq = new Map<string, number>();
    for (const word of filtered) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }
    
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * 入力の特徴を抽出（v0.3.0）
   */
  private extractInputFeatures(input: string): string[] {
    const features: string[] = [];
    
    // 長さカテゴリ
    const length = input.length;
    if (length < 50) features.push('length:short');
    else if (length < 200) features.push('length:medium');
    else if (length < 500) features.push('length:long');
    else features.push('length:very_long');
    
    // 言語検出（簡易）
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(input);
    const hasEnglish = /[a-zA-Z]{3,}/.test(input);
    if (hasJapanese && hasEnglish) features.push('lang:mixed');
    else if (hasJapanese) features.push('lang:ja');
    else if (hasEnglish) features.push('lang:en');
    
    // 数値の有無
    if (/\d+%|\d+億|\d+万|\$\d+|\d+円/.test(input)) {
      features.push('contains:numbers');
    }
    
    // URLの有無
    if (/https?:\/\//.test(input)) {
      features.push('contains:url');
    }
    
    // 専門用語の有無（簡易検出）
    const techTerms = /AI|ML|DX|API|SDK|SaaS|IoT|クラウド|データ|アルゴリズム/i;
    if (techTerms.test(input)) {
      features.push('domain:tech');
    }
    
    const bizTerms = /売上|利益|市場|戦略|経営|マーケティング|顧客|競合/;
    if (bizTerms.test(input)) {
      features.push('domain:business');
    }
    
    return features;
  }

  /**
   * 入力テンプレートを生成
   * v0.3.0: ドメイン対応、より詳細なテンプレート
   */
  private createInputTemplate(
    input: string, 
    type: ObservationType,
    options?: { domain?: string; keywords?: string[]; context?: Record<string, unknown> }
  ): string {
    const domain = options?.domain || 'general';
    const keywords = options?.keywords || [];
    const keywordStr = keywords.slice(0, 3).join(',') || '{{keywords}}';
    
    switch (type) {
      case 'search_query':
        // v0.3.0: ドメイン・キーワード対応
        return this.templateizeSearchQuery(input, domain, keywords);

      case 'analysis_result':
        // v0.3.0: より詳細なテンプレート
        const textLength = input.length;
        const lengthCategory = textLength < 200 ? 'short' : textLength < 500 ? 'medium' : 'long';
        return `ANALYZE[${domain}]: len=${lengthCategory} kw=[${keywordStr}]`;

      case 'report_generation':
        // v0.3.0: セクション数を推定
        const sectionCount = (input.match(/heading|title|section/gi) || []).length || 'N';
        return `REPORT[${domain}]: sections=${sectionCount} kw=[${keywordStr}]`;

      case 'entity_extraction':
        // v0.3.0: 抽出対象を特定
        const hasPersons = /氏|CEO|社長|部長|さん/.test(input);
        const hasOrgs = /株式会社|会社|Corp|Inc|Ltd/.test(input);
        const targets = [hasPersons ? 'person' : '', hasOrgs ? 'org' : ''].filter(Boolean).join(',') || 'all';
        return `EXTRACT[${domain}]: targets=[${targets}] kw=[${keywordStr}]`;

      case 'summary_creation':
        // v0.3.0: 入力特性を反映
        const inputLen = input.length;
        return `SUMMARIZE[${domain}]: input_len=${inputLen} kw=[${keywordStr}]`;

      case 'citation_format':
        return `CITE[${domain}]: kw=[${keywordStr}]`;

      case 'user_feedback':
        return `FEEDBACK[${domain}]: kw=[${keywordStr}]`;

      default:
        return `${type}[${domain}]: ${input.slice(0, 50)}`;
    }
  }

  /**
   * 検索クエリをテンプレート化
   * v0.3.0: ドメイン・キーワード対応
   */
  private templateizeSearchQuery(query: string, domain: string, keywords: string[]): string {
    const keywordStr = keywords.slice(0, 3).join(',') || '{{query}}';
    
    // クエリの構造を分析
    const hasQuestion = /\?|？|とは|について|どう/.test(query);
    const hasComparison = /比較|vs|対|違い/.test(query);
    const hasHow = /方法|やり方|手順|how/i.test(query);
    
    let queryType = 'info';
    if (hasQuestion) queryType = 'question';
    else if (hasComparison) queryType = 'compare';
    else if (hasHow) queryType = 'howto';
    
    return `SEARCH[${domain}:${queryType}]: kw=[${keywordStr}]`;
  }

  /**
   * 出力テンプレートを生成
   */
  private createOutputTemplate(output: string, type: ObservationType): string {
    switch (type) {
      case 'search_query':
        return `RESULTS: {{count}} items [{{preview}}]`;

      case 'analysis_result':
        return `ANALYSIS: keywords={{keywords}} complexity={{complexity}}`;

      case 'report_generation':
        return `REPORT_OUTPUT: sections={{sectionCount}} format={{format}}`;

      case 'entity_extraction':
        return `ENTITIES: persons={{persons}} orgs={{orgs}} locations={{locations}}`;

      case 'summary_creation':
        return `SUMMARY: {{summary}}`;

      case 'citation_format':
        return `CITATION: {{formatted}}`;

      case 'user_feedback':
        return `FEEDBACK: rating={{rating}} comment={{comment}}`;

      default:
        return output.slice(0, 100);
    }
  }

  /**
   * コンテキストを抽出
   */
  private extractContexts(observation: WakeObservation): string[] {
    const contexts: string[] = [];
    const ctx = observation.context;
    
    if (ctx.language) {
      contexts.push(`language:${ctx.language}`);
    }
    if (ctx.domain) {
      contexts.push(`domain:${ctx.domain}`);
    }
    if (ctx.sourceType) {
      contexts.push(`sourceType:${ctx.sourceType}`);
    }

    contexts.push(`type:${observation.type}`);
    contexts.push(`success:${observation.success}`);

    return contexts;
  }

  /**
   * ライブラリにパターンを追加
   */
  private addToLibrary(pattern: MutableLearnedPattern): void {
    // 既存の類似パターンを検索
    const existing = this.findSimilarPattern(pattern);

    if (existing) {
      // 既存パターンを更新
      this.updatePattern(existing, pattern);
    } else {
      // 新規追加
      this.library.set(pattern.id, pattern);
      this.stats.currentLibrarySize++;
    }
  }

  /**
   * 類似パターンを検索
   */
  private findSimilarPattern(pattern: LearnedPattern): MutableLearnedPattern | null {
    for (const existing of this.library.values()) {
      if (existing.type !== pattern.type) continue;

      const similarity = this.compressor.calculateSimilarity(existing, pattern);
      if (similarity > 0.8) {
        return existing;
      }
    }
    return null;
  }

  /**
   * 既存パターンを更新
   */
  private updatePattern(existing: MutableLearnedPattern, newPattern: LearnedPattern): void {
    const now = formatTimestamp(new Date());
    
    // 頻度を増加
    existing.frequency++;
    
    // 品質を更新（指数移動平均）
    existing.quality = existing.quality * 0.7 + newPattern.quality * 0.3;
    
    // コンテキストをマージ
    existing.contexts = [...new Set([...existing.contexts, ...newPattern.contexts])];
    
    // タイムスタンプを更新
    existing.updatedAt = now;
    existing.lastUsedAt = now;
  }

  // ========================================
  // Pattern Matching
  // ========================================

  /**
   * 入力に対してパターンマッチング
   * v0.3.0: 複合スコアリング、コンテキストフィルタリング
   */
  matchPatterns(input: string, type?: ObservationType, context?: Record<string, string>): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const inputLower = input.toLowerCase();
    const inputTokens = new Set(inputLower.split(/[\s,、。]+/).filter(w => w.length > 1));
    const inputKeywords = this.extractKeywords(input);
    const inputFeatures = new Set(this.extractInputFeatures(input));

    for (const pattern of this.library.values()) {
      // タイプフィルタリング
      if (type && pattern.type !== type) continue;

      // v0.3.0: 複合スコアリング
      const score = this.calculateMatchScoreV3(
        pattern, 
        inputLower, 
        inputTokens, 
        inputKeywords,
        inputFeatures,
        context
      );
      
      if (score > 0.2) {
        matches.push({
          pattern: pattern as LearnedPattern,
          score,
          variables: this.extractVariables(pattern, input),
          suggestedOutput: this.generateSuggestedOutput(pattern, input),
        });
      }
    }

    // スコアでソート
    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * マッチスコアを計算（v0.3.0: 複合スコアリング）
   */
  private calculateMatchScoreV3(
    pattern: LearnedPattern,
    inputLower: string,
    _inputTokens: Set<string>,
    inputKeywords: string[],
    inputFeatures: Set<string>,
    context?: Record<string, string>
  ): number {
    // 1. キーワードマッチング（Jaccard類似度）
    const templateKeywords = this.extractTemplateKeywords(pattern.inputTemplate);
    const keywordScore = this.calculateJaccardSimilarity(
      new Set(inputKeywords),
      new Set(templateKeywords)
    );

    // 2. コンテキストマッチング
    const patternContexts = new Set(pattern.contexts);
    const contextScore = this.calculateContextMatchScore(inputFeatures, patternContexts, context);

    // 3. テンプレート構造マッチング
    const structureScore = this.calculateStructureMatchScore(pattern.inputTemplate, inputLower);

    // 4. 品質ブースト（v0.3.3: さらに増加）
    const qualityBoost = pattern.quality * 0.40;

    // 5. 鮮度ブースト（日数経過でペナルティ）
    const daysSinceUse = (Date.now() - new Date(pattern.lastUsedAt).getTime()) / (1000 * 60 * 60 * 24);
    // v0.3.3: 0.8日で減衰（非常に積極的な差別化）
    const freshnessMultiplier = Math.exp(-daysSinceUse / 0.8);

    // v0.3.3: より多様なスコア分布のための重み調整
    // 品質による大きな差別化（0.0-2.8の範囲）
    const qualityMultiplier = pattern.quality * 2.8;
    
    // 頻度による緩やかなボーナス
    const frequencyBonus = Math.min(Math.log10(pattern.frequency + 1) / 4, 0.25);
    
    // ベーススコア計算（キーワード重視75%）
    const rawScore = keywordScore * 0.75 + contextScore * 0.15 + structureScore * 0.10;
    
    // 品質・鮮度で大きく差別化
    const score = rawScore * qualityMultiplier * freshnessMultiplier + frequencyBonus + qualityBoost;

    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * テンプレートからキーワードを抽出
   */
  private extractTemplateKeywords(template: string): string[] {
    // ホールを除去
    const cleaned = template.replace(/\{\{[^}]+\}\}/g, '');
    
    // ブラケット内のキーワードを抽出
    const bracketKeywords = template.match(/\[([^\]]+)\]/g)?.map(m => 
      m.slice(1, -1).split(',').map(k => k.trim().toLowerCase())
    ).flat() || [];
    
    // 通常の単語を抽出
    const words = cleaned
      .toLowerCase()
      .split(/[\s\[\]:=,]+/)
      .filter(w => w.length > 2 && !/^(search|analyze|report|extract|summarize|cite|feedback)$/i.test(w));
    
    return [...new Set([...words, ...bracketKeywords])];
  }

  /**
   * Jaccard類似度を計算
   */
  private calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 && setB.size === 0) return 0.5;
    if (setA.size === 0 || setB.size === 0) return 0;
    
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    
    return intersection.size / union.size;
  }

  /**
   * コンテキストマッチスコアを計算
   */
  private calculateContextMatchScore(
    inputFeatures: Set<string>,
    patternContexts: Set<string>,
    context?: Record<string, string>
  ): number {
    let matchCount = 0;
    let totalChecks = 0;
    
    // 入力特徴とパターンコンテキストのマッチング
    for (const feature of inputFeatures) {
      totalChecks++;
      if (patternContexts.has(feature)) {
        matchCount++;
      }
    }
    
    // 明示的なコンテキストのマッチング
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        const contextStr = `${key}:${value}`;
        totalChecks++;
        if (patternContexts.has(contextStr)) {
          matchCount += 2; // 明示的なコンテキストは重み2倍
        }
      }
    }
    
    return totalChecks > 0 ? matchCount / totalChecks : 0.5;
  }

  /**
   * 構造マッチスコアを計算
   */
  private calculateStructureMatchScore(template: string, input: string): number {
    // テンプレートの構造要素を抽出
    const templateDomain = template.match(/\[([^\]:]+)/)?.[1] || '';
    const templateType = template.match(/^(\w+)\[/)?.[1] || '';
    
    let score = 0.5; // ベーススコア
    
    // ドメインマッチング
    if (templateDomain && input.toLowerCase().includes(templateDomain.toLowerCase())) {
      score += 0.25;
    }
    
    // タイプ関連キーワードマッチング
    const typeKeywords: Record<string, string[]> = {
      'SEARCH': ['検索', '調べ', '探', 'search', 'find', 'query'],
      'ANALYZE': ['分析', '解析', 'analyze', 'analysis'],
      'REPORT': ['レポート', '報告', '文書', 'report', 'document'],
      'EXTRACT': ['抽出', '取り出', 'extract', 'get'],
      'SUMMARIZE': ['要約', 'まとめ', 'summary', 'summarize'],
    };
    
    const keywords = typeKeywords[templateType] || [];
    if (keywords.some(kw => input.toLowerCase().includes(kw))) {
      score += 0.25;
    }
    
    return Math.min(score, 1);
  }

  /**
   * 変数を抽出
   */
  private extractVariables(pattern: LearnedPattern, input: string): Record<string, string> {
    const variables: Record<string, string> = {};
    
    // ホール名を抽出
    const holes = pattern.inputTemplate.match(/\{\{(\w+)\}\}/g) || [];
    const words = input.split(/\s+/);
    
    holes.forEach((hole, index) => {
      const name = hole.replace(/\{\{|\}\}/g, '');
      variables[name] = words[index] || '';
    });

    return variables;
  }

  /**
   * 提案出力を生成
   */
  private generateSuggestedOutput(pattern: LearnedPattern, input: string): string {
    // 出力テンプレートのホールを埋める（簡略化版）
    let output = pattern.outputTemplate;
    
    // 入力から抽出した情報でホールを埋める
    const words = input.split(/\s+/);
    output = output.replace(/\{\{keyword\}\}/g, words[0] || '');
    output = output.replace(/\{\{[^}]+\}\}/g, '...');

    return output;
  }

  // ========================================
  // Sleep Phase
  // ========================================

  /**
   * ライブラリを最適化（Sleepフェーズ）
   */
  async sleep(): Promise<SleepResult> {
    const startTime = Date.now();
    const beforeCount = this.library.size;
    const patterns = [...this.library.values()] as LearnedPattern[];
    const beforeMDL = this.compressor.calculateMDL(patterns);

    // 1. 品質フィルタリング
    const qualityFiltered = this.qualityEvaluator.filterByQuality(
      patterns,
      this.config.minQualityThreshold
    );

    // 2. MDL圧縮（複数イテレーション）
    let compressed = qualityFiltered;
    for (let i = 0; i < this.config.compressionIterations; i++) {
      compressed = this.compressor.compressLibrary(compressed);
    }

    // 3. サイズ制限
    const sizeLimited = this.limitLibrarySize(compressed);

    // 4. ライブラリを更新
    this.library.clear();
    for (const pattern of sizeLimited) {
      this.library.set(pattern.id, pattern as MutableLearnedPattern);
    }

    // 5. 統計を更新
    const afterMDL = this.compressor.calculateMDL(sizeLimited);
    const removedCount = beforeCount - this.library.size;
    
    this.stats.totalSleepCycles++;
    this.stats.currentLibrarySize = this.library.size;
    this.stats.totalPatternsRemoved += removedCount;
    this.stats.lastSleepAt = formatTimestamp(new Date());

    // 平均品質を再計算
    if (sizeLimited.length > 0) {
      const totalQuality = sizeLimited.reduce((sum, p) => sum + p.quality, 0);
      this.stats.averagePatternQuality = totalQuality / sizeLimited.length;
    }

    // 観察をクリア
    this.observations = [];

    return {
      patternsConsolidated: beforeCount - sizeLimited.length - removedCount,
      patternsRemoved: removedCount,
      compressionRatio: beforeCount > 0 ? sizeLimited.length / beforeCount : 1,
      mdlImprovement: beforeMDL.total > 0 ? (beforeMDL.total - afterMDL.total) / beforeMDL.total : 0,
      cycleTimeMs: Date.now() - startTime,
      beforeCount,
      afterCount: sizeLimited.length,
    };
  }

  /**
   * ライブラリサイズを制限
   */
  private limitLibrarySize(patterns: LearnedPattern[]): LearnedPattern[] {
    if (patterns.length <= this.config.maxLibrarySize) {
      return patterns;
    }

    // 品質でランキングして上位N件を保持
    const ranked = this.qualityEvaluator.rankPatterns(patterns);
    return ranked.slice(0, this.config.maxLibrarySize).map(r => r.pattern);
  }

  // ========================================
  // Auto Sleep
  // ========================================

  /**
   * 自動Sleepを開始
   */
  private startAutoSleep(): void {
    if (this.sleepTimer) return;

    // 5分ごとにチェック
    this.sleepTimer = setInterval(async () => {
      // 観察が閾値を超えていたらSleep
      if (this.observations.length >= this.config.wakeThreshold) {
        await this.sleep();
      }
    }, 5 * 60 * 1000);
  }

  /**
   * 自動Sleepを停止
   */
  stopAutoSleep(): void {
    if (this.sleepTimer) {
      clearInterval(this.sleepTimer);
      this.sleepTimer = undefined;
    }
  }

  // ========================================
  // Library Management
  // ========================================

  /**
   * ライブラリをエクスポート
   */
  exportLibrary(): LibraryExport {
    return {
      version: '1.0.0',
      exportedAt: formatTimestamp(new Date()),
      config: this.config,
      patterns: [...this.library.values()] as LearnedPattern[],
      stats: this.getStats(),
    };
  }

  /**
   * ライブラリをインポート
   */
  importLibrary(data: LibraryExport): void {
    // 設定を更新
    this.config = { ...this.config, ...data.config };

    // パターンをインポート
    for (const pattern of data.patterns) {
      this.library.set(pattern.id, pattern as MutableLearnedPattern);
    }

    // 統計をマージ
    this.stats.totalWakeObservations += data.stats.totalWakeObservations;
    this.stats.totalSleepCycles += data.stats.totalSleepCycles;
    this.stats.currentLibrarySize = this.library.size;
  }

  /**
   * 統計を取得
   */
  getStats(): WakeSleepStats {
    return {
      totalWakeObservations: this.stats.totalWakeObservations,
      totalSleepCycles: this.stats.totalSleepCycles,
      currentLibrarySize: this.stats.currentLibrarySize,
      averagePatternQuality: this.stats.averagePatternQuality,
      totalPatternsExtracted: this.stats.totalPatternsExtracted,
      totalPatternsRemoved: this.stats.totalPatternsRemoved,
      patternsByType: { ...this.stats.patternsByType },
      lastWakeAt: this.stats.lastWakeAt,
      lastSleepAt: this.stats.lastSleepAt,
    };
  }

  /**
   * ライブラリサイズを取得
   */
  getLibrarySize(): number {
    return this.library.size;
  }

  /**
   * パターンを取得
   */
  getPattern(id: string): LearnedPattern | undefined {
    return this.library.get(id);
  }

  /**
   * 全パターンを取得
   */
  getAllPatterns(): LearnedPattern[] {
    return [...this.library.values()];
  }

  /**
   * ライブラリをクリア
   */
  clearLibrary(): void {
    this.library.clear();
    this.observations = [];
    this.stats = {
      totalWakeObservations: 0,
      totalSleepCycles: 0,
      currentLibrarySize: 0,
      averagePatternQuality: 0,
      totalPatternsExtracted: 0,
      totalPatternsRemoved: 0,
      patternsByType: {
        search_query: 0,
        analysis_result: 0,
        report_generation: 0,
        user_feedback: 0,
        entity_extraction: 0,
        summary_creation: 0,
        citation_format: 0,
      },
    };
  }

  // ========================================
  // Feedback Loop (v0.3.0)
  // ========================================

  /**
   * フィードバックを記録してパターン品質を更新（v0.3.0）
   * 
   * @param patternId - フィードバック対象のパターンID
   * @param feedback - フィードバック情報
   */
  recordFeedback(patternId: string, feedback: {
    rating: number;           // 0-1
    success: boolean;
    comment?: string;
    context?: Record<string, string>;
  }): boolean {
    const pattern = this.library.get(patternId);
    if (!pattern) return false;

    const now = formatTimestamp(new Date());

    // v0.3.3: 品質を更新（指数移動平均、係数さらに増加）
    const alpha = 0.5; // 新しいフィードバックの重み（0.4→0.5）
    pattern.quality = pattern.quality * (1 - alpha) + feedback.rating * alpha;

    // 頻度を更新
    pattern.frequency++;

    // タイムスタンプを更新
    pattern.updatedAt = now;
    pattern.lastUsedAt = now;

    // コンテキストを追加
    if (feedback.context) {
      for (const [key, value] of Object.entries(feedback.context)) {
        const contextStr = `feedback:${key}:${value}`;
        if (!pattern.contexts.includes(contextStr)) {
          pattern.contexts.push(contextStr);
        }
      }
    }

    // 成功/失敗のコンテキストを追加
    const successContext = `feedback:success:${feedback.success}`;
    if (!pattern.contexts.includes(successContext)) {
      pattern.contexts.push(successContext);
    }

    // user_feedbackとして観察も記録
    this.wake({
      id: generateId('FEEDBACK'),
      type: 'user_feedback',
      input: patternId,
      output: JSON.stringify(feedback),
      context: { ...feedback.context, metadata: { patternId } },
      timestamp: now,
      success: feedback.success,
      rating: feedback.rating,
    });

    return true;
  }

  /**
   * バッチフィードバックを記録（v0.3.0）
   * 複数のパターンに対して一括でフィードバックを記録
   */
  recordBatchFeedback(feedbacks: Array<{
    patternId: string;
    rating: number;
    success: boolean;
    comment?: string;
  }>): { success: number; failed: number } {
    let success = 0;
    let failed = 0;

    for (const feedback of feedbacks) {
      if (this.recordFeedback(feedback.patternId, feedback)) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * 自動フィードバック（v0.3.0）
   * 実行結果から自動的にパターン品質を調整
   */
  autoFeedback(patternId: string, executionResult: {
    success: boolean;
    executionTimeMs?: number;
    outputQuality?: number; // 0-1
    error?: string;
  }): boolean {
    const pattern = this.library.get(patternId);
    if (!pattern) return false;

    // 実行結果から評価スコアを計算
    let rating = executionResult.success ? 0.7 : 0.3;

    // 出力品質があればそれを使用
    if (executionResult.outputQuality !== undefined) {
      rating = executionResult.outputQuality;
    }

    // v0.3.2: 実行時間によるペナルティ/ボーナス（係数増加）
    if (executionResult.executionTimeMs !== undefined) {
      if (executionResult.executionTimeMs < 100) {
        rating += 0.08; // 高速実行ボーナス（増加）
      } else if (executionResult.executionTimeMs > 5000) {
        rating -= 0.15; // 低速ペナルティ（増加）
      }
    }

    // エラーがあれば品質を大きく下げる
    if (executionResult.error) {
      rating = Math.min(rating, 0.3);
    }

    rating = Math.max(0, Math.min(1, rating));

    return this.recordFeedback(patternId, {
      rating,
      success: executionResult.success,
      context: {
        source: 'auto',
        executionTimeMs: String(executionResult.executionTimeMs || 0),
      },
    });
  }

  /**
   * 低品質パターンを特定（v0.3.0）
   * フィードバックに基づいて改善が必要なパターンをリスト
   */
  findLowQualityPatterns(threshold: number = 0.4): LearnedPattern[] {
    return [...this.library.values()]
      .filter(p => p.quality < threshold)
      .sort((a, b) => a.quality - b.quality);
  }

  /**
   * パターンの改善提案を取得
   * v0.3.2: reason, action, impactフィールドを追加
   */
  getSuggestions(): Array<{
    patternId: string;
    type: ObservationType;
    quality: number;
    issue: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
    reason: string;
    action: string;
    impact: 'critical' | 'significant' | 'minor';
  }> {
    const suggestions: Array<{
      patternId: string;
      type: ObservationType;
      quality: number;
      issue: string;
      suggestion: string;
      priority: 'high' | 'medium' | 'low';
      reason: string;
      action: string;
      impact: 'critical' | 'significant' | 'minor';
    }> = [];

    for (const pattern of this.library.values()) {
      // 低品質パターン
      if (pattern.quality < 0.4) {
        suggestions.push({
          patternId: pattern.id,
          type: pattern.type,
          quality: pattern.quality,
          issue: `品質スコアが低い (${pattern.quality.toFixed(2)})`,
          suggestion: 'より多くの成功例でトレーニングするか、テンプレートを改善してください',
          priority: 'high',
          reason: `品質${pattern.quality.toFixed(2)}は閾値0.4を下回っており、マッチング精度に影響します`,
          action: '成功例の追加 または テンプレートの具体化',
          impact: 'critical',
        });
      }

      // 使用頻度が低いパターン
      if (pattern.frequency < 3) {
        suggestions.push({
          patternId: pattern.id,
          type: pattern.type,
          quality: pattern.quality,
          issue: `使用頻度が低い (${pattern.frequency}回)`,
          suggestion: 'このパターンの使用ケースを増やすか、削除を検討してください',
          priority: 'medium',
          reason: `使用回数${pattern.frequency}回は十分なデータ量に達していません`,
          action: '類似入力での使用 または パターン削除',
          impact: 'minor',
        });
      }

      // 古いパターン
      const daysSinceUse = (Date.now() - new Date(pattern.lastUsedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUse > 30) {
        suggestions.push({
          patternId: pattern.id,
          type: pattern.type,
          quality: pattern.quality,
          issue: `${Math.floor(daysSinceUse)}日間未使用`,
          suggestion: 'このパターンが必要かどうか確認し、不要なら削除してください',
          priority: 'low',
          reason: `${Math.floor(daysSinceUse)}日間未使用のパターンは陳腐化している可能性があります`,
          action: 'パターンの有効性確認 または 削除',
          impact: 'minor',
        });
      }

      // ホールが多すぎるパターン
      if (pattern.holes > 10) {
        suggestions.push({
          patternId: pattern.id,
          type: pattern.type,
          quality: pattern.quality,
          issue: `テンプレートが汎用的すぎる (${pattern.holes}個のホール)`,
          suggestion: 'より具体的なテンプレートに分割することを検討してください',
          priority: 'medium',
          reason: `${pattern.holes}個のホールはマッチング精度を低下させ、出力品質に影響します`,
          action: 'テンプレート分割 または コンテキスト追加',
          impact: 'significant',
        });
      }
    }

    // 優先度でソート
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * パターンIDを生成
   */
  private generatePatternId(observation: WakeObservation): string {
    return generateId(`PAT-${observation.type}`);
  }

  /**
   * パターン名を生成
   */
  private generatePatternName(observation: WakeObservation): string {
    const typeNames: Record<ObservationType, string> = {
      search_query: 'Search',
      analysis_result: 'Analysis',
      report_generation: 'Report',
      user_feedback: 'Feedback',
      entity_extraction: 'Entity',
      summary_creation: 'Summary',
      citation_format: 'Citation',
    };

    const typeName = typeNames[observation.type] || observation.type;
    const inputPreview = observation.input.slice(0, 20);

    return `${typeName}: ${inputPreview}...`;
  }

  /**
   * テンプレート内のホール数をカウント
   */
  private countHoles(template: string): number {
    const matches = template.match(/\{\{[^}]+\}\}/g);
    return matches ? matches.length : 0;
  }
}
