/**
 * Chart Generator Types
 * 図表生成の型定義
 * REQ-MEDIA-002: 図表生成
 */

/**
 * チャートタイプ
 */
export type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'doughnut'
  | 'scatter'
  | 'area'
  | 'radar'
  | 'bubble';

/**
 * ダイアグラムタイプ
 */
export type DiagramType =
  | 'flowchart'
  | 'sequence'
  | 'class'
  | 'state'
  | 'er'
  | 'gantt'
  | 'pie'
  | 'mindmap'
  | 'timeline'
  | 'gitgraph'
  | 'custom';

/**
 * 出力フォーマット
 */
export type OutputFormat = 'svg' | 'png' | 'pdf';

/**
 * チャートテーマ
 */
export type ChartTheme =
  | 'default'
  | 'dark'
  | 'pastel'
  | 'vibrant'
  | 'monochrome'
  | 'custom';

/**
 * データポイント
 */
export interface DataPoint {
  /** ラベル */
  label: string;
  /** 値 */
  value: number;
  /** 追加値（バブルチャート等） */
  value2?: number;
  /** カテゴリ */
  category?: string;
  /** 色（オプション） */
  color?: string;
}

/**
 * データシリーズ
 */
export interface DataSeries {
  /** シリーズ名 */
  name: string;
  /** データポイント */
  data: DataPoint[] | number[];
  /** シリーズ色 */
  color?: string;
  /** スタイル（line用） */
  style?: 'solid' | 'dashed' | 'dotted';
  /** マーカースタイル */
  marker?: 'circle' | 'square' | 'triangle' | 'none';
}

/**
 * チャートデータ
 */
export interface ChartData {
  /** ラベル（X軸用） */
  labels?: string[];
  /** データシリーズ */
  series: DataSeries[];
}

/**
 * 軸設定
 */
export interface AxisConfig {
  /** タイトル */
  title?: string;
  /** 最小値 */
  min?: number;
  /** 最大値 */
  max?: number;
  /** グリッド表示 */
  showGrid?: boolean;
  /** ラベル回転角度 */
  labelRotation?: number;
  /** 単位 */
  unit?: string;
  /** ログスケール */
  logarithmic?: boolean;
}

/**
 * 凡例設定
 */
export interface LegendConfig {
  /** 表示 */
  show: boolean;
  /** 位置 */
  position: 'top' | 'bottom' | 'left' | 'right';
  /** 方向 */
  orientation: 'horizontal' | 'vertical';
}

/**
 * チャートオプション
 */
export interface ChartOptions {
  /** チャートタイプ */
  type: ChartType;
  /** タイトル */
  title?: string;
  /** サブタイトル */
  subtitle?: string;
  /** 幅 */
  width?: number;
  /** 高さ */
  height?: number;
  /** テーマ */
  theme?: ChartTheme;
  /** 背景色 */
  backgroundColor?: string;
  /** X軸設定 */
  xAxis?: AxisConfig;
  /** Y軸設定 */
  yAxis?: AxisConfig;
  /** 凡例設定 */
  legend?: LegendConfig;
  /** カスタム色パレット */
  colors?: string[];
  /** アニメーション（SVG用） */
  animation?: boolean;
  /** ツールチップ表示 */
  tooltip?: boolean;
  /** 値ラベル表示 */
  showValues?: boolean;
  /** レスポンシブ */
  responsive?: boolean;
  /** フォント */
  fontFamily?: string;
  /** フォントサイズ */
  fontSize?: number;
}

/**
 * ダイアグラムオプション
 */
export interface DiagramOptions {
  /** ダイアグラムタイプ */
  type: DiagramType;
  /** Mermaid定義文字列 */
  definition?: string;
  /** タイトル */
  title?: string;
  /** 幅 */
  width?: number;
  /** 高さ */
  height?: number;
  /** テーマ */
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
  /** 方向（フローチャート用） */
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  /** 背景色 */
  backgroundColor?: string;
}

/**
 * チャート出力
 */
export interface ChartOutput {
  /** 出力フォーマット */
  format: OutputFormat;
  /** コンテンツ（SVG文字列またはBuffer） */
  content: string | Buffer;
  /** 幅 */
  width: number;
  /** 高さ */
  height: number;
  /** メタデータ */
  metadata: {
    /** チャートタイプ */
    type: ChartType;
    /** 生成日時 */
    generatedAt: Date;
    /** ライブラリ */
    library: string;
    /** タイトル */
    title?: string;
  };
}

