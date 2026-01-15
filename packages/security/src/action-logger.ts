/**
 * ActionLogger - 監査ログ記録クラス
 *
 * @requirement REQ-012-05
 * @design すべてのアクションをタイムスタンプ付きで記録
 */

import {
  Action,
  SecurityAnalysis,
  Observation,
  AuditLogEntry,
  AuditLogFilter,
  UserConfirmation,
  RiskLevel,
  RISK_LEVEL_ORDER,
} from './types.js';

/**
 * ログストレージインターフェース
 */
export interface LogStorage {
  /** ログエントリを追加 */
  append(entry: AuditLogEntry): Promise<void>;
  /** ログを検索 */
  query(filter: AuditLogFilter): Promise<AuditLogEntry[]>;
  /** ログをクリア */
  clear(): Promise<void>;
  /** ログ件数を取得 */
  count(): Promise<number>;
}

/**
 * インメモリログストレージ
 */
export class InMemoryLogStorage implements LogStorage {
  private logs: AuditLogEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries: number = 10000) {
    this.maxEntries = maxEntries;
  }

  async append(entry: AuditLogEntry): Promise<void> {
    this.logs.push(entry);

    // 最大件数を超えたら古いログを削除
    if (this.logs.length > this.maxEntries) {
      this.logs = this.logs.slice(-this.maxEntries);
    }
  }

  async query(filter: AuditLogFilter): Promise<AuditLogEntry[]> {
    let results = [...this.logs];

    // 時間範囲フィルター
    if (filter.startTime) {
      results = results.filter((e) => e.timestamp >= filter.startTime!);
    }
    if (filter.endTime) {
      results = results.filter((e) => e.timestamp <= filter.endTime!);
    }

    // アクションタイプフィルター
    if (filter.actionTypes && filter.actionTypes.length > 0) {
      results = results.filter((e) => filter.actionTypes!.includes(e.action.type));
    }

    // リスクレベルフィルター
    if (filter.minRiskLevel) {
      const minOrder = RISK_LEVEL_ORDER[filter.minRiskLevel];
      results = results.filter(
        (e) => RISK_LEVEL_ORDER[e.analysis.riskLevel] >= minOrder
      );
    }

    // 成功/失敗フィルター
    if (filter.success !== undefined) {
      results = results.filter(
        (e) => e.observation?.success === filter.success
      );
    }

    // ユーザーIDフィルター
    if (filter.userId) {
      results = results.filter(
        (e) => e.action.context?.userId === filter.userId
      );
    }

    // キーワード検索
    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase();
      results = results.filter((e) => {
        const searchText = [
          e.action.name,
          e.action.target,
          ...e.analysis.reasons,
          e.observation?.error,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return searchText.includes(keyword);
      });
    }

    // ソート（新しい順）
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // ページング
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 100;
    return results.slice(offset, offset + limit);
  }

  async clear(): Promise<void> {
    this.logs = [];
  }

  async count(): Promise<number> {
    return this.logs.length;
  }

  /**
   * 全ログを取得（テスト用）
   */
  getAllLogs(): AuditLogEntry[] {
    return [...this.logs];
  }
}

/**
 * ActionLoggerオプション
 */
export interface ActionLoggerOptions {
  /** ログストレージ */
  storage?: LogStorage;
  /** 最小記録リスクレベル */
  minLogLevel?: RiskLevel;
  /** ID生成関数 */
  generateId?: () => string;
}

/**
 * アクションロガー
 */
export class ActionLogger {
  private readonly storage: LogStorage;
  private readonly minLogLevel: RiskLevel;
  private readonly generateId: () => string;

