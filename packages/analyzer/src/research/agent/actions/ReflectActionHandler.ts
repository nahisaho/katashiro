/**
 * ReflectActionHandler - リフレクションアクション
 *
 * @requirement REQ-DR-001
 * @design DES-v2.1.0-DeepResearchAgent
 */

import type { LLMClientInterface, ReflectParams } from '../types.js';
import { BaseActionHandler, type ExecutionContext, type ActionResult, type ActionHandlerOptions } from './BaseActionHandler.js';

/**
 * リフレクションアクションハンドラのオプション
 */
export interface ReflectActionHandlerOptions extends ActionHandlerOptions {
  /** LLMクライアント */
  llmClient: LLMClientInterface;
}

/**
 * 質問をサブ質問に分解するアクションハンドラ
 */
export class ReflectActionHandler extends BaseActionHandler<ReflectParams> {
  readonly actionType = 'reflect' as const;

  private llmClient: LLMClientInterface;

  constructor(options: ReflectActionHandlerOptions) {
    super(options);
    this.llmClient = options.llmClient;
  }

  /**
   * リフレクションを実行
   */
  async execute(params: ReflectParams, context: ExecutionContext): Promise<ActionResult> {
    const { questions } = params;
    const knowledgeItems: ActionResult['knowledgeItems'] = [];

    try {
      // 現在のナレッジをコンテキストとして構築
      const knowledgeContext = context.currentKnowledge
        .slice(-10)
        .map((k) => k.summary)
        .join('\n');

      // 各サブ質問に対してリフレクション
      for (const question of questions) {
        const reflectionResult = await this.reflectOnQuestion(
          question,
          context.question,
          knowledgeContext
        );

        // リフレクション結果をナレッジアイテムとして保存
        const item = this.createKnowledgeItem(
          `Sub-question: ${question}\n\nAnalysis: ${reflectionResult.analysis}\n\nGaps: ${reflectionResult.gaps.join(', ')}`,
          {
            type: 'reflection',
            title: `Reflection: ${question.slice(0, 50)}...`,
          }
        );
        knowledgeItems.push(item);
      }

      return {
        success: true,
        knowledgeItems,
        metadata: {
          subQuestions: questions,
          reflectionCount: knowledgeItems.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        knowledgeItems: [],
        error: error instanceof Error ? error.message : 'Reflection failed',
      };
    }
  }

  /**
   * 単一の質問に対してリフレクション
   */
  private async reflectOnQuestion(
    subQuestion: string,
    mainQuestion: string,
    knowledgeContext: string
  ): Promise<{ analysis: string; gaps: string[]; suggestedQueries: string[] }> {
    const prompt = `Analyze this sub-question in the context of the main research question.

Main Question: "${mainQuestion}"
Sub-question: "${subQuestion}"

Current Knowledge:
${knowledgeContext || 'No knowledge gathered yet.'}

Provide:
1. Analysis: How this sub-question relates to the main question
2. Gaps: What information is still missing
3. Suggested Queries: Search queries to fill the gaps

Respond in JSON format:
{
  "analysis": "...",
  "gaps": ["gap1", "gap2"],
  "suggestedQueries": ["query1", "query2"]
}`;

    const response = await this.llmClient.chat({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      maxTokens: 800,
    });

    // トークン追跡
    if (response.usage) {
      this.tokenTracker.trackUsage(
        response.usage.promptTokens ?? 0,
        response.usage.completionTokens ?? 0
      );
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          analysis: string;
          gaps: string[];
          suggestedQueries: string[];
        };
        return parsed;
      }
    } catch {
      // パース失敗
    }

    // デフォルト
    return {
      analysis: response.content,
      gaps: ['More information needed'],
      suggestedQueries: [subQuestion],
    };
  }
}
