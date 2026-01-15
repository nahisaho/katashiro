/**
 * DateValidator - 日付一貫性バリデーター
 * @module consistency/validators/DateValidator
 * @see DES-KATASHIRO-004-DCC Section 5.3.2
 */

import type {
  ExtractedDate,
  ConsistencyIssue,
} from '../types.js';

/**
 * 日付検証設定
 */
export interface DateValidatorConfig {
  /** 許容する日付の差（日数） */
  toleranceDays: number;
  /** 未来日付を許可するか */
  allowFutureDates: boolean;
  /** 過去何年までを許容するか */
  maxPastYears: number;
  /** タイムゾーン */
  timezone: string;
}

/**
 * 日付一貫性バリデーター
 */
export class DateValidator {
  private readonly config: DateValidatorConfig;

  constructor(config?: Partial<DateValidatorConfig>) {
    this.config = {
      toleranceDays: config?.toleranceDays ?? 0,
      allowFutureDates: config?.allowFutureDates ?? true,
      maxPastYears: config?.maxPastYears ?? 100,
      timezone: config?.timezone ?? 'Asia/Tokyo',
    };
  }

  /**
   * 日付の一貫性を検証
   */
  validate(dates: ExtractedDate[]): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // ラベルでグループ化
    const byLabel = this.groupByLabel(dates);

    // 同じラベルの日付を比較
    for (const [label, group] of byLabel) {
      if (group.length < 2) continue;
      issues.push(...this.compareDatesInGroup(group, label));
    }

    // 日付の妥当性チェック
    issues.push(...this.validateDateRanges(dates));

    // 日付の論理的順序チェック
    issues.push(...this.validateDateOrder(dates));

    return issues;
  }

  /**
   * ラベルでグループ化
   */
  private groupByLabel(dates: ExtractedDate[]): Map<string, ExtractedDate[]> {
    const groups = new Map<string, ExtractedDate[]>();

    for (const date of dates) {
      const label = date.label ?? '__no_label__';
      const existing = groups.get(label);
      if (existing) {
        existing.push(date);
      } else {
        groups.set(label, [date]);
      }
    }

    return groups;
  }

  /**
   * グループ内の日付を比較
   */
  private compareDatesInGroup(group: ExtractedDate[], label: string): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // パース可能な日付のみを対象
    const parsedDates = group.filter((d) => d.parsedDate !== undefined);
    if (parsedDates.length < 2) return issues;

    for (let i = 0; i < parsedDates.length; i++) {
      for (let j = i + 1; j < parsedDates.length; j++) {
        const date1 = parsedDates[i];
        const date2 = parsedDates[j];
        if (!date1?.parsedDate || !date2?.parsedDate) continue;

        const diffDays = Math.abs(this.getDaysDifference(date1.parsedDate, date2.parsedDate));

        if (diffDays > this.config.toleranceDays) {
          issues.push({
            type: 'date_inconsistency',
            severity: 'warning',
            message: `「${label}」の日付に不整合があります: ${date1.rawValue} vs ${date2.rawValue}`,
            locations: [date1.location, date2.location],
            details: {
              label,
              date1: date1.rawValue,
              date2: date2.rawValue,
              differenceDays: diffDays,
            },
          });
        }
      }
    }

    return issues;
  }

  /**
   * 日付の妥当性を検証
   */
  private validateDateRanges(dates: ExtractedDate[]): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    const now = new Date();
    const minDate = new Date();
    minDate.setFullYear(now.getFullYear() - this.config.maxPastYears);

    for (const date of dates) {
      if (!date.parsedDate) continue;

      // 未来日付チェック
      if (!this.config.allowFutureDates && date.parsedDate > now) {
        issues.push({
          type: 'date_inconsistency',
          severity: 'warning',
          message: `未来の日付「${date.rawValue}」が検出されました`,
          locations: [date.location],
          details: {
            date: date.rawValue,
            type: 'future_date',
          },
        });
      }

      // 古すぎる日付チェック
      if (date.parsedDate < minDate) {
        issues.push({
          type: 'date_inconsistency',
          severity: 'info',
          message: `非常に古い日付「${date.rawValue}」が検出されました`,
          locations: [date.location],
          details: {
            date: date.rawValue,
            type: 'very_old_date',
            maxPastYears: this.config.maxPastYears,
          },
        });
      }

      // 無効な日付チェック（例: 2月30日）
      if (!this.isValidDate(date.parsedDate)) {
        issues.push({
          type: 'date_inconsistency',
          severity: 'error',
          message: `無効な日付「${date.rawValue}」が検出されました`,
          locations: [date.location],
          details: {
            date: date.rawValue,
            type: 'invalid_date',
          },
        });
      }
    }

    return issues;
  }

  /**
   * 日付の論理的順序を検証
   */
  private validateDateOrder(dates: ExtractedDate[]): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // 開始/終了のペアを検出
    const startEndPairs = this.findStartEndPairs(dates);

    for (const pair of startEndPairs) {
      if (!pair.start.parsedDate || !pair.end.parsedDate) continue;

      if (pair.start.parsedDate > pair.end.parsedDate) {
        issues.push({
          type: 'date_inconsistency',
          severity: 'error',
          message: `開始日「${pair.start.rawValue}」が終了日「${pair.end.rawValue}」より後になっています`,
          locations: [pair.start.location, pair.end.location],
          details: {
            startDate: pair.start.rawValue,
            endDate: pair.end.rawValue,
            type: 'invalid_order',
          },
        });
      }
    }

    return issues;
  }

  /**
   * 開始/終了のペアを検出
   */
  private findStartEndPairs(
    dates: ExtractedDate[],
  ): Array<{ start: ExtractedDate; end: ExtractedDate }> {
    const pairs: Array<{ start: ExtractedDate; end: ExtractedDate }> = [];
    const startLabels = ['開始', '開始日', 'start', 'from', '起算日', '着手日'];
    const endLabels = ['終了', '終了日', 'end', 'to', '完了日', '納期'];

    // 同じファイル内でペアを探す
    const byFile = new Map<string, ExtractedDate[]>();
    for (const date of dates) {
      const file = date.location.file;
      const existing = byFile.get(file);
      if (existing) {
        existing.push(date);
      } else {
        byFile.set(file, [date]);
      }
    }

    for (const [, fileDates] of byFile) {
      const starts = fileDates.filter((d) =>
        startLabels.some((label) => d.label?.toLowerCase().includes(label)),
      );
      const ends = fileDates.filter((d) =>
        endLabels.some((label) => d.label?.toLowerCase().includes(label)),
      );

      // 最も近い開始/終了日をペアにする
      for (const start of starts) {
        let closestEnd: ExtractedDate | undefined;
        let minDistance = Infinity;

        for (const end of ends) {
          const distance = Math.abs(start.location.line - end.location.line);
          if (distance < minDistance) {
            minDistance = distance;
            closestEnd = end;
          }
        }

        if (closestEnd) {
          pairs.push({ start, end: closestEnd });
        }
      }
    }

    return pairs;
  }

  /**
   * 日数の差を計算
   */
  private getDaysDifference(date1: Date, date2: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((date2.getTime() - date1.getTime()) / msPerDay);
  }

  /**
   * 日付が有効かどうかを確認
   */
  private isValidDate(date: Date): boolean {
    return !isNaN(date.getTime());
  }
}
