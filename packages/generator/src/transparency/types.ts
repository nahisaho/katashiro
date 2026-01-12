/**
 * Transparency Types
 * AI使用透明性機能の型定義
 *
 * @module transparency/types
 */

/** 貢献者の種別 */
export type ContributorType = 'human' | 'ai' | 'mixed';

/** AI貢献の種類 */
export type AIContributionType =
  | 'generation' // 新規生成
  | 'completion' // 補完
  | 'suggestion' // 提案
  | 'editing' // 編集・修正
  | 'translation' // 翻訳
  | 'summarization' // 要約
  | 'research' // 調査・収集
  | 'formatting'; // フォーマット

/** 人間貢献の種類 */
export type HumanContributionType =
  | 'original' // オリジナル作成
  | 'review' // レビュー
  | 'approval' // 承認
  | 'editing' // 編集
  | 'direction' // 指示・方向性
  | 'verification'; // 検証

/** セクション単位の貢献情報 */
export interface SectionContribution {
  /** セクションID */
  sectionId: string;
  /** セクション名 */
  sectionName: string;
  /** セクションの内容 */
  content: string;
  /** 文字数 */
  charCount: number;
  /** 貢献者タイプ */
  contributorType: ContributorType;
  /** AI貢献率 (0-100) */
  aiContributionRatio: number;
  /** AI貢献の種類 */
  aiContributions: AIContributionType[];
  /** 人間貢献の種類 */
  humanContributions: HumanContributionType[];
  /** AIモデル名（AI貢献がある場合） */
  aiModel?: string;
  /** 人間の貢献者名（人間貢献がある場合） */
  humanContributor?: string;
  /** 作成日時 */
  createdAt: Date;
  /** 最終更新日時 */
  updatedAt: Date;
}

/** ドキュメント全体の貢献分析結果 */
export interface ContributionAnalysis {
  /** ドキュメントID */
  documentId: string;
  /** ドキュメントタイトル */
  title: string;
  /** 全体のAI貢献率 (0-100) */
  overallAIRatio: number;
  /** 全体の人間貢献率 (0-100) */
  overallHumanRatio: number;
  /** セクション別の貢献情報 */
  sections: SectionContribution[];
  /** 使用されたAIモデル一覧 */
  aiModelsUsed: string[];
  /** 人間の貢献者一覧 */
  humanContributors: string[];
  /** 全体の貢献サマリ */
  summary: ContributionSummary;
  /** 分析日時 */
  analyzedAt: Date;
}

/** 貢献サマリ */
export interface ContributionSummary {
  /** AI生成文字数 */
  aiGeneratedChars: number;
  /** 人間作成文字数 */
  humanCreatedChars: number;
  /** 混合文字数（AI+人間の編集） */
  mixedChars: number;
  /** 全体文字数 */
  totalChars: number;
  /** セクション数 */
  totalSections: number;
  /** AI主導セクション数 */
  aiDominantSections: number;
  /** 人間主導セクション数 */
  humanDominantSections: number;
  /** 均等貢献セクション数 */
  equalContributionSections: number;
}

/** バージョン情報 */
export interface Version {
  /** バージョンID */
  id: string;
  /** バージョン番号 */
  version: string;
  /** 親バージョンID */
  parentId?: string;
  /** コンテンツのスナップショット */
  content: string;
  /** 変更サマリ */
  changeSummary: string;
  /** 変更者 */
  author: {
    type: ContributorType;
    name: string;
    aiModel?: string;
  };
  /** 変更の種類 */
  changeType: 'create' | 'update' | 'delete' | 'merge';
  /** 差分情報 */
  diff?: VersionDiff;
  /** 作成日時 */
  createdAt: Date;
  /** タグ（オプション） */
  tags?: string[];
}

/** バージョン差分 */
export interface VersionDiff {
  /** 追加行数 */
  additions: number;
  /** 削除行数 */
  deletions: number;
  /** 変更行数 */
  modifications: number;
  /** 詳細な変更箇所 */
  changes: Array<{
    type: 'add' | 'delete' | 'modify';
    line: number;
    oldContent?: string;
    newContent?: string;
  }>;
}

