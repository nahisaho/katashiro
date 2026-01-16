/**
 * LM Reasoning - LLM-based Reasoning Module
 *
 * 反省的質問生成・回答評価・EARS変換
 *
 * @version 3.0.0
 */

import type {
  LMProvider,
  LMGenerationOptions,
  ResearchContext,
  ReflectiveQuestion,
  EvaluationResult,
  KnowledgeItem,
} from './types.js';

/**
 * LM Reasoning Configuration
 */
export interface LMReasoningConfig {
  /** LM Provider instance */
  provider?: LMProvider;
  /** Default temperature */
  temperature?: number;
  /** Max tokens for generation */
  maxTokens?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Simple LM Provider using fetch
 */
export class FetchLMProvider implements LMProvider {
  readonly name = 'fetch';

  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(
    endpoint: string,
    apiKey: string,
    model = 'gpt-4o-mini'
  ) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.model = model;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async generate(
    prompt: string,
    options?: LMGenerationOptions
  ): Promise<string> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: options?.systemPrompt ?? 'You are a helpful research assistant.' },
          { role: 'user', content: prompt },
        ],
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1000,
        stop: options?.stop,
      }),
    });

    if (!response.ok) {
      throw new Error(`LM API failed: ${response.status}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? '';
  }
}

/**
 * No-Op LM Provider (uses templates when no LLM available)
 */
export class TemplateLMProvider implements LMProvider {
  readonly name = 'template';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async generate(prompt: string): Promise<string> {
    // Return a template-based response
    if (prompt.includes('reflective questions')) {
      return JSON.stringify([
        { question: 'この分野の最新動向は何ですか？', reason: '最新情報を収集するため', priority: 5 },
        { question: 'どのような課題がありますか？', reason: '問題点を把握するため', priority: 4 },
        { question: '成功事例はありますか？', reason: '実践的な情報を得るため', priority: 3 },
      ]);
    }

    if (prompt.includes('evaluate') || prompt.includes('definitive')) {
      return JSON.stringify({
        isDefinitive: false,
        confidence: 0.5,
        missingAspects: ['詳細な分析', '具体的なデータ', '専門家の見解'],
        reasoning: 'より詳細な情報が必要です',
      });
    }

    return prompt;
  }
}

/**
 * LMReasoning - LLMを使った推論モジュール
 */
export class LMReasoning {
  private readonly provider: LMProvider;
  private readonly config: Required<Omit<LMReasoningConfig, 'provider'>>;
  private tokensUsed = 0;

  constructor(config: LMReasoningConfig = {}) {
    this.provider = config.provider ?? new TemplateLMProvider();
    this.config = {
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 1500,
      debug: config.debug ?? false,
    };
  }

  /**
   * Generate reflective questions based on current research state
   */
  async generateReflectiveQuestions(
    context: ResearchContext
  ): Promise<ReflectiveQuestion[]> {
    const knowledgeSummary = context.knowledgeBase
      .slice(-10)
      .map((k) => `- ${k.content}`)
      .join('\n');

    const previousQs = context.previousQuestions
      .map((q) => q.question)
      .join('\n');

    const prompt = `You are a research assistant helping to deeply investigate a topic.

Current Research Query: "${context.query}"
Iteration: ${context.iteration} of ${context.maxIterations}

Current Knowledge:
${knowledgeSummary || 'No knowledge collected yet.'}

Previous Questions Asked:
${previousQs || 'None yet.'}

Based on the current state, generate 3-5 reflective questions that will help:
1. Fill knowledge gaps
2. Explore different perspectives
3. Find concrete examples or data
4. Validate or challenge current findings

Return a JSON array with this format:
[
  {"question": "...", "reason": "...", "priority": 1-5}
]

Focus on questions that will lead to NEW information not already in the knowledge base.
Avoid repeating previous questions.
Higher priority (5) for fundamental questions, lower (1) for nice-to-have.`;

    try {
      const response = await this.provider.generate(prompt, {
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        systemPrompt: 'You are a research planning assistant. Always respond with valid JSON.',
      });

      // Estimate tokens used
      this.tokensUsed += this.estimateTokens(prompt) + this.estimateTokens(response);

      // Parse response
      return this.parseQuestionsResponse(response);
    } catch (error) {
      if (this.config.debug) {
        console.error('[LMReasoning] Failed to generate questions:', error);
      }
      return this.fallbackQuestions(context);
    }
  }

  /**
   * Evaluate if the current answer is definitive
   */
  async evaluateAnswer(
    query: string,
    answer: string,
    knowledgeBase: KnowledgeItem[]
  ): Promise<EvaluationResult> {
    const knowledgeSummary = knowledgeBase
      .slice(-15)
      .map((k) => `- [${k.type}] ${k.content}`)
      .join('\n');

    const prompt = `You are evaluating a research answer for completeness and quality.

Original Query: "${query}"

Current Answer/Summary:
${answer}

Supporting Knowledge:
${knowledgeSummary}

Evaluate whether this answer is DEFINITIVE (comprehensive, well-supported, addresses the query fully).

Return a JSON object with this format:
{
  "isDefinitive": true/false,
  "confidence": 0.0-1.0,
  "missingAspects": ["aspect1", "aspect2"],
  "reasoning": "Your explanation"
}

Consider:
- Are all aspects of the query addressed?
- Is the answer supported by sufficient evidence?
- Are there any obvious gaps or missing perspectives?
- Would a reasonable person find this answer satisfactory?`;

    try {
      const response = await this.provider.generate(prompt, {
        temperature: 0.3, // Lower temperature for evaluation
        maxTokens: 500,
        systemPrompt: 'You are a research evaluation assistant. Always respond with valid JSON.',
      });

      this.tokensUsed += this.estimateTokens(prompt) + this.estimateTokens(response);

      return this.parseEvaluationResponse(response);
    } catch (error) {
      if (this.config.debug) {
        console.error('[LMReasoning] Failed to evaluate answer:', error);
      }
      return this.fallbackEvaluation(knowledgeBase);
    }
  }

  /**
   * Generate EARS (Explicit, Actionable, Relevant, Specific) search queries
   */
  async generateSearchQueries(
    question: ReflectiveQuestion,
    context: ResearchContext
  ): Promise<string[]> {
    const prompt = `Convert this research question into 2-3 effective search queries.

Question: "${question.question}"
Reason: ${question.reason}
Context: Researching "${context.query}"

Generate queries that are:
- E: Explicit - clear and unambiguous
- A: Actionable - likely to return useful results
- R: Relevant - directly related to the question
- S: Specific - focused, not too broad

Return a JSON array of strings:
["query1", "query2", "query3"]

Use the appropriate language for the topic (Japanese for Japanese topics, English for technical terms).`;

    try {
      const response = await this.provider.generate(prompt, {
        temperature: 0.5,
        maxTokens: 300,
        systemPrompt: 'You are a search query optimization assistant. Always respond with valid JSON.',
      });

      this.tokensUsed += this.estimateTokens(prompt) + this.estimateTokens(response);

      const parsed = JSON.parse(this.extractJson(response)) as string[];
      return Array.isArray(parsed) ? parsed : [question.question];
    } catch {
      // Fallback: use the question directly
      return [question.question];
    }
  }

  /**
   * Synthesize knowledge into a summary
   */
  async synthesizeKnowledge(
    query: string,
    knowledgeBase: KnowledgeItem[]
  ): Promise<string> {
    if (knowledgeBase.length === 0) {
      return 'No knowledge has been collected yet.';
    }

    const facts = knowledgeBase
      .filter((k) => k.type === 'fact')
      .slice(-20)
      .map((k) => `- ${k.content}`)
      .join('\n');

    const opinions = knowledgeBase
      .filter((k) => k.type === 'opinion')
      .slice(-10)
      .map((k) => `- ${k.content}`)
      .join('\n');

    const recommendations = knowledgeBase
      .filter((k) => k.type === 'recommendation')
      .slice(-5)
      .map((k) => `- ${k.content}`)
      .join('\n');

    const prompt = `Synthesize the following research findings into a coherent summary.

Research Query: "${query}"

Facts:
${facts || 'None collected.'}

Opinions/Perspectives:
${opinions || 'None collected.'}

Recommendations:
${recommendations || 'None collected.'}

Create a well-structured summary that:
1. Addresses the original query
2. Integrates facts and opinions appropriately
3. Highlights key findings
4. Notes any limitations or gaps

Write in a clear, professional style.`;

    try {
      const response = await this.provider.generate(prompt, {
        temperature: 0.5,
        maxTokens: 1500,
        systemPrompt: 'You are a research synthesis assistant. Create clear, well-organized summaries.',
      });

      this.tokensUsed += this.estimateTokens(prompt) + this.estimateTokens(response);

      return response.trim();
    } catch (error) {
      if (this.config.debug) {
        console.error('[LMReasoning] Failed to synthesize:', error);
      }
      // Fallback: simple concatenation
      return `## Summary for: ${query}\n\n### Facts\n${facts}\n\n### Opinions\n${opinions}\n\n### Recommendations\n${recommendations}`;
    }
  }

  /**
   * Get total tokens used
   */
  getTokensUsed(): number {
    return this.tokensUsed;
  }

  /**
   * Reset token counter
   */
  resetTokenCount(): void {
    this.tokensUsed = 0;
  }

  // ============ Private Methods ============

  private parseQuestionsResponse(response: string): ReflectiveQuestion[] {
    try {
      const json = this.extractJson(response);
      const parsed = JSON.parse(json) as Array<{
        question: string;
        reason: string;
        priority: number;
      }>;

      if (!Array.isArray(parsed)) return [];

      return parsed.map((q) => ({
        question: q.question ?? '',
        reason: q.reason ?? '',
        priority: q.priority ?? 3,
      }));
    } catch {
      return [];
    }
  }

  private parseEvaluationResponse(response: string): EvaluationResult {
    try {
      const json = this.extractJson(response);
      const parsed = JSON.parse(json) as Partial<EvaluationResult>;

      return {
        isDefinitive: parsed.isDefinitive ?? false,
        confidence: parsed.confidence ?? 0.5,
        missingAspects: parsed.missingAspects ?? [],
        reasoning: parsed.reasoning ?? '',
      };
    } catch {
      return {
        isDefinitive: false,
        confidence: 0.5,
        missingAspects: ['Unable to parse evaluation'],
        reasoning: 'Evaluation parsing failed',
      };
    }
  }

  private extractJson(text: string): string {
    // Try to find JSON in the response
    const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : text;
  }

  private fallbackQuestions(context: ResearchContext): ReflectiveQuestion[] {
    const { query, iteration } = context;

    const questions: ReflectiveQuestion[] = [
      {
        question: `${query}の最新動向は？`,
        reason: '最新情報を収集',
        priority: 5,
      },
      {
        question: `${query}の課題や問題点は？`,
        reason: '問題点の把握',
        priority: 4,
      },
      {
        question: `${query}の成功事例は？`,
        reason: '実践的情報の収集',
        priority: 3,
      },
    ];

    if (iteration > 3) {
      questions.push({
        question: `${query}の将来展望は？`,
        reason: '将来予測の収集',
        priority: 2,
      });
    }

    return questions;
  }

  private fallbackEvaluation(knowledgeBase: KnowledgeItem[]): EvaluationResult {
    const factCount = knowledgeBase.filter((k) => k.type === 'fact').length;
    const avgRelevance = knowledgeBase.length > 0
      ? knowledgeBase.reduce((sum, k) => sum + k.relevance, 0) / knowledgeBase.length
      : 0;

    return {
      isDefinitive: factCount >= 10 && avgRelevance >= 0.7,
      confidence: Math.min(factCount / 15, 1) * avgRelevance,
      missingAspects: factCount < 10 ? ['More facts needed'] : [],
      reasoning: `Based on ${factCount} facts with average relevance ${avgRelevance.toFixed(2)}`,
    };
  }

  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token for English, ~2 for Japanese
    return Math.ceil(text.length / 3);
  }
}

/**
 * Create an LMReasoning instance
 */
export function createLMReasoning(config?: LMReasoningConfig): LMReasoning {
  return new LMReasoning(config);
}

/**
 * Create an LMReasoning with OpenAI provider
 */
export function createOpenAIReasoning(
  apiKey: string,
  model = 'gpt-4o-mini'
): LMReasoning {
  return new LMReasoning({
    provider: new FetchLMProvider(
      'https://api.openai.com/v1/chat/completions',
      apiKey,
      model
    ),
  });
}
