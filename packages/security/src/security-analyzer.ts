/**
 * SecurityAnalyzer - セキュリティ分析クラス
 *
 * @requirement REQ-012
 * @design REQ-012-01 リスクレベル評価
 * @design REQ-012-02 確認プロンプト判定
 * @design REQ-012-03 拒否パターンブロック
 * @design REQ-012-04 許可パターン判定
 * @design REQ-012-06 ファイル削除=高リスク
 */

import micromatch from 'micromatch';
import {
  Action,
  SecurityPolicy,
  SecurityAnalysis,
  RiskLevel,
  RiskRule,
  PatternRule,
  BUILTIN_RISK_RULES,
  DEFAULT_SECURITY_POLICY,
  isRiskLevelAtLeast,
  RISK_LEVEL_ORDER,
  SecurityError,
} from './types';

/**
 * SecurityAnalyzerオプション
 */
export interface SecurityAnalyzerOptions {
  /** カスタムポリシー */
  policy?: Partial<SecurityPolicy>;
  /** ビルトインルールを使用するか */
  useBuiltinRules?: boolean;
  /** 追加のリスクルール */
  additionalRules?: RiskRule[];
}

/**
 * セキュリティ分析器
 */
export class SecurityAnalyzer {
  private readonly policy: SecurityPolicy;
  private readonly riskRules: RiskRule[];

  constructor(options: SecurityAnalyzerOptions = {}) {
    // ポリシーをマージ
    this.policy = {
      ...DEFAULT_SECURITY_POLICY,
      ...options.policy,
      allowPatterns: [
        ...(options.policy?.allowPatterns ?? DEFAULT_SECURITY_POLICY.allowPatterns),
      ],
      denyPatterns: [
        ...(options.policy?.denyPatterns ?? DEFAULT_SECURITY_POLICY.denyPatterns),
      ],
      requireConfirmation:
        options.policy?.requireConfirmation ?? DEFAULT_SECURITY_POLICY.requireConfirmation,
      customRiskRules: [
        ...(DEFAULT_SECURITY_POLICY.customRiskRules ?? []),
        ...(options.policy?.customRiskRules ?? []),
      ],
    };

    // リスクルールを構築
    const builtinRules = options.useBuiltinRules !== false ? BUILTIN_RISK_RULES : [];
    this.riskRules = [
      ...builtinRules,
      ...(this.policy.customRiskRules ?? []),
      ...(options.additionalRules ?? []),
    ];
  }

  /**
   * アクションを分析（REQ-012-01）
   */
  analyze(action: Action): SecurityAnalysis {
    const matchedRules: string[] = [];
    const reasons: string[] = [];

    // 1. 拒否パターンチェック（REQ-012-03）
    const denyMatch = this.checkDenyPatterns(action);
    if (denyMatch) {
      return {
        riskLevel: 'critical',
        reasons: [`Action blocked by deny pattern: ${denyMatch.pattern}`],
        requiresConfirmation: false,
        allowed: false,
        blockReason: denyMatch.description ?? `Matches deny pattern: ${denyMatch.pattern}`,
        matchedRules: ['deny_pattern'],
      };
    }

    // 2. リスクレベル評価
    let riskLevel = this.evaluateRiskLevel(action, matchedRules, reasons);

    // 3. 許可パターンチェック（REQ-012-04）
    // 注意: 高リスクアクション（削除など）は許可パターンでリスクを下げない
    const allowMatch = this.checkAllowPatterns(action);
    const highRiskActionTypes = ['file_delete', 'directory_delete', 'command_execute'];
    if (allowMatch && !highRiskActionTypes.includes(action.type)) {
      // 許可パターンにマッチした場合、リスクレベルを下げる
      if (riskLevel !== 'critical') {
        riskLevel = 'low';
        reasons.push(`Matched allow pattern: ${allowMatch.pattern}`);
        matchedRules.push('allow_pattern');
      }
    }

    // 4. 最大リスクレベルチェック
    if (isRiskLevelAtLeast(riskLevel, this.policy.maxRiskLevel)) {
      if (RISK_LEVEL_ORDER[riskLevel] > RISK_LEVEL_ORDER[this.policy.maxRiskLevel]) {
        return {
          riskLevel,
          reasons,
          requiresConfirmation: false,
          allowed: false,
          blockReason: `Risk level ${riskLevel} exceeds maximum allowed ${this.policy.maxRiskLevel}`,
          matchedRules,
        };
      }
    }

    // 5. 確認が必要か判定（REQ-012-02）
    const requiresConfirmation = this.policy.requireConfirmation.includes(riskLevel);
    if (requiresConfirmation) {
      reasons.push(`Risk level ${riskLevel} requires confirmation`);
    }

    return {
      riskLevel,
      reasons,
      requiresConfirmation,
      allowed: true,
      matchedRules,
    };
  }

