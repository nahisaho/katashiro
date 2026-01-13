/**
 * Chart Module
 * 図表生成モジュールのエントリーポイント
 * REQ-MEDIA-002: 図表生成
 */

// Types
export type {
  ChartType,
  DiagramType,
  OutputFormat,
  ChartTheme,
  DataPoint,
  DataSeries,
  ChartData,
  AxisConfig,
  LegendConfig,
  ChartOptions,
  DiagramOptions,
  ChartOutput,
  DiagramOutput,
  ChartGeneratorConfig,
  // REQ-EXT-VIS-001: Base64/Markdown出力
  Base64ChartOutput,
  MarkdownChartOutput,
} from './types.js';

export {
  DEFAULT_CHART_CONFIG,
  ChartGeneratorError,
  CHART_ERROR_CODES,
  THEME_PALETTES,
} from './types.js';

// Builders
export { SvgBuilder } from './SvgBuilder.js';
export {
  MermaidBuilder,
  type FlowchartNode,
  type FlowchartEdge,
  type FlowchartData,
  type SequenceParticipant,
  type SequenceMessage,
  type SequenceData,
  type ClassDefinition,
  type ClassRelation,
  type ClassDiagramData,
  type GanttTask,
  type GanttData,
} from './MermaidBuilder.js';

// Generators
export { ChartGenerator } from './ChartGenerator.js';
export { DiagramGenerator } from './DiagramGenerator.js';
