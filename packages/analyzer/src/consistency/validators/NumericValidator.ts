/**
 * NumericValidator - 数値一貫性バリデーター
 * @module consistency/validators/NumericValidator
 * @see DES-KATASHIRO-004-DCC Section 5.3.1
 */

import type {
  ExtractedNumeric,
  ConsistencyIssue,
} from '../types.js';

/**
 * 数値検証設定
 */
export interface NumericValidatorConfig {
  /** 許容誤差率（パーセント） */
  tolerancePercent: number;
  /** ラベル一致時のみ検証するか */
  requireLabelMatch: boolean;
  /** 単位の変換ルール */
  unitConversions?: Map<string, Map<string, number>>;
}

/**
 * 数値一貫性バリデーター
 */
export class NumericValidator {
  private readonly config: NumericValidatorConfig;

  constructor(config?: Partial<NumericValidatorConfig>) {
    this.config = {
      tolerancePercent: config?.tolerancePercent ?? 0.01,
      requireLabelMatch: config?.requireLabelMatch ?? true,
      unitConversions: config?.unitConversions ?? this.getDefaultConversions(),
    };
  }

  /**
   * デフォルトの単位変換ルールを取得
   */
  private getDefaultConversions(): Map<string, Map<string, number>> {
    const conversions = new Map<string, Map<string, number>>();

    // 長さ
    const length = new Map<string, number>();
    length.set('m', 1);
    length.set('km', 1000);
    length.set('cm', 0.01);
    length.set('mm', 0.001);
    conversions.set('length', length);

    // 重さ
    const weight = new Map<string, number>();
    weight.set('kg', 1);
    weight.set('g', 0.001);
    weight.set('mg', 0.000001);
    weight.set('t', 1000);
    conversions.set('weight', weight);

    // 金額
    const currency = new Map<string, number>();
    currency.set('円', 1);
    currency.set('万円', 10000);
    currency.set('億円', 100000000);
    conversions.set('currency', currency);

    return conversions;
  }

  /**
   * 数値の一貫性を検証
   */
  validate(numerics: ExtractedNumeric[]): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // ラベルでグループ化
    const byLabel = this.groupByLabel(numerics);

    // 同じラベルの数値を比較
    for (const [label, group] of byLabel) {
      if (group.length < 2) continue;

      // 同じ単位カテゴリ内で比較
      const byUnitCategory = this.groupByUnitCategory(group);

      for (const [, categoryGroup] of byUnitCategory) {
        if (categoryGroup.length < 2) continue;

        // 基準値に正規化して比較
        const normalized = this.normalizeValues(categoryGroup);
        issues.push(...this.compareNormalizedValues(normalized, label));
      }
    }

    // 合計値の検証
    issues.push(...this.validateTotals(numerics));