/**
 * ダイアグラム出力
 */
export interface DiagramOutput {
  /** 出力フォーマット */
  format: OutputFormat;
  /** コンテンツ（SVG文字列またはBuffer） */
  content: string | Buffer;
  /** 幅 */
  width: number;
  /** 高さ */
  height: number;
  /** メタデータ */
  metadata: {
    /** ダイアグラムタイプ */
    type: DiagramType;
    /** 生成日時 */
    generatedAt: Date;
    /** ライブラリ */
    library: string;
    /** タイトル */
    title?: string;
  };
}

/**
 * チャートジェネレーター設定
 */
export interface ChartGeneratorConfig {
  /** デフォルト幅 */
  defaultWidth: number;
  /** デフォルト高さ */
  defaultHeight: number;
  /** デフォルトテーマ */
  defaultTheme: ChartTheme;
  /** デフォルト出力フォーマット */
  defaultFormat: OutputFormat;
  /** デフォルト色パレット */
  defaultColors: string[];
  /** フォント */
  fontFamily: string;
  /** フォントサイズ */
  fontSize: number;
}

/**
 * デフォルト設定
 */
export const DEFAULT_CHART_CONFIG: ChartGeneratorConfig = {
  defaultWidth: 800,
  defaultHeight: 600,
  defaultTheme: 'default',
  defaultFormat: 'svg',
  defaultColors: [
    '#2563eb', // blue
    '#16a34a', // green
    '#dc2626', // red
    '#9333ea', // purple
    '#ea580c', // orange
    '#0891b2', // cyan
    '#ca8a04', // yellow
    '#db2777', // pink
    '#4f46e5', // indigo
    '#059669', // emerald
  ],
  fontFamily: 'sans-serif',
  fontSize: 12,
};

/**
 * チャートジェネレーターエラー
 */
export class ChartGeneratorError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ChartGeneratorError';
    Object.setPrototypeOf(this, ChartGeneratorError.prototype);
  }
}

/**
 * エラーコード
 */
export const CHART_ERROR_CODES = {
  INVALID_DATA: 'CHART_INVALID_DATA',
  INVALID_TYPE: 'CHART_INVALID_TYPE',
  RENDER_FAILED: 'CHART_RENDER_FAILED',
  INVALID_DIAGRAM: 'CHART_INVALID_DIAGRAM',
  EXPORT_FAILED: 'CHART_EXPORT_FAILED',
  UNSUPPORTED_FORMAT: 'CHART_UNSUPPORTED_FORMAT',
} as const;

/**
 * テーマ別色パレット
 */
export const THEME_PALETTES: Record<ChartTheme, string[]> = {
  default: DEFAULT_CHART_CONFIG.defaultColors,
  dark: [
    '#60a5fa', // blue-400
    '#4ade80', // green-400
    '#f87171', // red-400
    '#c084fc', // purple-400
    '#fb923c', // orange-400
    '#22d3ee', // cyan-400
    '#facc15', // yellow-400
    '#f472b6', // pink-400
    '#818cf8', // indigo-400
    '#34d399', // emerald-400
  ],
  pastel: [
    '#93c5fd', // blue-300
    '#86efac', // green-300
    '#fca5a5', // red-300
    '#d8b4fe', // purple-300
    '#fdba74', // orange-300
    '#67e8f9', // cyan-300
    '#fde047', // yellow-300
    '#f9a8d4', // pink-300
    '#a5b4fc', // indigo-300
    '#6ee7b7', // emerald-300
  ],
  vibrant: [
    '#3b82f6', // blue-500
    '#22c55e', // green-500
    '#ef4444', // red-500
    '#a855f7', // purple-500
    '#f97316', // orange-500
    '#06b6d4', // cyan-500
    '#eab308', // yellow-500
    '#ec4899', // pink-500
    '#6366f1', // indigo-500
    '#10b981', // emerald-500
  ],
  monochrome: [
    '#1f2937', // gray-800
    '#374151', // gray-700
    '#4b5563', // gray-600
    '#6b7280', // gray-500
    '#9ca3af', // gray-400
    '#d1d5db', // gray-300
    '#e5e7eb', // gray-200
    '#f3f4f6', // gray-100
    '#111827', // gray-900
    '#f9fafb', // gray-50
  ],
  custom: DEFAULT_CHART_CONFIG.defaultColors,
};

