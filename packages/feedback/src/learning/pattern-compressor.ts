/**
 * Pattern Compressor
 * 
 * @fileoverview MDLベースのパターン圧縮システム
 * @module @nahisaho/katashiro-feedback
 * @since 0.2.12
 * @updated 0.3.0 動的閾値調整、最小パターン数保証
 */

import type { LearnedPattern, ObservationType } from './wake-sleep-types.js';

/**
 * 圧縮設定
 */
export interface PatternCompressorConfig {
  /** 最小圧縮率（これ以上でないと圧縮しない） */
  readonly minCompressionRatio: number;
  /** 類似度閾値（これ以上でマージ） */
  readonly similarityThreshold: number;
  /** 最大マージ深度 */
  readonly maxMergeDepth: number;
  /** v0.3.0: タイプ別最小パターン数 */
  readonly minPatternsPerType: number;
  /** v0.3.0: 動的閾値調整を有効化 */
  readonly dynamicThreshold: boolean;
  /** v0.3.0: 多様性優先モード */
  readonly preserveDiversity: boolean;
}

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: PatternCompressorConfig = {
  minCompressionRatio: 1.1,
  similarityThreshold: 0.7,
  maxMergeDepth: 3,
  minPatternsPerType: 2,       // v0.3.0: タイプ別最低2パターン保証
  dynamicThreshold: true,     // v0.3.0: 動的閾値ON
  preserveDiversity: true,    // v0.3.0: 多様性優先ON
};

/**
 * MDL計算結果
 */
export interface MDLResult {
  /** ライブラリのMDL */
  readonly libraryMDL: number;
  /** データのMDL */
  readonly dataMDL: number;
  /** 合計MDL */
  readonly total: number;
  /** 内訳 */
  readonly breakdown: {
    patternCount: number;
    averagePatternSize: number;
    totalHoles: number;
  };
}

/**
 * Pattern Compressor
 * 
 * Minimum Description Length (MDL) 原理に基づくパターン圧縮：
 * - 類似パターンのマージ
 * - 冗長パターンの除去
 * - 最適なライブラリサイズの維持
 */
export class PatternCompressor {
  private config: PatternCompressorConfig;

