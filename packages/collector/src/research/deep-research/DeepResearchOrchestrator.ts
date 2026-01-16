/**
 * DeepResearchOrchestrator - 統合オーケストレーター
 *
 * リトライ、フォールバック、キャッシュ、チェックポイントを統合した
 * Deep Research実行エンジン
 *
 * @requirement REQ-DR-S-001, REQ-DR-S-002, REQ-DR-S-003
 * @requirement REQ-DR-U-001, REQ-DR-U-002, REQ-DR-U-003
 * @requirement REQ-DR-E-001, REQ-DR-E-005
 * @task TASK-034
 */

import { ok, err, isOk, type Result } from '@nahisaho/katashiro-core';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { UrlProcessor, type IScraperAdapter } from './UrlProcessor.js';
import { IterationController } from './IterationController.js';
import { CheckpointManager } from '../../content/checkpoint-manager.js';
import { VersionControl } from '../../content/version-control.js';
import { getLogger, type StructuredLogger } from '../../logging/index.js';
import type { CheckpointData, ContentEntry } from '../../content/types.js';
import type {
  DeepResearchQuery,
  DeepResearchConfig,
  DeepResearchResult,
  DeepResearchError,
  DeepResearchFinding,
  DeepResearchState,
  DeepResearchStatistics,
  OrchestratorEvent,
  OrchestratorEventListener,
  ProcessingPhase,
  UrlStatus,
  ReasoningStep,
} from './types.js';
import { DEFAULT_DEEP_RESEARCH_CONFIG, DeepResearchQuerySchema } from './types.js';
import type { WideResearchQuery, SourceType } from '../types.js';
import { WideResearchEngine } from '../WideResearchEngine.js';

/**
 * Deep Research Orchestrator
 *
 * Week 1-2で実装したモジュールを統合し、Deep Researchを実行。
 *
 * @example
 * ```typescript
 * const orchestrator = new DeepResearchOrchestrator(scraper);
 *
 * // イベント監視
 * orchestrator.on('iterationCompleted', (event) => {
 *   console.log(`Iteration ${event.data.iteration}: ${event.data.newInfoRate}% new info`);
 * });
 *
 * // 調査実行
 * const result = await orchestrator.research({
 *   topic: 'AI ethics in healthcare',
 *   maxIterations: 5,
 *   convergenceThreshold: 0.1,
 * });
 *
 * if (isOk(result)) {
 *   console.log(`Found ${result.value.findings.length} findings`);
 * }
 * ```
 */
export class DeepResearchOrchestrator extends EventEmitter {
  private config: DeepResearchConfig;
  private urlProcessor: UrlProcessor;
  private iterationController: IterationController;
  private checkpointManager: CheckpointManager;
  private versionControl: VersionControl;
  private wideResearchEngine: WideResearchEngine;
  private logger: StructuredLogger;
  private orchestratorListeners: OrchestratorEventListener[] = [];

  // 現在の状態
  private state: DeepResearchState | null = null;
  private currentQuery: DeepResearchQuery | null = null;

  // 処理済みコンテンツハッシュ（新規情報判定用）
  private processedHashes: Set<string> = new Set();

  constructor(scraper: IScraperAdapter, config: Partial<DeepResearchConfig> = {}) {
    super();
    this.config = { ...DEFAULT_DEEP_RESEARCH_CONFIG, ...config };

    // コンポーネント初期化
    this.urlProcessor = new UrlProcessor(scraper, {
      retry: this.config.retry,
      fallback: this.config.fallback,
      cache: this.config.cache,
      parallel: this.config.parallel,
      timeouts: this.config.timeouts,
    });

    this.iterationController = new IterationController({
      maxIterations: 5,
      convergenceThreshold: 0.1,
      timeoutMs: this.config.timeouts.perIteration,
    });

    this.checkpointManager = new CheckpointManager({
      directory: this.config.checkpoint.directory ?? './.katashiro/checkpoints',
      intervalMs: this.config.checkpoint.intervalMs ?? 60000,
      maxCheckpoints: this.config.checkpoint.maxCheckpoints ?? 10,
    });

    this.versionControl = new VersionControl();
    this.wideResearchEngine = new WideResearchEngine();
    this.logger = getLogger('DeepResearchOrchestrator');

    // イベントフォワード
    this.setupEventForwarding();
  }