    return issues;
  }

  /**
   * ラベルでグループ化
   */
  private groupByLabel(numerics: ExtractedNumeric[]): Map<string, ExtractedNumeric[]> {
    const groups = new Map<string, ExtractedNumeric[]>();

    for (const num of numerics) {
      const label = num.label ?? '__no_label__';
      const existing = groups.get(label);
      if (existing) {
        existing.push(num);
      } else {
        groups.set(label, [num]);
      }
    }

    return groups;
  }

  /**
   * 単位カテゴリでグループ化
   */
  private groupByUnitCategory(numerics: ExtractedNumeric[]): Map<string, ExtractedNumeric[]> {
    const groups = new Map<string, ExtractedNumeric[]>();

    for (const num of numerics) {
      const category = this.getUnitCategory(num.unit);
      const key = category ?? num.unit ?? '__no_unit__';
      const existing = groups.get(key);
      if (existing) {
        existing.push(num);
      } else {
        groups.set(key, [num]);
      }
    }

    return groups;
  }

  /**
   * 単位カテゴリを取得
   */
  private getUnitCategory(unit: string | undefined): string | undefined {
    if (!unit || !this.config.unitConversions) return undefined;

    for (const [category, conversions] of this.config.unitConversions) {
      if (conversions.has(unit)) {
        return category;
      }
    }
    return undefined;
  }

  /**
   * 値を正規化
   */
  private normalizeValues(
    numerics: ExtractedNumeric[],
  ): Array<{ original: ExtractedNumeric; normalizedValue: number }> {
    const result: Array<{ original: ExtractedNumeric; normalizedValue: number }> = [];

    for (const num of numerics) {
      const category = this.getUnitCategory(num.unit);
      let normalizedValue = num.value;

      if (category && num.unit && this.config.unitConversions) {
        const conversions = this.config.unitConversions.get(category);
        const factor = conversions?.get(num.unit);
        if (factor !== undefined) {
          normalizedValue = num.value * factor;
        }
      }

      result.push({ original: num, normalizedValue });
    }

    return result;
  }

  /**
   * 正規化された値を比較
   */
  private compareNormalizedValues(
    normalized: Array<{ original: ExtractedNumeric; normalizedValue: number }>,
    label: string,
  ): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    for (let i = 0; i < normalized.length; i++) {
      for (let j = i + 1; j < normalized.length; j++) {
        const item1 = normalized[i];
        const item2 = normalized[j];
        if (!item1 || !item2) continue;

        const diff = Math.abs(item1.normalizedValue - item2.normalizedValue);
        const avg = (Math.abs(item1.normalizedValue) + Math.abs(item2.normalizedValue)) / 2;

        if (avg === 0) continue;

        const diffPercent = diff / avg;
        if (diffPercent > this.config.tolerancePercent && diffPercent < 0.5) {
          // 完全に異なる値ではなく、微妙な差異の場合のみ報告
          issues.push({
            type: 'numeric_inconsistency',
            severity: 'warning',
            message: `「${label}」の数値に不整合があります: ${item1.original.rawValue} vs ${item2.original.rawValue}`,
            locations: [item1.original.location, item2.original.location],
            details: {
              label,
              value1: item1.original.rawValue,
              value2: item2.original.rawValue,
              normalizedValue1: item1.normalizedValue,
              normalizedValue2: item2.normalizedValue,
              differencePercent: (diffPercent * 100).toFixed(2) + '%',
            },
          });
        }
      }
    }

    return issues;
  }

  /**
   * 合計値の整合性を検証
   */
  private validateTotals(numerics: ExtractedNumeric[]): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // 「合計」「総計」「計」などのラベルを持つ数値を検索
    const totalLabels = ['合計', '総計', '計', 'total', 'sum'];
    const totals = numerics.filter((n) =>
      totalLabels.some((label) => n.label?.toLowerCase().includes(label)),
    );

    for (const total of totals) {
      // 同じファイル内の他の数値を収集して合計を計算
      const sameLabelNumerics = numerics.filter(
        (n) =>
          n.location.file === total.location.file &&
          n !== total &&
          n.unit === total.unit,
      );

      if (sameLabelNumerics.length === 0) continue;

      // 合計を計算
      const calculatedSum = sameLabelNumerics.reduce((sum, n) => sum + n.value, 0);
      const diff = Math.abs(calculatedSum - total.value);
      const diffPercent = total.value !== 0 ? diff / Math.abs(total.value) : diff;

      if (diffPercent > this.config.tolerancePercent && diffPercent < 0.5) {
        issues.push({
          type: 'numeric_inconsistency',
          severity: 'error',
          message: `合計値「${total.rawValue}」が計算値「${calculatedSum}」と一致しません`,
          locations: [total.location, ...sameLabelNumerics.map((n) => n.location)],
          details: {
            declaredTotal: total.value,
            calculatedTotal: calculatedSum,
            difference: diff,
            differencePercent: (diffPercent * 100).toFixed(2) + '%',
          },
        });
      }
    }

    return issues;
  }
}