  /**
   * アクションの実行を検証（確認が不要な場合のみ許可）
   */
  validateAction(action: Action): void {
    const analysis = this.analyze(action);

    if (!analysis.allowed) {
      throw new SecurityError('ACTION_BLOCKED', analysis.blockReason ?? 'Action blocked', analysis);
    }

    if (analysis.requiresConfirmation) {
      throw new SecurityError(
        'CONFIRMATION_REQUIRED',
        `Action requires confirmation: ${analysis.reasons.join(', ')}`,
        analysis
      );
    }
  }

  /**
   * 確認付きでアクションを検証
   */
  validateActionWithConfirmation(action: Action, confirmed: boolean): void {
    const analysis = this.analyze(action);

    if (!analysis.allowed) {
      throw new SecurityError('ACTION_BLOCKED', analysis.blockReason ?? 'Action blocked', analysis);
    }

    if (analysis.requiresConfirmation && !confirmed) {
      throw new SecurityError(
        'CONFIRMATION_DENIED',
        'User did not confirm the action',
        analysis
      );
    }
  }

  /**
   * 拒否パターンをチェック（REQ-012-03）
   */
  private checkDenyPatterns(action: Action): PatternRule | null {
    if (!action.target) return null;

    for (const rule of this.policy.denyPatterns) {
      // アクションタイプフィルター
      if (rule.actionTypes && !rule.actionTypes.includes(action.type)) {
        continue;
      }

      // パターンマッチ
      if (micromatch.isMatch(action.target, rule.pattern)) {
        return rule;
      }
    }

    return null;
  }

  /**
   * 許可パターンをチェック（REQ-012-04）
   */
  private checkAllowPatterns(action: Action): PatternRule | null {
    if (!action.target) return null;

    for (const rule of this.policy.allowPatterns) {
      // アクションタイプフィルター
      if (rule.actionTypes && !rule.actionTypes.includes(action.type)) {
        continue;
      }

      // パターンマッチ
      if (micromatch.isMatch(action.target, rule.pattern)) {
        return rule;
      }
    }

    return null;
  }

  /**
   * リスクレベルを評価
   */
  private evaluateRiskLevel(
    action: Action,
    matchedRules: string[],
    reasons: string[]
  ): RiskLevel {
    let maxRiskLevel: RiskLevel = 'low';

    for (const rule of this.riskRules) {
      if (this.matchesRule(action, rule)) {
        matchedRules.push(rule.name);
        reasons.push(rule.description);

        // より高いリスクレベルを採用
        if (RISK_LEVEL_ORDER[rule.riskLevel] > RISK_LEVEL_ORDER[maxRiskLevel]) {
          maxRiskLevel = rule.riskLevel;
        }
      }
    }

    return maxRiskLevel;
  }

  /**
   * ルールがアクションにマッチするかチェック
   */
  private matchesRule(action: Action, rule: RiskRule): boolean {
    const { match } = rule;

    // アクションタイプチェック
    if (match.actionTypes && !match.actionTypes.includes(action.type)) {
      return false;
    }

    // ターゲットパターンチェック
    if (match.targetPatterns && action.target) {
      const matchesTarget = match.targetPatterns.some((pattern) =>
        micromatch.isMatch(action.target!, pattern)
      );
      if (!matchesTarget) {
        return false;
      }
    }

    // パラメータ条件チェック
    if (match.paramConditions && action.params) {
      for (const [key, value] of Object.entries(match.paramConditions)) {
        if (action.params[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 現在のポリシーを取得
   */
  getPolicy(): SecurityPolicy {
    return { ...this.policy };
  }

  /**
   * リスクルールを取得
   */
  getRiskRules(): RiskRule[] {
    return [...this.riskRules];
  }

  /**
   * ポリシーを更新
   */
  updatePolicy(update: Partial<SecurityPolicy>): void {
    if (update.allowPatterns) {
      this.policy.allowPatterns = update.allowPatterns;
    }
    if (update.denyPatterns) {
      this.policy.denyPatterns = update.denyPatterns;
    }
    if (update.requireConfirmation) {
      this.policy.requireConfirmation = update.requireConfirmation;
    }
    if (update.maxRiskLevel) {
      this.policy.maxRiskLevel = update.maxRiskLevel;
    }
    if (update.customRiskRules) {
      this.policy.customRiskRules = update.customRiskRules;
    }
  }
}
