/**
 * CollaborationTracker
 * 共同執筆セッションの管理
 *
 * @module transparency/collaboration-tracker
 * @requirement Phase 2 - 透明性機能
 */

import type {
  CollaborationSession,
  SessionParticipant,
  SessionOperation,
  SessionStats,
  ContributorType,
} from './types.js';

/** 参加者追加オプション */
export interface AddParticipantOptions {
  /** 参加者名 */
  name: string;
  /** 参加者タイプ */
  type: ContributorType;
  /** AIモデル（AIの場合） */
  aiModel?: string;
  /** ロール */
  role: SessionParticipant['role'];
}

/** 操作記録オプション */
export interface RecordOperationOptions {
  /** 操作タイプ */
  type: SessionOperation['type'];
  /** 操作者ID */
  participantId: string;
  /** 対象セクション */
  targetSection?: string;
  /** 操作内容 */
  content: string;
}

/**
 * CollaborationTracker
 * 共同執筆セッションを追跡・管理
 */
export class CollaborationTracker {
  private sessions: Map<string, CollaborationSession> = new Map();
  private sessionCounter: number = 0;
  private operationCounter: number = 0;
  private participantCounter: number = 0;

  /**
   * 新しいセッションを開始
   */
  startSession(documentId: string, name: string, owner: AddParticipantOptions): CollaborationSession {
    const sessionId = this.generateSessionId();
    const now = new Date();

    const ownerParticipant: SessionParticipant = {
      id: this.generateParticipantId(),
      name: owner.name,
      type: owner.type,
      aiModel: owner.aiModel,
      joinedAt: now,
      role: 'owner',
    };

    const session: CollaborationSession = {
      id: sessionId,
      documentId,
      name,
      participants: [ownerParticipant],
      status: 'active',
      startedAt: now,
      operations: [],
      stats: {
        totalOperations: 0,
        humanOperations: 0,
        aiOperations: 0,
        edits: 0,
        comments: 0,
        approvals: 0,
        durationMs: 0,
      },
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * 参加者を追加
   */
  addParticipant(sessionId: string, options: AddParticipantOptions): SessionParticipant {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status !== 'active') {
      throw new Error(`Cannot add participant to ${session.status} session`);
    }

    const participant: SessionParticipant = {
      id: this.generateParticipantId(),
      name: options.name,
      type: options.type,
      aiModel: options.aiModel,
      joinedAt: new Date(),
      role: options.role,
    };

    session.participants.push(participant);
    return participant;
  }

  /**
   * 参加者を削除（退出）
   */
  removeParticipant(sessionId: string, participantId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const participant = session.participants.find(p => p.id === participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    participant.leftAt = new Date();
  }

  /**
   * 操作を記録
   */
  recordOperation(sessionId: string, options: RecordOperationOptions): SessionOperation {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status !== 'active') {
      throw new Error(`Cannot record operation in ${session.status} session`);
    }

    const participant = session.participants.find(p => p.id === options.participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${options.participantId}`);
    }

    const operation: SessionOperation = {
      id: this.generateOperationId(),
      type: options.type,
      participantId: options.participantId,
      targetSection: options.targetSection,
      content: options.content,
      timestamp: new Date(),
    };

    session.operations.push(operation);

    // 統計を更新
    this.updateStats(session, participant, options.type);

    return operation;
  }

  /**
   * セッションを一時停止
   */
  pauseSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status !== 'active') {
      throw new Error(`Cannot pause ${session.status} session`);
    }

    session.status = 'paused';
    this.updateDuration(session);
  }

  /**
   * セッションを再開
   */
  resumeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status !== 'paused') {
      throw new Error(`Cannot resume ${session.status} session`);
    }

    session.status = 'active';
  }

  /**
   * セッションを完了
   */
  completeSession(sessionId: string): CollaborationSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.status = 'completed';
    session.endedAt = new Date();
    this.updateDuration(session);

    // 全参加者を退出処理
    for (const participant of session.participants) {
      if (!participant.leftAt) {
        participant.leftAt = session.endedAt;
      }
    }

    return session;
  }

  /**
   * セッションを取得
   */
  getSession(sessionId: string): CollaborationSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * ドキュメントIDでセッションを検索
   */
  getSessionsByDocument(documentId: string): CollaborationSession[] {
    return Array.from(this.sessions.values()).filter(s => s.documentId === documentId);
  }

  /**
   * アクティブなセッションを取得
   */
  getActiveSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  /**
   * 参加者の操作履歴を取得
   */
  getParticipantOperations(sessionId: string, participantId: string): SessionOperation[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }

    return session.operations.filter(op => op.participantId === participantId);
  }

  /**
   * セクションの操作履歴を取得
   */
  getSectionOperations(sessionId: string, sectionId: string): SessionOperation[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }

    return session.operations.filter(op => op.targetSection === sectionId);
  }

  /**
   * セッション統計を取得
   */
  getStats(sessionId: string): SessionStats | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // 現在のセッションの継続時間を更新
    if (session.status === 'active') {
      this.updateDuration(session);
    }

    return { ...session.stats };
  }

  /**
   * 詳細な参加者統計を取得
   */
  getParticipantStats(sessionId: string, participantId: string): {
    operationCount: number;
    editCount: number;
    commentCount: number;
    approvalCount: number;
    activeDurationMs: number;
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const participant = session.participants.find(p => p.id === participantId);
    if (!participant) {
      return null;
    }

    const operations = session.operations.filter(op => op.participantId === participantId);

    const endTime = participant.leftAt || new Date();
    const activeDurationMs = endTime.getTime() - new Date(participant.joinedAt).getTime();

    return {
      operationCount: operations.length,
      editCount: operations.filter(op => op.type === 'edit').length,
      commentCount: operations.filter(op => op.type === 'comment').length,
      approvalCount: operations.filter(op => op.type === 'approve').length,
      activeDurationMs,
    };
  }

  /**
   * 統計を更新
   */
  private updateStats(
    session: CollaborationSession,
    participant: SessionParticipant,
    operationType: SessionOperation['type']
  ): void {
    session.stats.totalOperations++;

    if (participant.type === 'ai') {
      session.stats.aiOperations++;
    } else if (participant.type === 'human') {
      session.stats.humanOperations++;
    } else {
      // mixed の場合は両方にカウント
      session.stats.aiOperations += 0.5;
      session.stats.humanOperations += 0.5;
    }

    switch (operationType) {
      case 'edit':
        session.stats.edits++;
        break;
      case 'comment':
        session.stats.comments++;
        break;
      case 'approve':
        session.stats.approvals++;
        break;
    }
  }

  /**
   * セッション継続時間を更新
   */
  private updateDuration(session: CollaborationSession): void {
    const endTime = session.endedAt || new Date();
    session.stats.durationMs = endTime.getTime() - new Date(session.startedAt).getTime();
  }

  /**
   * セッションIDを生成
   */
  private generateSessionId(): string {
    this.sessionCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.sessionCounter.toString(36).padStart(4, '0');
    return `session-${timestamp}-${counter}`;
  }

  /**
   * 参加者IDを生成
   */
  private generateParticipantId(): string {
    this.participantCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.participantCounter.toString(36).padStart(4, '0');
    return `participant-${timestamp}-${counter}`;
  }

  /**
   * 操作IDを生成
   */
  private generateOperationId(): string {
    this.operationCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.operationCounter.toString(36).padStart(6, '0');
    return `op-${timestamp}-${counter}`;
  }

  /**
   * セッションをエクスポート
   */
  exportSession(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return JSON.stringify(session, null, 2);
  }

  /**
   * セッションをインポート
   */
  importSession(json: string): CollaborationSession {
    const session = JSON.parse(json) as CollaborationSession;

    // 日付を復元
    session.startedAt = new Date(session.startedAt);
    if (session.endedAt) {
      session.endedAt = new Date(session.endedAt);
    }
    session.participants.forEach(p => {
      p.joinedAt = new Date(p.joinedAt);
      if (p.leftAt) {
        p.leftAt = new Date(p.leftAt);
      }
    });
    session.operations.forEach(op => {
      op.timestamp = new Date(op.timestamp);
    });

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * セッションを削除
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * 全セッションをクリア
   */
  clearAll(): void {
    this.sessions.clear();
    this.sessionCounter = 0;
    this.operationCounter = 0;
    this.participantCounter = 0;
  }

  /**
   * セッションリストを取得
   */
  listSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * ドキュメントのコラボレーションサマリを取得
   */
  getDocumentCollaborationSummary(documentId: string): {
    totalSessions: number;
    completedSessions: number;
    totalParticipants: string[];
    totalOperations: number;
    totalDurationMs: number;
  } {
    const sessions = this.getSessionsByDocument(documentId);
    
    const allParticipants = new Set<string>();
    let totalOperations = 0;
    let totalDurationMs = 0;
    let completedSessions = 0;

    for (const session of sessions) {
      if (session.status === 'completed') {
        completedSessions++;
      }

      for (const participant of session.participants) {
        allParticipants.add(participant.name);
      }

      totalOperations += session.stats.totalOperations;
      totalDurationMs += session.stats.durationMs;
    }

    return {
      totalSessions: sessions.length,
      completedSessions,
      totalParticipants: Array.from(allParticipants),
      totalOperations,
      totalDurationMs,
    };
  }
}
