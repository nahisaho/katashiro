/**
 * TermValidator - 用語一貫性バリデーター
 * @module consistency/validators/TermValidator
 * @see DES-KATASHIRO-004-DCC Section 5.3.3
 */

import type {
  ExtractedTerm,
  ConsistencyIssue,
} from '../types.js';

/**
 * 用語検証設定
 */
export interface TermValidatorConfig {
  /** 用語辞書（正規形→許可される表記揺れ） */
  dictionary?: Map<string, string[]>;
  /** 大文字小文字を区別するか */
  caseSensitive: boolean;
  /** 編集距離の閾値（類似判定用） */
  editDistanceThreshold: number;
  /** 禁止用語リスト */
  forbiddenTerms?: string[];
  /** 推奨用語マッピング（非推奨→推奨） */
  preferredTerms?: Map<string, string>;
}

/**
 * 用語一貫性バリデーター
 */
export class TermValidator {
  private readonly config: TermValidatorConfig;

  constructor(config?: Partial<TermValidatorConfig>) {
    this.config = {
      dictionary: config?.dictionary,
      caseSensitive: config?.caseSensitive ?? false,
      editDistanceThreshold: config?.editDistanceThreshold ?? 2,
      forbiddenTerms: config?.forbiddenTerms,
      preferredTerms: config?.preferredTerms,
    };
  }

  /**
   * 用語の一貫性を検証
   */
  validate(terms: ExtractedTerm[]): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // 用語を正規化してグループ化
    const termGroups = this.groupTerms(terms);

    // 1. 表記揺れの検出
    issues.push(...this.detectVariations(termGroups, terms));

    // 2. 禁止用語の検出
    issues.push(...this.detectForbiddenTerms(terms));

    // 3. 非推奨用語の検出
    issues.push(...this.detectDeprecatedTerms(terms));

    // 4. 類似用語の検出（タイポ候補）
    issues.push(...this.detectSimilarTerms(termGroups));