  /**
   * Deep Researchを実行
   */
  async research(
    query: DeepResearchQuery
  ): Promise<Result<DeepResearchResult, DeepResearchError>> {
    const startTime = Date.now();

    try {
      // クエリ検証
      const validatedQuery = DeepResearchQuerySchema.parse(query);
      this.currentQuery = validatedQuery;

      // セッション初期化
      const sessionId = randomUUID();
      this.initializeState(sessionId);

      this.emitEvent('started', { topic: validatedQuery.topic });
      this.logger.info('Starting Deep Research', {
        sessionId,
        topic: validatedQuery.topic,
        maxIterations: validatedQuery.maxIterations,
      });

      // チェックポイントからの復元
      if (validatedQuery.resumeFromCheckpoint) {
        const restored = await this.restoreFromCheckpoint(validatedQuery.resumeFromCheckpoint);
        if (!restored) {
          return err({
            code: 'CHECKPOINT_ERROR',
            message: `Failed to restore from checkpoint: ${validatedQuery.resumeFromCheckpoint}`,
          });
        }
      }

      // 自動チェックポイント開始
      this.checkpointManager.startAutoSave(() => this.getCheckpointData());

      // メインループ
      const findings: DeepResearchFinding[] = [];
      const reasoningChain: ReasoningStep[] = [];
      let step = 0;

      while (this.iterationController.shouldContinue().continue) {
        const iteration = this.iterationController.startIteration();
        this.emitEvent('iterationStarted', { iteration });
        this.updatePhase('searching');

        const iterationStart = Date.now();

        try {
          // 1. 検索クエリを実行
          const searchUrls = await this.executeSearch(validatedQuery, iteration);

          // 2. URLを処理
          this.updatePhase('scraping');
          const processResults = await this.urlProcessor.processMany(searchUrls);

          // 3. 新規情報率を計算
          const successfulResults = processResults.filter((r) => r.success);
          const newContentCount = this.countNewContent(successfulResults);
          const newInfoRate = successfulResults.length > 0
            ? newContentCount / successfulResults.length
            : 0;

          // 4. 発見事項を抽出
          this.updatePhase('analyzing');
          const iterationFindings = this.extractFindings(successfulResults, iteration);
          findings.push(...iterationFindings);

          // 5. 推論ステップを追加
          step++;
          reasoningChain.push({
            step,
            type: iteration === 1 ? 'observation' : 'inference',
            description: `Iteration ${iteration}: Processed ${processResults.length} URLs, found ${iterationFindings.length} findings`,
            sourceIds: successfulResults.map((r) => r.url),
            findingIds: iterationFindings.map((f) => f.id),
            confidence: Math.min(0.9, 0.5 + newInfoRate * 0.4),
          });

          // 6. イテレーション完了
          this.iterationController.completeIteration({
            urlsProcessed: processResults.length,
            urlsSucceeded: successfulResults.length,
            urlsFailed: processResults.filter((r) => !r.success).length,
            newInfoRate,
            findings: iterationFindings.length,
            durationMs: Date.now() - iterationStart,
          });

          this.emitEvent('iterationCompleted', {
            iteration,
            urlsProcessed: processResults.length,
            newInfoRate,
            findingsCount: iterationFindings.length,
          });

          // URL状態を更新
          for (const result of processResults) {
            this.state!.urls.set(result.url, {
              url: result.url,
              status: result.success ? 'success' : 'failed',
              attempts: result.attempts,
              error: result.error,
              usedFallback: result.usedFallback,
              contentHash: result.contentHash,
            });
          }
        } catch (error) {
          const e = error instanceof Error ? error : new Error(String(error));
          this.iterationController.failIteration(e);
          this.logger.error('Iteration failed', { iteration, error: e.message });
        }
      }

      // 完了処理
      this.updatePhase('generating');
      this.checkpointManager.stopAutoSave();

      // 最終推論ステップ
      reasoningChain.push({
        step: step + 1,
        type: 'synthesis',
        description: `Synthesized ${findings.length} findings from ${this.iterationController.getCurrentIteration()} iterations`,
        sourceIds: [],
        findingIds: findings.map((f) => f.id),
        confidence: 0.85,
      });

      reasoningChain.push({
        step: step + 2,
        type: 'conclusion',
        description: `Research completed with ${this.iterationController.getAverageNewInfoRate().toFixed(2)} average new information rate`,
        sourceIds: [],
        findingIds: [],
        confidence: 0.9,
      });

      // 統計を計算
      const statistics = this.calculateStatistics();

      // 結果を構築
      const result: DeepResearchResult = {
        sessionId,
        topic: validatedQuery.topic,
        findings,
        reasoningChain,
        statistics,
        status: this.determineStatus(),
        processingTimeMs: Date.now() - startTime,
        metadata: {
          startedAt: this.state!.startedAt,
          completedAt: new Date().toISOString(),
          version: '2.2.0',
          config: this.config,
        },
      };

      // 最終チェックポイント
      try {
        const finalCheckpoint = await this.checkpointManager.save(this.getCheckpointData());
        result.checkpointId = finalCheckpoint.id;
      } catch (e) {
        this.logger.warn('Failed to save final checkpoint', { error: String(e) });
      }

      this.updatePhase('completed');
      this.emitEvent('completed', { statistics, findingsCount: findings.length });

      this.logger.info('Deep Research completed', {
        sessionId,
        findingsCount: findings.length,
        processingTimeMs: result.processingTimeMs,
      });

      return ok(result);
    } catch (error) {
      const e = error instanceof Error ? error : new Error(String(error));
      this.updatePhase('failed');
      this.checkpointManager.stopAutoSave();

      this.logger.error('Deep Research failed', { error: e.message });
      this.emitEvent('error', { error: e.message });

      return err({
        code: 'INITIALIZATION_ERROR',
        message: e.message,
        cause: e,
      });
    }
  }