  constructor(options: ActionLoggerOptions = {}) {
    this.storage = options.storage ?? new InMemoryLogStorage();
    this.minLogLevel = options.minLogLevel ?? 'low';
    this.generateId =
      options.generateId ??
      (() => `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  }

  /**
   * アクションと分析結果を記録（REQ-012-05）
   */
  async logAction(
    action: Action,
    analysis: SecurityAnalysis,
    observation?: Observation,
    userConfirmation?: UserConfirmation
  ): Promise<string> {
    // 最小リスクレベル未満はスキップ
    if (
      RISK_LEVEL_ORDER[analysis.riskLevel] < RISK_LEVEL_ORDER[this.minLogLevel]
    ) {
      return '';
    }

    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      action,
      analysis,
      observation,
      userConfirmation,
    };

    await this.storage.append(entry);
    return entry.id;
  }

  /**
   * アクション開始を記録
   */
  async logActionStart(action: Action, analysis: SecurityAnalysis): Promise<string> {
    return this.logAction(action, analysis);
  }

  /**
   * アクション完了を記録（既存エントリを更新）
   */
  async logActionComplete(
    logId: string,
    observation: Observation,
    userConfirmation?: UserConfirmation
  ): Promise<void> {
    // 簡易実装: 新しいエントリとして追加
    // 本格的な実装では既存エントリを更新する
    const logs = await this.storage.query({ limit: 1000 });
    const entry = logs.find((e) => e.id === logId);
    if (entry) {
      entry.observation = observation;
      if (userConfirmation) {
        entry.userConfirmation = userConfirmation;
      }
    }
  }

  /**
   * ログを検索
   */
  async queryLogs(filter: AuditLogFilter): Promise<AuditLogEntry[]> {
    return this.storage.query(filter);
  }

  /**
   * 最近のログを取得
   */
  async getRecentLogs(count: number = 10): Promise<AuditLogEntry[]> {
    return this.storage.query({ limit: count });
  }

  /**
   * 高リスクログを取得
   */
  async getHighRiskLogs(count: number = 10): Promise<AuditLogEntry[]> {
    return this.storage.query({ minRiskLevel: 'high', limit: count });
  }

  /**
   * ユーザーのログを取得
   */
  async getUserLogs(userId: string, count: number = 10): Promise<AuditLogEntry[]> {
    return this.storage.query({ userId, limit: count });
  }

  /**
   * ログをクリア
   */
  async clearLogs(): Promise<void> {
    return this.storage.clear();
  }

  /**
   * ログ件数を取得
   */
  async getLogCount(): Promise<number> {
    return this.storage.count();
  }

  /**
   * サマリーを生成
   */
  async generateSummary(filter: AuditLogFilter = {}): Promise<AuditLogSummary> {
    const logs = await this.storage.query({ ...filter, limit: 10000 });

    const summary: AuditLogSummary = {
      totalActions: logs.length,
      byRiskLevel: { low: 0, medium: 0, high: 0, critical: 0 },
      byActionType: {},
      successRate: 0,
      blockedCount: 0,
      confirmedCount: 0,
    };

    let successCount = 0;
    let totalWithObservation = 0;

    for (const log of logs) {
      // リスクレベル別
      const riskKey = log.analysis.riskLevel;
      if (summary.byRiskLevel[riskKey] !== undefined) {
        summary.byRiskLevel[riskKey]++;
      }

      // アクションタイプ別
      summary.byActionType[log.action.type] =
        (summary.byActionType[log.action.type] ?? 0) + 1;

      // 成功率計算
      if (log.observation) {
        totalWithObservation++;
        if (log.observation.success) {
          successCount++;
        }
      }

      // ブロック数
      if (!log.analysis.allowed) {
        summary.blockedCount++;
      }

      // 確認数
      if (log.userConfirmation?.confirmed) {
        summary.confirmedCount++;
      }
    }

    summary.successRate =
      totalWithObservation > 0 ? successCount / totalWithObservation : 0;

    return summary;
  }
}

/**
 * 監査ログサマリー
 */
export interface AuditLogSummary {
  /** 総アクション数 */
  totalActions: number;
  /** リスクレベル別件数 */
  byRiskLevel: Record<RiskLevel, number>;
  /** アクションタイプ別件数 */
  byActionType: Record<string, number>;
  /** 成功率 */
  successRate: number;
  /** ブロック数 */
  blockedCount: number;
  /** 確認数 */
  confirmedCount: number;
}