    return issues;
  }

  /**
   * 用語をグループ化
   */
  private groupTerms(terms: ExtractedTerm[]): Map<string, ExtractedTerm[]> {
    const groups = new Map<string, ExtractedTerm[]>();

    for (const term of terms) {
      const key = term.normalizedValue;
      const existing = groups.get(key);
      if (existing) {
        existing.push(term);
      } else {
        groups.set(key, [term]);
      }
    }

    return groups;
  }

  /**
   * 表記揺れを検出
   */
  private detectVariations(
    termGroups: Map<string, ExtractedTerm[]>,
    allTerms: ExtractedTerm[],
  ): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // 辞書ベースの検証
    if (this.config.dictionary) {
      for (const [canonical, variants] of this.config.dictionary.entries()) {
        const normalizedCanonical = this.normalize(canonical);
        const normalizedVariants = variants.map((v) => this.normalize(v));

        // 正規形と許可された変形を収集
        const allowedForms = new Set([normalizedCanonical, ...normalizedVariants]);

        // 同じ概念を指す用語を見つける
        const relatedTerms: ExtractedTerm[] = [];
        for (const term of allTerms) {
          if (allowedForms.has(term.normalizedValue)) {
            relatedTerms.push(term);
          }
        }

        // 複数の表記が使われている場合
        const usedForms = new Set(relatedTerms.map((t) => t.rawValue));
        if (usedForms.size > 1) {
          const firstTerm = relatedTerms[0];
          if (!firstTerm) continue;

          issues.push({
            type: 'term_inconsistency',
            severity: 'warning',
            message: `用語「${canonical}」に表記揺れがあります: ${[...usedForms].join(', ')}`,
            locations: relatedTerms.map((t) => t.location),
            details: {
              category: 'variation',
              canonical,
              variants: [...usedForms],
            },
          });
        }
      }
    }

    // rawValue が異なるが normalizedValue が同じ用語を検出
    for (const [, group] of termGroups) {
      if (group.length < 2) continue;

      const rawForms = new Set(group.map((t) => t.rawValue));
      if (rawForms.size > 1) {
        const firstTerm = group[0];
        if (!firstTerm) continue;

        // 既に辞書で検出済みかチェック
        const alreadyReported = issues.some((issue) => {
          if (issue.type !== 'term_inconsistency') return false;
          const variants = issue.details?.['variants'];
          return Array.isArray(variants) && variants.includes(firstTerm.rawValue);
        });

        if (!alreadyReported) {
          issues.push({
            type: 'term_inconsistency',
            severity: 'warning',
            message: `用語に表記揺れがあります: ${[...rawForms].join(', ')}`,
            locations: group.map((t) => t.location),
            details: {
              category: 'case_variation',
              variants: [...rawForms],
            },
          });
        }
      }
    }

    return issues;
  }

  /**
   * 禁止用語を検出
   */
  private detectForbiddenTerms(terms: ExtractedTerm[]): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    if (!this.config.forbiddenTerms) return issues;

    const forbiddenSet = new Set(
      this.config.forbiddenTerms.map((t) => this.normalize(t)),
    );

    for (const term of terms) {
      if (forbiddenSet.has(term.normalizedValue)) {
        issues.push({
          type: 'term_inconsistency',
          severity: 'error',
          message: `禁止用語「${term.rawValue}」が使用されています`,
          locations: [term.location],
          details: {
            category: 'forbidden',
            term: term.rawValue,
          },
        });
      }
    }

    return issues;
  }

  /**
   * 非推奨用語を検出
   */
  private detectDeprecatedTerms(terms: ExtractedTerm[]): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    if (!this.config.preferredTerms) return issues;

    const deprecatedMap = new Map<string, string>();
    for (const [deprecated, preferred] of this.config.preferredTerms.entries()) {
      deprecatedMap.set(this.normalize(deprecated), preferred);
    }

    for (const term of terms) {
      const preferred = deprecatedMap.get(term.normalizedValue);
      if (preferred) {
        issues.push({
          type: 'term_inconsistency',
          severity: 'info',
          message: `用語「${term.rawValue}」の代わりに「${preferred}」の使用を推奨します`,
          locations: [term.location],
          suggestion: preferred,
          details: {
            category: 'deprecated',
            deprecated: term.rawValue,
            preferred,
          },
        });
      }
    }

    return issues;
  }

  /**
   * 類似用語を検出（タイポ候補）
   */
  private detectSimilarTerms(
    termGroups: Map<string, ExtractedTerm[]>,
  ): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    const normalizedValues = [...termGroups.keys()];

    for (let i = 0; i < normalizedValues.length; i++) {
      for (let j = i + 1; j < normalizedValues.length; j++) {
        const term1 = normalizedValues[i];
        const term2 = normalizedValues[j];
        if (!term1 || !term2) continue;

        // 短すぎる用語はスキップ
        if (term1.length < 4 || term2.length < 4) continue;

        const distance = this.levenshteinDistance(term1, term2);
        if (distance > 0 && distance <= this.config.editDistanceThreshold) {
          const group1 = termGroups.get(term1);
          const group2 = termGroups.get(term2);
          if (!group1 || !group2) continue;

          const firstTerm1 = group1[0];
          const firstTerm2 = group2[0];
          if (!firstTerm1 || !firstTerm2) continue;

          issues.push({
            type: 'term_inconsistency',
            severity: 'info',
            message: `類似用語が検出されました: 「${firstTerm1.rawValue}」と「${firstTerm2.rawValue}」（編集距離: ${distance}）`,
            locations: [firstTerm1.location, firstTerm2.location],
            details: {
              category: 'similar',
              term1: firstTerm1.rawValue,
              term2: firstTerm2.rawValue,
              distance,
            },
          });
        }
      }
    }

    return issues;
  }

  /**
   * 文字列を正規化
   */
  private normalize(value: string): string {
    if (this.config.caseSensitive) {
      return value.trim();
    }
    return value.toLowerCase().trim();
  }

  /**
   * レーベンシュタイン距離を計算
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;

    // 空文字列の場合
    if (m === 0) return n;
    if (n === 0) return m;

    // DPテーブル
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
      Array.from({ length: n + 1 }, () => 0),
    );

    // 初期化
    for (let i = 0; i <= m; i++) {
      dp[i]![0] = i;
    }
    for (let j = 0; j <= n; j++) {
      dp[0]![j] = j;
    }

    // DP
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        const deletion = (dp[i - 1]?.[j] ?? 0) + 1;
        const insertion = (dp[i]?.[j - 1] ?? 0) + 1;
        const substitution = (dp[i - 1]?.[j - 1] ?? 0) + cost;
        dp[i]![j] = Math.min(deletion, insertion, substitution);
      }
    }

    return dp[m]?.[n] ?? 0;
  }
}
