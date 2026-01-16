/**
 * Research Engine - Main Orchestrator
 *
 * Template Method Pattern による Deep Research オーケストレーション
 *
 * @version 3.0.0
 */

import type {
  ResearchConfig,
  ResearchReport,
  ResearchContext,
  SERPQuery,
  SearchResult,
  KnowledgeItem,
  ReflectiveQuestion,
  Finding,
  TechnicalOption,
  Recommendation,
  Reference,
  IterationLog,
  ResearchAction,
  ResearchEvent,
  ResearchEventListener,
  EvaluationResult,
} from './types.js';
import {
  SearchProviderFactory,
  createProviderFactory,
} from './provider-factory.js';
import { KnowledgeBase, createKnowledgeBase } from './knowledge-base.js';
import { LMReasoning, createLMReasoning, FetchLMProvider } from './lm-reasoning.js';

/**
 * Research Engine Configuration
 */
export interface ResearchEngineConfig {
  /** Provider factory */
  providerFactory?: SearchProviderFactory;
  /** Knowledge base */
  knowledgeBase?: KnowledgeBase;
  /** LM Reasoning module */
  lmReasoning?: LMReasoning;
  /** OpenAI API Key (creates default LM) */
  openaiApiKey?: string;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Research State
 */
interface ResearchState {
  iteration: number;
  tokensUsed: number;
  startTime: number;
  visitedUrls: Set<string>;
  questions: ReflectiveQuestion[];
  logs: IterationLog[];
  lastEvaluation?: EvaluationResult;
}

/**
 * ResearchEngine - Deep Research オーケストレーター
 */
export class ResearchEngine {
  private readonly providerFactory: SearchProviderFactory;
  private readonly knowledgeBase: KnowledgeBase;
  private readonly lmReasoning: LMReasoning;
  private readonly debug: boolean;

  private readonly listeners: Set<ResearchEventListener> = new Set();
  private state: ResearchState | null = null;

  constructor(config: ResearchEngineConfig = {}) {
    this.debug = config.debug ?? false;

    // Initialize provider factory
    this.providerFactory =
      config.providerFactory ?? createProviderFactory(undefined, this.debug);

    // Initialize knowledge base
    this.knowledgeBase =
      config.knowledgeBase ?? createKnowledgeBase({ debug: this.debug });

    // Initialize LM reasoning
    if (config.lmReasoning) {
      this.lmReasoning = config.lmReasoning;
    } else if (config.openaiApiKey) {
      this.lmReasoning = new LMReasoning({
        provider: new FetchLMProvider(
          'https://api.openai.com/v1/chat/completions',
          config.openaiApiKey,
          'gpt-4o-mini'
        ),
        debug: this.debug,
      });
    } else {
      this.lmReasoning = createLMReasoning({ debug: this.debug });
    }
  }

  /**
   * Run deep research
   */
  async research(config: ResearchConfig): Promise<ResearchReport> {
    // Validate and set defaults
    const {
      query,
      maxIterations = 10,
      tokenBudget = 15000,
      outputFormat = 'markdown',
      // language is available for future use
    } = config;

    // Initialize state
    this.state = {
      iteration: 0,
      tokensUsed: 0,
      startTime: Date.now(),
      visitedUrls: new Set(),
      questions: [],
      logs: [],
    };

    // Clear previous knowledge
    this.knowledgeBase.clear();
    this.lmReasoning.resetTokenCount();

    // Emit start event
    this.emit({ type: 'start', data: { query, maxIterations }, timestamp: Date.now() });

    try {
      // Main research loop
      while (this.state.iteration < maxIterations) {
        this.state.iteration++;

        this.emit({
          type: 'iteration_start',
          iteration: this.state.iteration,
          timestamp: Date.now(),
        });

        // Step 1: Generate questions for this iteration
        await this.generateQuestions(query);

        // Step 2: Search for each question
        await this.performSearches();

        // Step 3: Read and extract content
        await this.readContent();

        // Step 4: Reason and synthesize
        await this.reason(query);

        // Step 5: Evaluate if we have a definitive answer
        const evaluation = await this.evaluate(query);
        this.state.lastEvaluation = evaluation;

        this.emit({
          type: 'iteration_complete',
          iteration: this.state.iteration,
          data: { evaluation },
          timestamp: Date.now(),
        });

        // Check termination conditions
        if (evaluation.isDefinitive && evaluation.confidence >= 0.8) {
          this.emit({
            type: 'answer_found',
            iteration: this.state.iteration,
            data: { confidence: evaluation.confidence },
            timestamp: Date.now(),
          });
          break;
        }

        // Check token budget
        const totalTokens = this.lmReasoning.getTokensUsed();
        if (totalTokens >= tokenBudget) {
          if (this.debug) {
            console.log(`[ResearchEngine] Token budget exceeded: ${totalTokens}/${tokenBudget}`);
          }
          break;
        }
      }

      // Generate final report
      const report = await this.generateReport(query, outputFormat);

      this.emit({
        type: 'complete',
        data: { report: { ...report, markdown: undefined } },
        timestamp: Date.now(),
      });

      return report;
    } catch (error) {
      this.emit({
        type: 'error',
        data: { error: (error as Error).message },
        timestamp: Date.now(),
      });
      throw error;
    }
  }