/** 変更履歴 */
export interface VersionHistory {
  /** ドキュメントID */
  documentId: string;
  /** 現在のバージョン */
  currentVersion: string;
  /** 全バージョンリスト */
  versions: Version[];
  /** バージョン数 */
  totalVersions: number;
  /** 最初のバージョン日時 */
  firstVersionAt: Date;
  /** 最新バージョン日時 */
  lastVersionAt: Date;
}

/** コラボレーションセッション */
export interface CollaborationSession {
  /** セッションID */
  id: string;
  /** ドキュメントID */
  documentId: string;
  /** セッション名 */
  name: string;
  /** 参加者 */
  participants: SessionParticipant[];
  /** セッション状態 */
  status: 'active' | 'paused' | 'completed';
  /** 開始日時 */
  startedAt: Date;
  /** 終了日時 */
  endedAt?: Date;
  /** セッション中の操作 */
  operations: SessionOperation[];
  /** セッション統計 */
  stats: SessionStats;
}

/** セッション参加者 */
export interface SessionParticipant {
  /** 参加者ID */
  id: string;
  /** 名前 */
  name: string;
  /** タイプ */
  type: ContributorType;
  /** AIモデル名（AIの場合） */
  aiModel?: string;
  /** 参加日時 */
  joinedAt: Date;
  /** 退出日時 */
  leftAt?: Date;
  /** ロール */
  role: 'owner' | 'editor' | 'reviewer' | 'ai-assistant';
}

/** セッション操作 */
export interface SessionOperation {
  /** 操作ID */
  id: string;
  /** 操作タイプ */
  type: 'edit' | 'comment' | 'suggest' | 'approve' | 'reject';
  /** 操作者ID */
  participantId: string;
  /** 対象セクション */
  targetSection?: string;
  /** 操作内容 */
  content: string;
  /** 操作日時 */
  timestamp: Date;
}

/** セッション統計 */
export interface SessionStats {
  /** 総操作数 */
  totalOperations: number;
  /** 人間による操作数 */
  humanOperations: number;
  /** AIによる操作数 */
  aiOperations: number;
  /** 編集数 */
  edits: number;
  /** コメント数 */
  comments: number;
  /** 承認数 */
  approvals: number;
  /** セッション時間（ミリ秒） */
  durationMs: number;
}

/** 透明性レポート */
export interface TransparencyReport {
  /** レポートID */
  id: string;
  /** ドキュメントID */
  documentId: string;
  /** ドキュメントタイトル */
  documentTitle: string;
  /** 生成日時 */
  generatedAt: Date;
  /** 貢献分析 */
  contribution: ContributionAnalysis;
  /** バージョン履歴サマリ */
  versionSummary: {
    totalVersions: number;
    majorChanges: number;
    lastUpdated: Date;
  };
  /** コラボレーション情報 */
  collaboration?: {
    totalSessions: number;
    participants: string[];
    totalDurationMs: number;
  };
  /** AI使用ステートメント */
  aiDisclosure: AIDisclosure;
  /** レポート形式 */
  format: 'markdown' | 'json' | 'html';
  /** レポート本文 */
  content: string;
}

/** AI使用開示情報 */
export interface AIDisclosure {
  /** AI使用有無 */
  aiUsed: boolean;
  /** 使用目的 */
  purposes: AIContributionType[];
  /** 使用AIモデル */
  models: string[];
  /** AI貢献率 */
  contributionRatio: number;
  /** 人間による検証有無 */
  humanVerified: boolean;
  /** 検証者 */
  verifiedBy?: string[];
  /** 開示テキスト */
  disclosureStatement: string;
}

/** 透明性レポート生成オプション */
export interface TransparencyReportOptions {
  /** ドキュメントID */
  documentId: string;
  /** ドキュメントタイトル */
  title: string;
  /** コンテンツ */
  content: string;
  /** セクション情報 */
  sections?: SectionContribution[];
  /** バージョン履歴 */
  versionHistory?: VersionHistory;
  /** コラボレーション情報 */
  collaborationSessions?: CollaborationSession[];
  /** 出力形式 */
  format?: 'markdown' | 'json' | 'html';
  /** 詳細レベル */
  detailLevel?: 'summary' | 'standard' | 'detailed';
  /** 言語 */
  language?: 'ja' | 'en';
}