  /**
   * 処理を中断
   */
  abort(): void {
    this.iterationController.abort();
    this.updatePhase('failed');
    this.emitEvent('aborted', {});
    this.logger.info('Research aborted');
  }

  /**
   * 処理を一時停止
   */
  pause(): void {
    this.iterationController.abort();
    this.updatePhase('paused');
    this.emitEvent('paused', {});
    this.logger.info('Research paused');
  }

  /**
   * 処理を再開
   */
  async resume(checkpointId: string): Promise<Result<void, DeepResearchError>> {
    const restored = await this.restoreFromCheckpoint(checkpointId);
    if (!restored) {
      return err({
        code: 'CHECKPOINT_ERROR',
        message: `Failed to resume from checkpoint: ${checkpointId}`,
      });
    }

    this.emitEvent('resumed', { checkpointId });
    return ok(undefined);
  }

  /**
   * オーケストレーターイベントリスナーを追加
   */
  addOrchestratorListener(listener: OrchestratorEventListener): void {
    this.orchestratorListeners.push(listener);
  }

  /**
   * オーケストレーターイベントリスナーを削除
   */
  removeOrchestratorListener(listener: OrchestratorEventListener): void {
    const index = this.orchestratorListeners.indexOf(listener);
    if (index !== -1) {
      this.orchestratorListeners.splice(index, 1);
    }
  }

  /**
   * 現在の状態を取得
   */
  getState(): DeepResearchState | null {
    return this.state ? { ...this.state } : null;
  }

  /**
   * キャッシュ統計を取得
   */
  getCacheStats() {
    return this.urlProcessor.getCacheStats();
  }

  // =====================================
  // Private Methods
  // =====================================

  /**
   * 状態を初期化
   */
  private initializeState(sessionId: string): void {
    this.state = {
      sessionId,
      phase: 'initializing',
      startedAt: new Date().toISOString(),
      currentIteration: 0,
      urls: new Map(),
      iterations: [],
      lastUpdatedAt: new Date().toISOString(),
      errorCount: 0,
      totalProcessingTime: 0,
    };

    this.processedHashes.clear();
    this.iterationController.reset();
  }

  /**
   * イベントフォワードの設定
   */
  private setupEventForwarding(): void {
    // URL Processorイベント
    this.urlProcessor.on('urlStart', (data) => {
      this.emitEvent('urlProcessing', data);
    });
    this.urlProcessor.on('urlComplete', (data) => {
      this.emitEvent('urlCompleted', data);
    });
    this.urlProcessor.on('urlFailed', (data) => {
      this.emitEvent('urlFailed', data);
    });
    this.urlProcessor.on('cacheHit', (data) => {
      this.emitEvent('cacheHit', data);
    });
    this.urlProcessor.on('retrying', (data) => {
      this.emitEvent('retrying', data);
    });
    this.urlProcessor.on('fallbackTriggered', (data) => {
      this.emitEvent('fallbackTriggered', data);
    });
  }