  constructor(config?: Partial<PatternCompressorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * パターンライブラリを圧縮
   * v0.3.0: 動的閾値、最小パターン数保証、多様性優先
   */
  compressLibrary(patterns: LearnedPattern[]): LearnedPattern[] {
    if (patterns.length <= 1) return patterns;

    // v0.3.0: タイプ別にパターンを分類
    const byType = this.groupByType(patterns);
    const result: LearnedPattern[] = [];

    for (const [type, typePatterns] of byType.entries()) {
      if (typePatterns.length === 0) continue;

      // v0.3.0: 動的閾値計算
      const threshold = this.calculateDynamicThreshold(typePatterns);
      
      // 類似パターンをグループ化
      const groups = this.groupSimilarPatterns(typePatterns, threshold);

      // 各グループをマージ（多様性を保持）
      const merged = this.mergeGroupsWithDiversity(groups, type, typePatterns.length);
      result.push(...merged);
    }

    // 圧縮効果を確認
    const beforeMDL = this.calculateMDL(patterns);
    const afterMDL = this.calculateMDL(result);

    // 圧縮率が閾値未満、または過度な圧縮の場合は調整
    const compressionRatio = beforeMDL.total / afterMDL.total;
    if (compressionRatio < this.config.minCompressionRatio) {
      return patterns;
    }

    return result;
  }

  /**
   * タイプ別にパターンをグループ化（v0.3.0）
   */
  private groupByType(patterns: LearnedPattern[]): Map<ObservationType, LearnedPattern[]> {
    const byType = new Map<ObservationType, LearnedPattern[]>();
    
    for (const pattern of patterns) {
      const existing = byType.get(pattern.type) || [];
      existing.push(pattern);
      byType.set(pattern.type, existing);
    }
    
    return byType;
  }

  /**
   * 動的閾値を計算（v0.3.0）
   * パターン数や品質分布に応じて閾値を調整
   */
  private calculateDynamicThreshold(patterns: LearnedPattern[]): number {
    if (!this.config.dynamicThreshold) {
      return this.config.similarityThreshold;
    }

    const baseThreshold = this.config.similarityThreshold;
    
    // パターン数が少ない場合は閾値を上げる（圧縮を抑制）
    const countFactor = Math.min(patterns.length / 10, 1);
    const countAdjustment = (1 - countFactor) * 0.15;
    
    // 品質の分散が高い場合は閾値を上げる（多様性を保持）
    const qualities = patterns.map(p => p.quality);
    const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;
    const variance = qualities.reduce((sum, q) => sum + Math.pow(q - avgQuality, 2), 0) / qualities.length;
    const varianceAdjustment = Math.min(variance * 0.5, 0.1);
    
    // コンテキストの多様性を考慮
    const allContexts = new Set(patterns.flatMap(p => p.contexts));
    const diversityFactor = Math.min(allContexts.size / (patterns.length * 2), 1);
    const diversityAdjustment = diversityFactor * 0.1;
    
    return Math.min(baseThreshold + countAdjustment + varianceAdjustment + diversityAdjustment, 0.95);
  }

  /**
   * 多様性を保持しながらグループをマージ（v0.3.0）
   */
  private mergeGroupsWithDiversity(
    groups: LearnedPattern[][],
    _type: ObservationType,
    originalCount: number
  ): LearnedPattern[] {
    const result: LearnedPattern[] = [];
    const minPatterns = this.config.minPatternsPerType;
    
    // 品質順にグループをソート
    const sortedGroups = groups
      .map(g => ({
        group: g,
        maxQuality: Math.max(...g.map(p => p.quality)),
        totalFrequency: g.reduce((sum, p) => sum + p.frequency, 0),
      }))
      .sort((a, b) => b.maxQuality - a.maxQuality || b.totalFrequency - a.totalFrequency);
    
    for (const { group } of sortedGroups) {
      if (group.length === 1 && group[0]) {
        result.push(group[0]);
      } else if (group.length > 1) {
        // v0.3.0: 多様性優先モードの場合、異なるコンテキストを持つパターンは分離
        if (this.config.preserveDiversity) {
          const subGroups = this.splitByContextDiversity(group);
          for (const subGroup of subGroups) {
            if (subGroup.length === 1 && subGroup[0]) {
              result.push(subGroup[0]);
            } else if (subGroup.length > 1) {
              result.push(this.mergePatterns(subGroup));
            }
          }
        } else {
          result.push(this.mergePatterns(group));
        }
      }
    }
    
    // 最小パターン数を保証
    if (result.length < minPatterns && originalCount >= minPatterns) {
      // 削除されたパターンを品質順に復活
      const missing = groups
        .flat()
        .filter(p => !result.some(r => r.id === p.id || r.name.includes(p.id)))
        .sort((a, b) => b.quality - a.quality);
      
      let i = 0;
      while (result.length < minPatterns && i < missing.length) {
        result.push(missing[i]!);
        i++;
      }
    }
    
    return result;
  }

  /**
   * コンテキストの多様性でサブグループに分割（v0.3.0）
   */
  private splitByContextDiversity(patterns: LearnedPattern[]): LearnedPattern[][] {
    if (patterns.length <= 2) return [patterns];
    
    const subGroups: LearnedPattern[][] = [];
    const assigned = new Set<string>();
    
    for (const pattern of patterns) {
      if (assigned.has(pattern.id)) continue;
      
      // 同じドメインコンテキストを持つパターンをグループ化
      const domainContexts = pattern.contexts.filter(c => c.startsWith('domain:'));
      
      const group = [pattern];
      assigned.add(pattern.id);
      
      for (const other of patterns) {
        if (assigned.has(other.id)) continue;
        
        const otherDomainContexts = other.contexts.filter(c => c.startsWith('domain:'));
        
        // ドメインが同じ場合のみ同じグループに
        const sameDomain = domainContexts.some(d => otherDomainContexts.includes(d));
        if (sameDomain || (domainContexts.length === 0 && otherDomainContexts.length === 0)) {
          group.push(other);
          assigned.add(other.id);
        }
      }
      
      subGroups.push(group);
    }
    
    return subGroups;
  }

  /**
   * MDLを計算
   */
  calculateMDL(patterns: LearnedPattern[]): MDLResult {
    // ライブラリのMDL: 各パターンのサイズの合計
    const patternSizes = patterns.map(p => this.getPatternSize(p));
    const libraryMDL = patternSizes.reduce((sum, size) => sum + size, 0);

    // データのMDL: パターンでデータを記述するコスト
    // （簡略化: ホールの数に比例すると仮定）
    const totalHoles = patterns.reduce((sum, p) => sum + p.holes, 0);
    const dataMDL = totalHoles * 2; // ホールごとに2ビットのコスト

    return {
      libraryMDL,
      dataMDL,
      total: libraryMDL + dataMDL,
      breakdown: {
        patternCount: patterns.length,
        averagePatternSize: patterns.length > 0 ? libraryMDL / patterns.length : 0,
        totalHoles,
      },
    };
  }

  /**
   * 類似パターンをグループ化
   * v0.3.0: 閾値パラメータを追加
   */
  private groupSimilarPatterns(patterns: LearnedPattern[], threshold?: number): LearnedPattern[][] {
    const similarityThreshold = threshold ?? this.config.similarityThreshold;
    const groups: LearnedPattern[][] = [];
    const assigned = new Set<string>();

    for (const pattern of patterns) {
      if (assigned.has(pattern.id)) continue;

      const group = [pattern];
      assigned.add(pattern.id);

      // 同じグループに入れる類似パターンを探す
      for (const other of patterns) {
        if (assigned.has(other.id)) continue;
        if (pattern.type !== other.type) continue;

        const similarity = this.calculateSimilarity(pattern, other);
        if (similarity >= similarityThreshold) {
          group.push(other);
          assigned.add(other.id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * パターン間の類似度を計算
   */
  calculateSimilarity(a: LearnedPattern, b: LearnedPattern): number {
    // タイプが異なれば類似度0
    if (a.type !== b.type) return 0;

    // 入力テンプレートの類似度
    const inputSim = this.stringSimilarity(a.inputTemplate, b.inputTemplate);

    // 出力テンプレートの類似度
    const outputSim = this.stringSimilarity(a.outputTemplate, b.outputTemplate);

    // コンテキストの重複度
    const contextOverlap = this.calculateContextOverlap(a.contexts, b.contexts);

    // 重み付き平均
    return inputSim * 0.4 + outputSim * 0.4 + contextOverlap * 0.2;
  }

  /**
   * 文字列の類似度を計算（Jaccard係数）
   */
  private stringSimilarity(a: string, b: string): number {
    const tokensA = new Set(a.toLowerCase().split(/\s+/));
    const tokensB = new Set(b.toLowerCase().split(/\s+/));

    const intersection = new Set([...tokensA].filter(t => tokensB.has(t)));
    const union = new Set([...tokensA, ...tokensB]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * コンテキストの重複度を計算
   */
  private calculateContextOverlap(a: string[], b: string[]): number {
    if (a.length === 0 && b.length === 0) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    const setA = new Set(a);
    const setB = new Set(b);
    const intersection = new Set([...setA].filter(c => setB.has(c)));

    return intersection.size / Math.max(setA.size, setB.size);
  }

  /**
   * 複数のパターンをマージ
   */
  private mergePatterns(patterns: LearnedPattern[]): LearnedPattern {
    if (patterns.length === 0) {
      throw new Error('Cannot merge empty patterns array');
    }
    if (patterns.length === 1) return patterns[0]!;

    // 最も頻度が高いパターンをベースにする
    const sorted = [...patterns].sort((a, b) => b.frequency - a.frequency);
    const base = sorted[0]!;

    // 統計を集約
    const totalFrequency = patterns.reduce((sum, p) => sum + p.frequency, 0);
    const avgQuality = patterns.reduce((sum, p) => sum + p.quality, 0) / patterns.length;
    const allContexts = [...new Set(patterns.flatMap(p => p.contexts))];

    // マージされたテンプレートを生成
    const mergedInput = this.generalizeTemplate(patterns.map(p => p.inputTemplate));
    const mergedOutput = this.generalizeTemplate(patterns.map(p => p.outputTemplate));

    // 新しいパターンを作成
    const now = new Date().toISOString();
    return {
      id: `MERGED-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: `${base.name} (merged ${patterns.length})`,
      type: base.type,
      inputTemplate: mergedInput.template,
      outputTemplate: mergedOutput.template,
      quality: avgQuality,
      frequency: totalFrequency,
      holes: mergedInput.holes + mergedOutput.holes,
      createdAt: base.createdAt,
      updatedAt: now,
      lastUsedAt: now,
      contexts: allContexts,
    };
  }

  /**
   * 複数のテンプレートを汎化
   */
  private generalizeTemplate(templates: string[]): { template: string; holes: number } {
    if (templates.length === 0) return { template: '', holes: 0 };
    const firstTemplate = templates[0] ?? '';
    if (templates.length === 1) {
      const holes = (firstTemplate.match(/\{\{[^}]+\}\}/g) || []).length;
      return { template: firstTemplate, holes };
    }

    // 最長共通部分列（LCS）ベースの汎化
    // 簡略化: 最も短いテンプレートをベースに差分をホール化
    const shortest = templates.reduce((a, b) => a.length < b.length ? a : b, firstTemplate);
    let result = shortest;
    let holes = (result.match(/\{\{[^}]+\}\}/g) || []).length;

    // 他のテンプレートと比較して差分をホール化
    for (const template of templates) {
      if (template === shortest) continue;

      const words1 = result.split(/\s+/);
      const words2 = template.split(/\s+/);

      const newWords: string[] = [];
      const len = Math.max(words1.length, words2.length);

      for (let i = 0; i < len; i++) {
        const w1 = words1[i] ?? '';
        const w2 = words2[i] ?? '';

        if (w1 === w2 || w1.startsWith('{{')) {
          newWords.push(w1 || w2);
        } else {
          // 差分はホール化
          holes++;
          newWords.push(`{{var${holes}}}`);
        }
      }

      result = newWords.join(' ');
    }

    return { template: result, holes };
  }

  /**
   * パターンのサイズを計算
   */
  private getPatternSize(pattern: LearnedPattern): number {
    // 入力と出力のテンプレートサイズ + メタデータのオーバーヘッド
    const templateSize = pattern.inputTemplate.length + pattern.outputTemplate.length;
    const metadataOverhead = 20; // 固定オーバーヘッド
    return templateSize + metadataOverhead + pattern.contexts.length * 5;
  }

  /**
   * 冗長なパターンを検出
   */
  findRedundantPatterns(patterns: LearnedPattern[]): LearnedPattern[] {
    const redundant: LearnedPattern[] = [];

    for (const pattern of patterns) {
      // 他のパターンに完全に包含されているか確認
      for (const other of patterns) {
        if (pattern.id === other.id) continue;

        if (this.isSubsumedBy(pattern, other)) {
          redundant.push(pattern);
          break;
        }
      }
    }

    return redundant;
  }

  /**
   * パターンAがパターンBに包含されているか
   */
  private isSubsumedBy(a: LearnedPattern, b: LearnedPattern): boolean {
    // 同じタイプでなければ包含関係なし
    if (a.type !== b.type) return false;

    // Bのホールが多く（より抽象的）、Aを包含できる場合
    if (b.holes <= a.holes) return false;

    // 入力テンプレートの包含チェック
    const inputSubsumed = this.templateSubsumes(b.inputTemplate, a.inputTemplate);
    const outputSubsumed = this.templateSubsumes(b.outputTemplate, a.outputTemplate);

    return inputSubsumed && outputSubsumed;
  }

  /**
   * テンプレートAがテンプレートBを包含するか
   */
  private templateSubsumes(general: string, specific: string): boolean {
    // 簡略化: ホールを.*に置換して正規表現マッチング
    const pattern = general
      .replace(/\{\{[^}]+\}\}/g, '.*')
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\.\\\*/g, '.*');

    try {
      const regex = new RegExp(`^${pattern}$`, 'i');
      return regex.test(specific);
    } catch {
      return false;
    }
  }
}