  /**
   * Add event listener
   */
  on(listener: ResearchEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Remove event listener
   */
  off(listener: ResearchEventListener): void {
    this.listeners.delete(listener);
  }

  // ============ Template Method Steps ============

  /**
   * Step 1: Generate reflective questions
   */
  protected async generateQuestions(query: string): Promise<void> {
    if (!this.state) return;

    const context: ResearchContext = {
      query,
      iteration: this.state.iteration,
      maxIterations: 10,
      knowledgeBase: this.knowledgeBase.getAll(),
      previousQuestions: this.state.questions,
    };

    const questions = await this.lmReasoning.generateReflectiveQuestions(context);

    // Add new questions
    this.state.questions.push(...questions);

    if (this.debug) {
      console.log(`[ResearchEngine] Generated ${questions.length} questions`);
    }
  }

  /**
   * Step 2: Perform searches
   */
  protected async performSearches(): Promise<void> {
    if (!this.state) return;

    // Get questions for this iteration
    const questions = this.state.questions.slice(-5);
    const searchResults: SearchResult[] = [];

    for (const question of questions) {
      const serpQuery: SERPQuery = {
        keywords: question.question,
        topK: 5,
        timestamp: Date.now(),
        iteration: this.state.iteration,
      };

      try {
        const results = await this.providerFactory.search(serpQuery);
        searchResults.push(...results);

        this.logAction({
          type: 'search',
          query: question.question,
          resultsCount: results.length,
        });
      } catch (error) {
        if (this.debug) {
          console.error(`[ResearchEngine] Search failed: ${(error as Error).message}`);
        }
      }
    }

    // Store search results temporarily
    (this.state as ResearchState & { searchResults?: SearchResult[] }).searchResults = searchResults;

    this.emit({
      type: 'search_complete',
      iteration: this.state.iteration,
      data: { resultCount: searchResults.length },
      timestamp: Date.now(),
    });
  }

  /**
   * Step 3: Read content from URLs
   */
  protected async readContent(): Promise<void> {
    if (!this.state) return;

    const searchResults =
      ((this.state as ResearchState & { searchResults?: SearchResult[] }).searchResults) ?? [];

    // Filter out already visited URLs
    const newUrls = searchResults
      .map((r) => r.url)
      .filter((url) => !this.state!.visitedUrls.has(url))
      .slice(0, 5); // Limit per iteration

    let totalFactsExtracted = 0;

    for (const url of newUrls) {
      try {
        const content = await this.providerFactory.read({ url, timeout: 15000 });

        // Add to knowledge base
        const added = this.knowledgeBase.addFromContent(content, this.state.iteration);
        totalFactsExtracted += added.length;

        // Mark as visited
        this.state.visitedUrls.add(url);

        this.logAction({
          type: 'read',
          url,
          success: true,
          factsExtracted: added.length,
        });
      } catch (error) {
        if (this.debug) {
          console.error(`[ResearchEngine] Read failed for ${url}: ${(error as Error).message}`);
        }

        this.logAction({
          type: 'read',
          url,
          success: false,
          factsExtracted: 0,
        });
      }
    }

    this.emit({
      type: 'read_complete',
      iteration: this.state.iteration,
      data: { urlsRead: newUrls.length, factsExtracted: totalFactsExtracted },
      timestamp: Date.now(),
    });
  }

  /**
   * Step 4: Reason and synthesize
   */
  protected async reason(query: string): Promise<void> {
    if (!this.state) return;

    const knowledgeItems = this.knowledgeBase.getAll();
    const beforeTokens = this.lmReasoning.getTokensUsed();

    // Synthesize current knowledge
    await this.lmReasoning.synthesizeKnowledge(query, knowledgeItems);

    const tokensUsed = this.lmReasoning.getTokensUsed() - beforeTokens;

    this.logAction({
      type: 'reason',
      tokensUsed,
      knowledgeGained: knowledgeItems.length,
    });

    this.emit({
      type: 'reason_complete',
      iteration: this.state.iteration,
      data: { tokensUsed, knowledgeCount: knowledgeItems.length },
      timestamp: Date.now(),
    });
  }

  /**
   * Step 5: Evaluate answer quality
   */
  protected async evaluate(query: string): Promise<EvaluationResult> {
    if (!this.state) {
      return {
        isDefinitive: false,
        confidence: 0,
        missingAspects: [],
        reasoning: '',
      };
    }

    const knowledgeItems = this.knowledgeBase.getAll();
    const summary = this.knowledgeBase.getSummaryText();

    return this.lmReasoning.evaluateAnswer(query, summary, knowledgeItems);
  }

  // ============ Report Generation ============

  /**
   * Generate final report
   */
  protected async generateReport(
    query: string,
    format: 'markdown' | 'json'
  ): Promise<ResearchReport> {
    if (!this.state) {
      throw new Error('No research state');
    }

    const knowledgeItems = this.knowledgeBase.getAll();

    // Generate summary
    const summary = await this.lmReasoning.synthesizeKnowledge(query, knowledgeItems);

    // Extract findings
    const findings = this.extractFindings(knowledgeItems);

    // Extract options (if applicable)
    const options = this.extractOptions(knowledgeItems);

    // Generate recommendations
    const recommendations = this.generateRecommendations(knowledgeItems);

    // Build references
    const references = this.buildReferences();

    // Build metadata
    const metadata = {
      iterations: this.state.iteration,
      tokensUsed: this.lmReasoning.getTokensUsed(),
      durationMs: Date.now() - this.state.startTime,
      confidence: this.state.lastEvaluation?.confidence ?? 0,
      knowledgeCount: knowledgeItems.length,
      urlsVisited: this.state.visitedUrls.size,
    };

    const report: ResearchReport = {
      query,
      summary,
      findings,
      options,
      recommendations,
      references,
      metadata,
    };

    // Add markdown if requested
    if (format === 'markdown') {
      report.markdown = this.formatAsMarkdown(report);
    }

    return report;
  }

  /**
   * Extract findings from knowledge
   */
  private extractFindings(items: KnowledgeItem[]): Finding[] {
    // Group by relevance and extract top findings
    const topItems = items
      .filter((i) => i.type === 'fact')
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10);

    return topItems.map((item) => ({
      statement: item.content,
      citations: item.sources,
      confidence: item.relevance,
    }));
  }

