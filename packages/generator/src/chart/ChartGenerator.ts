/**
 * ChartGenerator
 * SVGチャートの生成
 * REQ-MEDIA-002-001: チャート生成
 */

import { ok, err, type Result } from '@nahisaho/katashiro-core';
import type { IChartGenerator } from '../interfaces.js';
import type { ChartConfig } from '../types.js';
import type {
  ChartData,
  ChartOptions,
  ChartOutput,
  ChartGeneratorConfig,
  OutputFormat,
  Base64ChartOutput,
  MarkdownChartOutput,
} from './types.js';
import {
  DEFAULT_CHART_CONFIG,
  ChartGeneratorError,
  CHART_ERROR_CODES,
} from './types.js';
import { SvgBuilder } from './SvgBuilder.js';

/**
 * チャートジェネレータークラス
 * 各種チャートをSVG形式で生成
 */
export class ChartGenerator implements IChartGenerator {
  private readonly config: ChartGeneratorConfig;

  constructor(config?: Partial<ChartGeneratorConfig>) {
    this.config = { ...DEFAULT_CHART_CONFIG, ...config };
  }

  /**
   * チャートを生成（IChartGenerator実装）
   * @param data チャートデータ
   * @param config チャート設定
   * @returns 生成結果
   */
  async generate(
    data: unknown,
    config: ChartConfig
  ): Promise<Result<string, Error>> {
    try {
      const chartData = this.validateData(data);
      const options: ChartOptions = {
        type: this.mapChartType(config.type),
        title: config.title,
        xAxis: config.xLabel ? { title: config.xLabel } : undefined,
        yAxis: config.yLabel ? { title: config.yLabel } : undefined,
        colors: config.colors,
        width: config.width,
        height: config.height,
      };

      const output = await this.generateChart(chartData, options);
      return ok(output.content as string);
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new ChartGeneratorError(
              CHART_ERROR_CODES.RENDER_FAILED,
              String(error)
            )
      );
    }
  }

  /**
   * チャートを生成（拡張版）
   * @param data チャートデータ
   * @param options チャートオプション
   * @param format 出力フォーマット
   * @returns チャート出力
   */
  async generateChart(
    data: ChartData,
    options: ChartOptions,
    format: OutputFormat = 'svg'
  ): Promise<ChartOutput> {
    this.validateChartData(data);
    this.validateOptions(options);

    const builder = new SvgBuilder(options, this.config);
    builder.addHeader();
    builder.addTitle();

    switch (options.type) {
      case 'bar':
        builder.drawBarChart(data);
        break;
      case 'line':
        builder.drawLineChart(data);
        break;
      case 'pie':
        builder.drawPieChart(data, false);
        break;
      case 'doughnut':
        builder.drawPieChart(data, true);
        break;
      case 'scatter':
        builder.drawScatterChart(data);
        break;
      case 'area':
        builder.drawAreaChart(data);
        break;
      case 'radar':
        builder.drawRadarChart(data);
        break;
      case 'bubble':
        builder.drawScatterChart(data);
        break;
      default:
        throw new ChartGeneratorError(
          CHART_ERROR_CODES.INVALID_TYPE,
          `Unsupported chart type: ${options.type}`
        );
    }

    builder.addLegend(data);
    const svg = builder.build();

    // PNG変換が必要な場合
    if (format === 'png') {
      const pngBuffer = await this.convertToPng(svg, options);
      return {
        format: 'png',
        content: pngBuffer,
        width: options.width ?? this.config.defaultWidth,
        height: options.height ?? this.config.defaultHeight,
        metadata: {
          type: options.type,
          generatedAt: new Date(),
          library: 'katashiro-chart',
          title: options.title,
        },
      };
    }

    return {
      format: 'svg',
      content: svg,
      width: options.width ?? this.config.defaultWidth,
      height: options.height ?? this.config.defaultHeight,
      metadata: {
        type: options.type,
        generatedAt: new Date(),
        library: 'katashiro-chart',
        title: options.title,
      },
    };
  }

  /**
   * 棒グラフを生成
   */
  async generateBarChart(
    labels: string[],
    series: Array<{ name: string; data: number[]; color?: string }>,
    options?: Partial<ChartOptions>
  ): Promise<ChartOutput> {
    const chartData: ChartData = {
      labels,
      series: series.map(s => ({
        name: s.name,
        data: s.data,
        color: s.color,
      })),
    };

    return this.generateChart(chartData, {
      type: 'bar',
      ...options,
    });
  }

  /**
   * 折れ線グラフを生成
   */
  async generateLineChart(
    labels: string[],
    series: Array<{
      name: string;
      data: number[];
      color?: string;
      style?: 'solid' | 'dashed' | 'dotted';
    }>,
    options?: Partial<ChartOptions>
  ): Promise<ChartOutput> {
    const chartData: ChartData = {
      labels,
      series: series.map(s => ({
        name: s.name,
        data: s.data,
        color: s.color,
        style: s.style,
        marker: 'circle',
      })),
    };

    return this.generateChart(chartData, {
      type: 'line',
      ...options,
    });
  }

  /**
   * 円グラフを生成
   */
  async generatePieChart(
    data: Array<{ label: string; value: number; color?: string }>,
    options?: Partial<ChartOptions> & { isDoughnut?: boolean }
  ): Promise<ChartOutput> {
    const chartData: ChartData = {
      labels: data.map(d => d.label),
      series: [
        {
          name: 'data',
          data: data.map(d => ({
            label: d.label,
            value: d.value,
            color: d.color,
          })),
        },
      ],
    };

    return this.generateChart(chartData, {
      type: options?.isDoughnut ? 'doughnut' : 'pie',
      showValues: true,
      ...options,
    });
  }

  /**
   * 散布図を生成
   */
  async generateScatterChart(
    series: Array<{
      name: string;
      data: Array<{ x: number; y: number; size?: number }>;
      color?: string;
    }>,
    options?: Partial<ChartOptions>
  ): Promise<ChartOutput> {
    const chartData: ChartData = {
      series: series.map(s => ({
        name: s.name,
        data: s.data.map(d => ({
          label: String(d.x),
          value: d.y,
          value2: d.size,
        })),
        color: s.color,
      })),
    };

    return this.generateChart(chartData, {
      type: 'scatter',
      ...options,
    });
  }

  /**
   * エリアチャートを生成
   */
  async generateAreaChart(
    labels: string[],
    series: Array<{ name: string; data: number[]; color?: string }>,
    options?: Partial<ChartOptions>
  ): Promise<ChartOutput> {
    const chartData: ChartData = {
      labels,
      series: series.map(s => ({
        name: s.name,
        data: s.data,
        color: s.color,
      })),
    };

    return this.generateChart(chartData, {
      type: 'area',
      ...options,
    });
  }

  /**
   * レーダーチャートを生成
   */
  async generateRadarChart(
    labels: string[],
    series: Array<{ name: string; data: number[]; color?: string }>,
    options?: Partial<ChartOptions>
  ): Promise<ChartOutput> {
    const chartData: ChartData = {
      labels,
      series: series.map(s => ({
        name: s.name,
        data: s.data,
        color: s.color,
      })),
    };

    return this.generateChart(chartData, {
      type: 'radar',
      ...options,
    });
  }

  /**
   * 複合チャートを生成
   */
  async generateComboChart(
    labels: string[],
    barSeries: Array<{ name: string; data: number[]; color?: string }>,
    lineSeries: Array<{ name: string; data: number[]; color?: string }>,
    options?: Partial<ChartOptions>
  ): Promise<ChartOutput> {
    // 複合チャートはSVGを手動で構築
    const barOptions: ChartOptions = {
      type: 'bar',
      ...options,
    };

    const chartData: ChartData = {
      labels,
      series: [
        ...barSeries.map(s => ({ ...s, data: s.data })),
        ...lineSeries.map(s => ({ ...s, data: s.data, style: 'solid' as const })),
      ],
    };

    // TODO: 複合チャートの実装を改善
    return this.generateChart(chartData, barOptions);
  }

  /**
   * データの検証
   */
  private validateData(data: unknown): ChartData {
    if (!data || typeof data !== 'object') {
      throw new ChartGeneratorError(
        CHART_ERROR_CODES.INVALID_DATA,
        'Data must be an object'
      );
    }

    const d = data as Record<string, unknown>;

    if (!Array.isArray(d.series)) {
      throw new ChartGeneratorError(
        CHART_ERROR_CODES.INVALID_DATA,
        'Data must have a series array'
      );
    }

    return data as ChartData;
  }

  /**
   * チャートデータの検証
   */
  private validateChartData(data: ChartData): void {
    if (!data.series || data.series.length === 0) {
      throw new ChartGeneratorError(
        CHART_ERROR_CODES.INVALID_DATA,
        'Chart data must have at least one series'
      );
    }

    for (const series of data.series) {
      if (!series.name) {
        throw new ChartGeneratorError(
          CHART_ERROR_CODES.INVALID_DATA,
          'Each series must have a name'
        );
      }
      if (!series.data || !Array.isArray(series.data)) {
        throw new ChartGeneratorError(
          CHART_ERROR_CODES.INVALID_DATA,
          `Series "${series.name}" must have a data array`
        );
      }
    }
  }

  /**
   * オプションの検証
   */
  private validateOptions(options: ChartOptions): void {
    const validTypes = [
      'bar',
      'line',
      'pie',
      'doughnut',
      'scatter',
      'area',
      'radar',
      'bubble',
    ];

    if (!validTypes.includes(options.type)) {
      throw new ChartGeneratorError(
        CHART_ERROR_CODES.INVALID_TYPE,
        `Invalid chart type: ${options.type}. Valid types: ${validTypes.join(', ')}`
      );
    }
  }

  /**
   * ChartConfig.typeをChartTypeにマップ
   */
  private mapChartType(
    type: ChartConfig['type']
  ): ChartOptions['type'] {
    switch (type) {
      case 'bar':
        return 'bar';
      case 'line':
        return 'line';
      case 'pie':
        return 'pie';
      case 'scatter':
        return 'scatter';
      case 'mermaid':
        // Mermaidはダイアグラムなのでデフォルトで棒グラフ
        return 'bar';
      default:
        return 'bar';
    }
  }

  /**
   * SVGをPNGに変換（Node.js環境用）
   */
  private async convertToPng(
    _svg: string,
    options: ChartOptions
  ): Promise<Buffer> {
    // TODO: sharp等のライブラリを使用してPNG変換を実装
    // 現時点ではプレースホルダー
    const width = options.width ?? this.config.defaultWidth;
    const height = options.height ?? this.config.defaultHeight;

    // 空のPNGバッファを返す（実際の実装では変換が必要）
    return Buffer.from(
      `PNG placeholder: ${width}x${height}`,
      'utf-8'
    );
  }

  /**
   * チャートをBase64エンコード形式で生成
   * @since 0.6.0
   * @requirement REQ-EXT-VIS-001
   */
  async generateBase64(
    data: ChartData,
    options: ChartOptions
  ): Promise<Base64ChartOutput> {
    const output = await this.generateChart(data, options, 'svg');
    const svg = output.content as string;
    
    // SVGをBase64エンコード
    const base64 = Buffer.from(svg, 'utf-8').toString('base64');
    const dataUri = `data:image/svg+xml;base64,${base64}`;
    
    return {
      ...output,
      base64,
      dataUri,
      mimeType: 'image/svg+xml',
    };
  }

  /**
   * チャートをMarkdown埋め込み形式で生成
   * @since 0.6.0
   * @requirement REQ-EXT-VIS-001
   */
  async generateMarkdownEmbed(
    data: ChartData,
    options: ChartOptions & { altText?: string }
  ): Promise<MarkdownChartOutput> {
    const base64Output = await this.generateBase64(data, options);
    
    const altText = options.altText ?? options.title ?? 'Chart';
    const markdown = `![${altText}](${base64Output.dataUri})`;
    const html = `<img src="${base64Output.dataUri}" alt="${this.escapeHtml(altText)}" />`;
    
    return {
      ...base64Output,
      markdown,
      html,
      altText,
    };
  }

  /**
   * 棒グラフをBase64で生成
   * @since 0.6.0
   */
  async generateBarChartBase64(
    labels: string[],
    series: Array<{ name: string; data: number[]; color?: string }>,
    options?: Partial<ChartOptions>
  ): Promise<Base64ChartOutput> {
    const chartData: ChartData = {
      labels,
      series: series.map(s => ({
        name: s.name,
        data: s.data,
        color: s.color,
      })),
    };

    return this.generateBase64(chartData, {
      type: 'bar',
      ...options,
    });
  }

  /**
   * 折れ線グラフをBase64で生成
   * @since 0.6.0
   */
  async generateLineChartBase64(
    labels: string[],
    series: Array<{ name: string; data: number[]; color?: string }>,
    options?: Partial<ChartOptions>
  ): Promise<Base64ChartOutput> {
    const chartData: ChartData = {
      labels,
      series: series.map(s => ({
        name: s.name,
        data: s.data,
        color: s.color,
      })),
    };

    return this.generateBase64(chartData, {
      type: 'line',
      ...options,
    });
  }

  /**
   * 円グラフをBase64で生成
   * @since 0.6.0
   */
  async generatePieChartBase64(
    data: Array<{ label: string; value: number; color?: string }>,
    options?: Partial<ChartOptions>
  ): Promise<Base64ChartOutput> {
    const chartData: ChartData = {
      labels: data.map(d => d.label),
      series: [
        {
          name: 'data',
          data: data.map(d => ({
            label: d.label,
            value: d.value,
            color: d.color,
          })),
        },
      ],
    };

    return this.generateBase64(chartData, {
      type: 'pie',
      ...options,
    });
  }

  /**
   * チャートをMarkdown埋め込み形式で一括生成
   * @since 0.6.0
   * @requirement REQ-EXT-VIS-001
   */
  async generateMarkdownReport(
    charts: Array<{
      data: ChartData;
      options: ChartOptions;
      title: string;
      description?: string;
    }>
  ): Promise<string> {
    const sections: string[] = [];

    for (const chart of charts) {
      const embedded = await this.generateMarkdownEmbed(chart.data, {
        ...chart.options,
        altText: chart.title,
      });

      const section: string[] = [];
      section.push(`### ${chart.title}`);
      if (chart.description) {
        section.push('');
        section.push(chart.description);
      }
      section.push('');
      section.push(embedded.markdown);
      section.push('');

      sections.push(section.join('\n'));
    }

    return sections.join('\n---\n\n');
  }

  /**
   * HTMLエスケープ
   * @since 0.6.0
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
