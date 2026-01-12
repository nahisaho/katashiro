/**
 * QueryPlanner - クエリ計画立案
 *
 * 検索クエリを各エージェント向けに最適化し、実行計画を生成する。
 *
 * @requirement REQ-COLLECT-008
 * @design DES-COLLECT-008
 * @task TASK-002
 */

import type { WideResearchQuery, SourceType } from './types.js';
import type { ISearchAgent, AgentSearchQuery } from './agents/types.js';

/**
 * クエリ実行計画
 */
export interface QueryPlan {
  /** 実行するエージェント */
  agents: ISearchAgent[];

  /** エージェント別のクエリ */
  queries: Map<SourceType, AgentSearchQuery>;

  /** 各エージェントのタイムアウト */
  timeout: number;
}

/**
 * クエリ計画立案クラス
 *
 * @example
 * ```typescript
 * const planner = new QueryPlanner();
 * const plan = planner.plan(query, agents);
 * ```
 */
export class QueryPlanner {
  /**
   * クエリ計画を生成
   */
  plan(
    query: WideResearchQuery,
    agents: ISearchAgent[],
    config: {
      agentTimeout: number;
      maxResultsPerSource: number;
    } = { agentTimeout: 30000, maxResultsPerSource: 20 }
  ): QueryPlan {
    const queries = new Map<SourceType, AgentSearchQuery>();

    for (const agent of agents) {
      const agentQuery = this.createAgentQuery(query, agent.type, config);
      queries.set(agent.type, agentQuery);
    }

    return {
      agents,
      queries,
      timeout: config.agentTimeout,
    };
  }

  /**
   * エージェント固有のクエリを生成
   */
  private createAgentQuery(
    query: WideResearchQuery,
    sourceType: SourceType,
    config: { agentTimeout: number; maxResultsPerSource: number }
  ): AgentSearchQuery {
    // ソースタイプに応じてクエリを最適化
    const optimizedQuery = this.optimizeQueryForSource(query.topic, sourceType);

    return {
      query: optimizedQuery,
      maxResults: query.maxResultsPerSource ?? config.maxResultsPerSource,
      languages: query.languages,
      dateRange: query.dateRange,
      timeout: query.agentTimeout ?? config.agentTimeout,
    };
  }

  /**
   * ソースタイプに応じてクエリを最適化
   */
  private optimizeQueryForSource(topic: string, sourceType: SourceType): string {
    switch (sourceType) {
      case 'academic':
        // 学術検索では専門用語を保持、不要な修飾語を削除
        return this.cleanAcademicQuery(topic);

      case 'news':
        // ニュース検索では最新情報を優先
        return topic;

      case 'encyclopedia':
        // 百科事典では概念的なクエリに
        return this.simplifyQuery(topic);

      case 'web':
      default:
        return topic;
    }
  }

  /**
   * 学術検索用にクエリをクリーン化
   */
  private cleanAcademicQuery(query: string): string {
    // "最新の", "について", などの修飾語を除去
    const removePatterns = [
      /最新の/g,
      /について/g,
      /に関する/g,
      /とは/g,
      /what is/gi,
      /latest/gi,
      /recent/gi,
    ];

    let cleaned = query;
    for (const pattern of removePatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    return cleaned.trim();
  }

  /**
   * 百科事典用にクエリを簡略化
   */
  private simplifyQuery(query: string): string {
    // 最初の主要な名詞句を抽出（シンプルなアプローチ）
    const words = query.split(/\s+/);

    // 3語以下ならそのまま
    if (words.length <= 3) {
      return query;
    }

    // 最初の3語を使用
    return words.slice(0, 3).join(' ');
  }
}