  /**
   * Extract technical options
   */
  private extractOptions(items: KnowledgeItem[]): TechnicalOption[] {
    // Look for items that describe options or alternatives
    const optionItems = items.filter(
      (i) =>
        i.content.includes('オプション') ||
        i.content.includes('選択肢') ||
        i.content.includes('方法') ||
        i.content.includes('alternative') ||
        i.content.includes('option')
    );

    // Simple extraction (could be enhanced with LLM)
    return optionItems.slice(0, 3).map((item, idx) => ({
      name: `Option ${idx + 1}`,
      description: item.content,
      pros: [],
      cons: [],
      useCases: [],
    }));
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(items: KnowledgeItem[]): Recommendation[] {
    const recItems = items.filter((i) => i.type === 'recommendation');

    return recItems.slice(0, 5).map((item, idx) => ({
      recommendation: item.content,
      rationale: 'Based on research findings',
      priority: 5 - idx,
    }));
  }

  /**
   * Build reference list
   */
  private buildReferences(): Reference[] {
    if (!this.state) return [];

    const sources = this.knowledgeBase.getSources();
    const today = new Date().toISOString().split('T')[0] ?? new Date().toISOString();

    return sources.map((url, idx) => ({
      id: `ref-${idx + 1}`,
      url,
      title: this.extractTitleFromUrl(url),
      accessDate: today,
    }));
  }

  /**
   * Extract title from URL
   */
  private extractTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  /**
   * Format report as Markdown
   */
  private formatAsMarkdown(report: ResearchReport): string {
    const lines: string[] = [];

    lines.push(`# ${report.query}`);
    lines.push('');
    lines.push(`> Generated by KATASHIRO Deep Research v3.0.0`);
    lines.push(`> ${new Date().toISOString()}`);
    lines.push('');

    // Summary
    lines.push('## 概要');
    lines.push('');
    lines.push(report.summary);
    lines.push('');

    // Findings
    if (report.findings.length > 0) {
      lines.push('## 主な発見');
      lines.push('');
      for (const finding of report.findings) {
        lines.push(`- ${finding.statement}`);
        if (finding.citations.length > 0) {
          lines.push(`  - *出典: ${finding.citations[0]}*`);
        }
      }
      lines.push('');
    }

    // Options
    if (report.options.length > 0) {
      lines.push('## 選択肢');
      lines.push('');
      for (const option of report.options) {
        lines.push(`### ${option.name}`);
        lines.push(option.description);
        lines.push('');
      }
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      lines.push('## 推奨事項');
      lines.push('');
      for (const rec of report.recommendations) {
        lines.push(`${rec.priority}. ${rec.recommendation}`);
      }
      lines.push('');
    }

    // References
    if (report.references.length > 0) {
      lines.push('## 参考文献');
      lines.push('');
      for (const ref of report.references) {
        lines.push(`- [${ref.title}](${ref.url}) (${ref.accessDate})`);
      }
      lines.push('');
    }

    // Metadata
    lines.push('---');
    lines.push('');
    lines.push('## メタデータ');
    lines.push('');
    lines.push(`- イテレーション: ${report.metadata.iterations}`);
    lines.push(`- トークン使用量: ${report.metadata.tokensUsed}`);
    lines.push(`- 実行時間: ${(report.metadata.durationMs / 1000).toFixed(1)}秒`);
    lines.push(`- 信頼度: ${(report.metadata.confidence * 100).toFixed(0)}%`);
    lines.push(`- 収集知識: ${report.metadata.knowledgeCount}件`);
    lines.push(`- 訪問URL: ${report.metadata.urlsVisited}件`);

    return lines.join('\n');
  }

  // ============ Utility Methods ============

  /**
   * Emit event
   */
  private emit(event: ResearchEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        if (this.debug) {
          console.error('[ResearchEngine] Event listener error:', error);
        }
      }
    }
  }

  /**
   * Log action
   */
  private logAction(action: ResearchAction): void {
    if (!this.state) return;

    const log: IterationLog = {
      iteration: this.state.iteration,
      action,
      tokensUsed: this.lmReasoning.getTokensUsed(),
      knowledgeGained: this.knowledgeBase.getAll().length,
      timestamp: Date.now(),
    };

    this.state.logs.push(log);
  }
}

/**
 * Create a ResearchEngine instance
 */
export function createResearchEngine(
  config?: ResearchEngineConfig
): ResearchEngine {
  return new ResearchEngine(config);
}

/**
 * Quick research helper
 */
export async function deepResearch(
  query: string,
  options?: Partial<ResearchConfig> & { openaiApiKey?: string }
): Promise<ResearchReport> {
  const engine = new ResearchEngine({
    openaiApiKey: options?.openaiApiKey,
    debug: false,
  });

  return engine.research({
    query,
    maxIterations: options?.maxIterations ?? 5,
    tokenBudget: options?.tokenBudget ?? 10000,
    outputFormat: options?.outputFormat ?? 'markdown',
    language: options?.language ?? 'ja',
  });
}