  /**
   * イベントを発行
   */
  private emitEvent(
    type: OrchestratorEvent['type'],
    data: Record<string, unknown>
  ): void {
    const event: OrchestratorEvent = {
      type,
      timestamp: new Date().toISOString(),
      sessionId: this.state?.sessionId ?? 'unknown',
      data,
    };

    for (const listener of this.orchestratorListeners) {
      try {
        listener(event);
      } catch (error) {
        this.logger.error('Event listener error', { type, error: String(error) });
      }
    }

    this.emit(type, event);
  }

  /**
   * フェーズを更新
   */
  private updatePhase(phase: ProcessingPhase): void {
    if (this.state) {
      this.state.phase = phase;
      this.state.lastUpdatedAt = new Date().toISOString();
      this.iterationController.setPhase(phase);
      this.emitEvent('phaseChanged', { phase });
    }
  }

  /**
   * 検索を実行してURL一覧を取得
   */
  private async executeSearch(
    query: DeepResearchQuery,
    _iteration: number
  ): Promise<string[]> {
    const wideQuery: WideResearchQuery = {
      topic: query.topic,
      depth: query.depth ?? 'medium',
      sources: query.sources,
      languages: query.languages,
      dateRange: query.dateRange,
      excludeKeywords: query.excludeKeywords,
      maxResultsPerSource: Math.ceil((query.maxUrls ?? 20) / 4),
    };

    const result = await this.wideResearchEngine.research(wideQuery);

    if (!isOk(result)) {
      this.logger.warn('Wide research failed', { error: result.error });
      return [];
    }

    // 既に処理済みのURLを除外
    const processedUrls = new Set(this.state?.urls.keys() ?? []);
    const newUrls = result.value.findings
      .map((f) => f.url)
      .filter((url): url is string => url !== undefined && !processedUrls.has(url))
      .slice(0, query.maxUrls ?? 20);

    this.logger.debug('Search completed', {
      totalFound: result.value.findings.length,
      newUrls: newUrls.length,
    });

    return newUrls;
  }

  /**
   * 新規コンテンツ数をカウント
   */
  private countNewContent(
    results: Array<{ url: string; content?: string; contentHash?: string }>
  ): number {
    let newCount = 0;

    for (const result of results) {
      if (!result.content) continue;

      const hash = this.versionControl.calculateHash(result.content);

      // 既に処理済みのハッシュかどうかをチェック
      const key = `${result.url}:${hash}`;
      if (!this.processedHashes.has(key)) {
        newCount++;
        this.processedHashes.add(key);
      }
    }

    return newCount;
  }

  /**
   * 発見事項を抽出
   */
  private extractFindings(
    results: Array<{ url: string; content?: string; usedFallback: boolean }>,
    iteration: number
  ): DeepResearchFinding[] {
    return results
      .filter((r) => r.content && r.content.length > 100)
      .map((r, index) => ({
        id: `finding-${iteration}-${index}`,
        title: this.extractTitle(r.content!),
        summary: this.extractSummary(r.content!),
        content: r.content,
        url: r.url,
        sourceType: 'web' as SourceType,
        relevanceScore: this.calculateRelevance(r.content!, this.currentQuery?.topic ?? ''),
        timestamp: new Date().toISOString(),
        keywords: this.extractKeywords(r.content!),
        entities: [],
      }));
  }

  /**
   * タイトルを抽出
   */
  private extractTitle(content: string): string {
    // 最初の行または最初の100文字
    const lines = content.split('\n');
    const firstLine = lines[0] ?? '';
    return firstLine.slice(0, 100);
  }

  /**
   * 要約を抽出
   */
  private extractSummary(content: string): string {
    // 最初の500文字
    return content.slice(0, 500);
  }

  /**
   * 関連度を計算
   */
  private calculateRelevance(content: string, topic: string): number {
    const topicWords = topic.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    const matches = topicWords.filter((w) => contentLower.includes(w)).length;
    return Math.min(1, matches / topicWords.length);
  }