/**
 * Base64チャート出力
 * @since 0.6.0
 * @requirement REQ-EXT-VIS-001
 */
export interface Base64ChartOutput extends ChartOutput {
  /** Base64エンコードされた内容 */
  base64: string;
  /** Data URI形式 */
  dataUri: string;
  /** MIMEタイプ */
  mimeType: string;
}

/**
 * Markdown埋め込みチャート出力
 * @since 0.6.0
 * @requirement REQ-EXT-VIS-001
 */
export interface MarkdownChartOutput extends Base64ChartOutput {
  /** Markdown形式（![alt](dataUri)） */
  markdown: string;
  /** HTML形式（<img src="dataUri" />） */
  html: string;
  /** 代替テキスト */
  altText: string;
}

// ======================
// v1.1.0 新規型定義
// ======================

/**
 * タイムラインイベント
 * @since 1.1.0
 * @requirement REQ-1.1.0-VIS-001
 */
export interface TimelineEvent {
  /** 期間（"2026年1月" or "2026-01-06"） */
  period: string;
  /** イベントタイトル */
  title: string;
  /** 詳細説明（オプション） */
  description?: string;
}

/**
 * タイムラインデータ
 * @since 1.1.0
 * @requirement REQ-1.1.0-VIS-001
 */
export interface TimelineData {
  /** タイムライン全体のタイトル */
  title?: string;
  /** イベント一覧 */
  events: TimelineEvent[];
}

/**
 * ガントタスク（拡張版）
 * @since 1.1.0
 * @requirement REQ-1.1.0-VIS-002
 */
export interface ExtendedGanttTask {
  /** タスクID */
  id: string;
  /** タスク名 */
  name: string;
  /** 開始日（"2026-01-15" or "after task1"） */
  start: string;
  /** 期間（"7d", "2w" など） */
  duration?: string;
  /** 終了日（durationの代替） */
  end?: string;
  /** ステータス */
  status?: 'done' | 'active' | 'crit' | 'milestone';
  /** セクション */
  section?: string;
}

/**
 * ガントデータ（拡張版）
 * @since 1.1.0
 * @requirement REQ-1.1.0-VIS-002
 */
export interface ExtendedGanttData {
  /** タイトル */
  title?: string;
  /** 日付フォーマット（デフォルト: YYYY-MM-DD） */
  dateFormat?: string;
  /** タスク一覧 */
  tasks: ExtendedGanttTask[];
}

/**
 * 四象限アイテム
 * @since 1.1.0
 * @requirement REQ-1.1.0-VIS-003
 */
export interface QuadrantItem {
  /** ラベル */
  label: string;
  /** X座標（0-1、左から右） */
  x: number;
  /** Y座標（0-1、下から上） */
  y: number;
}

/**
 * 四象限データ
 * @since 1.1.0
 * @requirement REQ-1.1.0-VIS-003
 */
export interface QuadrantData {
  /** タイトル */
  title?: string;
  /** X軸ラベル */
  xAxisLabel?: { left: string; right: string };
  /** Y軸ラベル */
  yAxisLabel?: { bottom: string; top: string };
  /** 象限ラベル */
  quadrantLabels?: {
    q1?: string;  // 右上
    q2?: string;  // 左上
    q3?: string;  // 左下
    q4?: string;  // 右下
  };
  /** アイテム一覧 */
  items: QuadrantItem[];
}

/**
 * マインドマップノード
 * @since 1.1.0
 * @requirement REQ-1.1.0-VIS-004
 */
export interface MindmapNode {
  /** ノードラベル */
  label: string;
  /** 子ノード */
  children?: MindmapNode[];
  /** ノード形状 */
  shape?: 'default' | 'square' | 'rounded' | 'circle' | 'bang' | 'cloud' | 'hexagon';
}

/**
 * マインドマップデータ
 * @since 1.1.0
 * @requirement REQ-1.1.0-VIS-004
 */
export interface MindmapData {
  /** ルートノード */
  root: MindmapNode;
}