  /**
   * キーワードを抽出
   */
  private extractKeywords(content: string): string[] {
    // 簡易キーワード抽出（単語頻度ベース）
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3);

    const freq = new Map<string, number>();
    for (const word of words) {
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * 統計を計算
   */
  private calculateStatistics(): DeepResearchStatistics {
    const urls = Array.from(this.state?.urls.values() ?? []);
    const cacheStats = this.urlProcessor.getCacheStats();

    return {
      totalUrls: urls.length,
      successfulUrls: urls.filter((u) => u.status === 'success').length,
      failedUrls: urls.filter((u) => u.status === 'failed').length,
      skippedUrls: urls.filter((u) => u.status === 'skipped').length,
      cacheHits: cacheStats.hitCount,
      fallbackUsed: urls.filter((u) => u.usedFallback).length,
      retryCount: urls.reduce((acc, u) => acc + Math.max(0, u.attempts - 1), 0),
      totalIterations: this.iterationController.getCurrentIteration(),
      averageNewInfoRate: this.iterationController.getAverageNewInfoRate(),
      processingTimeMs: this.iterationController.getTotalProcessingTime(),
    };
  }

  /**
   * ステータスを判定
   */
  private determineStatus(): DeepResearchResult['status'] {
    if (this.state?.phase === 'failed') return 'failed';
    
    const urls = Array.from(this.state?.urls.values() ?? []);
    const successRate = urls.length > 0
      ? urls.filter((u) => u.status === 'success').length / urls.length
      : 0;

    if (successRate >= 0.8) return 'completed';
    if (successRate >= 0.5) return 'partial';
    return 'failed';
  }

  /**
   * チェックポイントデータを取得
   */
  private getCheckpointData(): CheckpointData {
    const urlEntries = Array.from(this.state?.urls.entries() ?? []);
    const entries: ContentEntry[] = urlEntries
      .filter(([_, status]) => status.status === 'success')
      .map(([url, status]) => ({
        url,
        content: '',
        contentType: 'text/html',
        status: 'cached' as const,
        currentVersion: {
          versionId: status.contentHash ?? randomUUID(),
          hash: status.contentHash ?? '',
          fetchedAt: new Date().toISOString(),
          size: 0,
        },
        versions: [],
        lastAccessedAt: new Date().toISOString(),
        accessCount: 1,
      }));

    return {
      id: `checkpoint-${this.state?.sessionId ?? 'unknown'}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      version: '2.2.0',
      entries,
      processingState: {
        processedUrls: urlEntries.filter(([_, s]) => s.status === 'success').map(([u]) => u),
        pendingUrls: urlEntries.filter(([_, s]) => s.status === 'pending').map(([u]) => u),
        failedUrls: urlEntries.filter(([_, s]) => s.status === 'failed').map(([u]) => u),
        progress: this.state ? this.state.currentIteration / 5 : 0,
      },
      metadata: {
        query: this.currentQuery,
        iterationState: this.iterationController.getState(),
      },
    };
  }

  /**
   * チェックポイントから復元
   */
  private async restoreFromCheckpoint(checkpointId: string): Promise<boolean> {
    try {
      const data = await this.checkpointManager.load(checkpointId);

      // 状態を復元
      const urlMap = new Map<string, UrlStatus>();
      for (const url of data.processingState.processedUrls) {
        urlMap.set(url, { url, status: 'success', attempts: 1 });
      }
      for (const url of data.processingState.pendingUrls) {
        urlMap.set(url, { url, status: 'pending', attempts: 0 });
      }
      for (const url of data.processingState.failedUrls) {
        urlMap.set(url, { url, status: 'failed', attempts: 3 });
      }

      this.state = {
        sessionId: checkpointId,
        phase: 'paused',
        startedAt: data.createdAt,
        currentIteration: 0,
        urls: urlMap,
        iterations: [],
        lastUpdatedAt: new Date().toISOString(),
        errorCount: 0,
        totalProcessingTime: 0,
      };

      if (data.metadata?.iterationState) {
        this.iterationController.restore(data.metadata.iterationState as Parameters<IterationController['restore']>[0]);
      }

      this.logger.info('Restored from checkpoint', { checkpointId });
      return true;
    } catch (error) {
      this.logger.error('Failed to restore from checkpoint', { checkpointId, error: String(error) });
      return false;
    }
  }
}
