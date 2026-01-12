/**
 * SVG Builder
 * SVGチャートを構築するユーティリティ
 * REQ-MEDIA-002-001: チャート生成
 */

import type {
  ChartData,
  ChartOptions,
  AxisConfig,
  ChartGeneratorConfig,
  DataSeries,
} from './types.js';
import { DEFAULT_CHART_CONFIG, THEME_PALETTES } from './types.js';

/**
 * SVGビルダークラス
 */
export class SvgBuilder {
  private elements: string[] = [];
  private readonly config: ChartGeneratorConfig;
  private readonly width: number;
  private readonly height: number;
  private readonly padding = { top: 50, right: 30, bottom: 60, left: 60 };

  constructor(
    private readonly options: ChartOptions,
    config?: Partial<ChartGeneratorConfig>
  ) {
    this.config = { ...DEFAULT_CHART_CONFIG, ...config };
    this.width = options.width ?? this.config.defaultWidth;
    this.height = options.height ?? this.config.defaultHeight;
  }

  /**
   * チャート領域の幅を取得
   */
  get chartWidth(): number {
    return this.width - this.padding.left - this.padding.right;
  }

  /**
   * チャート領域の高さを取得
   */
  get chartHeight(): number {
    return this.height - this.padding.top - this.padding.bottom;
  }

  /**
   * 色パレットを取得
   */
  getColors(): string[] {
    if (this.options.colors && this.options.colors.length > 0) {
      return this.options.colors;
    }
    const theme = this.options.theme ?? 'default';
    return THEME_PALETTES[theme];
  }

  /**
   * SVGヘッダーを追加
   */
  addHeader(): void {
    const bgColor = this.options.backgroundColor ?? '#ffffff';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}">`;
    this.elements.push(svg);
    this.elements.push(`<rect width="100%" height="100%" fill="${bgColor}"/>`);
  }

  /**
   * タイトルを追加
   */
  addTitle(): void {
    if (!this.options.title) return;

    const x = this.width / 2;
    const y = 30;
    const fontSize = (this.options.fontSize ?? this.config.fontSize) + 4;
    const fontFamily = this.options.fontFamily ?? this.config.fontFamily;

    this.elements.push(
      `<text x="${x}" y="${y}" text-anchor="middle" font-family="${fontFamily}" font-size="${fontSize}" font-weight="bold">${this.escapeXml(this.options.title)}</text>`
    );

    if (this.options.subtitle) {
      this.elements.push(
        `<text x="${x}" y="${y + 18}" text-anchor="middle" font-family="${fontFamily}" font-size="${fontSize - 4}" fill="#666">${this.escapeXml(this.options.subtitle)}</text>`
      );
    }
  }

  /**
   * X軸を追加
   */
  addXAxis(labels: string[], axisConfig?: AxisConfig): void {
    const y = this.padding.top + this.chartHeight;
    const startX = this.padding.left;
    const fontFamily = this.options.fontFamily ?? this.config.fontFamily;
    const fontSize = this.options.fontSize ?? this.config.fontSize;

    // 軸線
    this.elements.push(
      `<line x1="${startX}" y1="${y}" x2="${startX + this.chartWidth}" y2="${y}" stroke="#333" stroke-width="1"/>`
    );

    // ラベル
    const step = this.chartWidth / Math.max(labels.length - 1, 1);
    const rotation = axisConfig?.labelRotation ?? 0;

    labels.forEach((label, i) => {
      const x = startX + i * step;
      const transform =
        rotation !== 0 ? ` transform="rotate(${rotation}, ${x}, ${y + 20})"` : '';
      this.elements.push(
        `<text x="${x}" y="${y + 20}" text-anchor="${rotation !== 0 ? 'end' : 'middle'}" font-family="${fontFamily}" font-size="${fontSize - 2}"${transform}>${this.escapeXml(label)}</text>`
      );
    });

    // 軸タイトル
    if (axisConfig?.title) {
      const titleY = this.height - 10;
      this.elements.push(
        `<text x="${this.width / 2}" y="${titleY}" text-anchor="middle" font-family="${fontFamily}" font-size="${fontSize}">${this.escapeXml(axisConfig.title)}</text>`
      );
    }
  }

  /**
   * Y軸を追加
   */
  addYAxis(min: number, max: number, axisConfig?: AxisConfig): void {
    const x = this.padding.left;
    const startY = this.padding.top + this.chartHeight;
    const fontFamily = this.options.fontFamily ?? this.config.fontFamily;
    const fontSize = this.options.fontSize ?? this.config.fontSize;

    // 軸線
    this.elements.push(
      `<line x1="${x}" y1="${this.padding.top}" x2="${x}" y2="${startY}" stroke="#333" stroke-width="1"/>`
    );

    // 目盛り
    const tickCount = 5;
    const range = max - min;

    for (let i = 0; i <= tickCount; i++) {
      const value = min + (range * i) / tickCount;
      const y = startY - (this.chartHeight * i) / tickCount;
      const unit = axisConfig?.unit ?? '';

      // 目盛り線
      this.elements.push(
        `<line x1="${x - 5}" y1="${y}" x2="${x}" y2="${y}" stroke="#333" stroke-width="1"/>`
      );

      // グリッド線
      if (axisConfig?.showGrid !== false && i > 0) {
        this.elements.push(
          `<line x1="${x}" y1="${y}" x2="${x + this.chartWidth}" y2="${y}" stroke="#eee" stroke-width="1"/>`
        );
      }

      // ラベル
      const label = this.formatNumber(value) + unit;
      this.elements.push(
        `<text x="${x - 10}" y="${y + 4}" text-anchor="end" font-family="${fontFamily}" font-size="${fontSize - 2}">${label}</text>`
      );
    }

    // 軸タイトル
    if (axisConfig?.title) {
      const titleX = 20;
      const titleY = this.padding.top + this.chartHeight / 2;
      this.elements.push(
        `<text x="${titleX}" y="${titleY}" text-anchor="middle" font-family="${fontFamily}" font-size="${fontSize}" transform="rotate(-90, ${titleX}, ${titleY})">${this.escapeXml(axisConfig.title)}</text>`
      );
    }
  }

  /**
   * 棒グラフを描画
   */
  drawBarChart(data: ChartData): void {
    const colors = this.getColors();
    const labels = data.labels ?? [];
    const seriesCount = data.series.length;
    const barGroupWidth = this.chartWidth / labels.length;
    const barWidth = (barGroupWidth * 0.8) / seriesCount;
    const gap = barGroupWidth * 0.1;

    // データ範囲を計算
    const { min, max } = this.calculateRange(data.series);

    // 軸を追加
    this.addXAxis(labels, this.options.xAxis);
    this.addYAxis(min, max, this.options.yAxis);

    // バーを描画
    data.series.forEach((series: DataSeries, seriesIndex: number) => {
      const color = series.color ?? colors[seriesIndex % colors.length];
      const seriesData = this.normalizeSeriesData(series, labels);

      seriesData.forEach((point, i) => {
        const x =
          this.padding.left +
          i * barGroupWidth +
          gap +
          seriesIndex * barWidth;
        const barHeight =
          ((point.value - min) / (max - min)) * this.chartHeight;
        const y = this.padding.top + this.chartHeight - barHeight;

        this.elements.push(
          `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="2"/>`
        );

        // 値ラベル
        if (this.options.showValues) {
          this.elements.push(
            `<text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" font-size="10">${this.formatNumber(point.value)}</text>`
          );
        }
      });
    });
  }

  /**
   * 折れ線グラフを描画
   */
  drawLineChart(data: ChartData): void {
    const colors = this.getColors();
    const labels = data.labels ?? [];

    // データ範囲を計算
    const { min, max } = this.calculateRange(data.series);

    // 軸を追加
    this.addXAxis(labels, this.options.xAxis);
    this.addYAxis(min, max, this.options.yAxis);

    // 線を描画
    data.series.forEach((series: DataSeries, seriesIndex: number) => {
      const seriesColor = series.color ?? colors[seriesIndex % colors.length] ?? '#666666';
      const seriesData = this.normalizeSeriesData(series, labels);
      const step = this.chartWidth / Math.max(seriesData.length - 1, 1);

      // パスを構築
      const points = seriesData.map((point, i) => {
        const x = this.padding.left + i * step;
        const y =
          this.padding.top +
          this.chartHeight -
          ((point.value - min) / (max - min)) * this.chartHeight;
        return `${x},${y}`;
      });

      const strokeDasharray = this.getStrokeDasharray(series.style);
      this.elements.push(
        `<polyline points="${points.join(' ')}" fill="none" stroke="${seriesColor}" stroke-width="2"${strokeDasharray}/>`
      );

      // マーカー
      if (series.marker !== 'none') {
        seriesData.forEach((point: { label: string; value: number }, i: number) => {
          const x = this.padding.left + i * step;
          const y =
            this.padding.top +
            this.chartHeight -
            ((point.value - min) / (max - min)) * this.chartHeight;
          const markerType: 'circle' | 'square' | 'triangle' | 'none' = series.marker ?? 'circle';
          this.drawMarker(x, y, seriesColor, markerType);
        });
      }
    });
  }

  /**
   * 円グラフを描画
   */
  drawPieChart(data: ChartData, isDoughnut = false): void {
    const colors = this.getColors();
    const series = data.series[0];
    if (!series) return;

    const seriesData = this.normalizeSeriesData(series, data.labels ?? []);
    const total = seriesData.reduce((sum, p) => sum + p.value, 0);
    const cx = this.width / 2;
    const cy = this.padding.top + this.chartHeight / 2;
    const radius = Math.min(this.chartWidth, this.chartHeight) / 2 - 20;
    const innerRadius = isDoughnut ? radius * 0.5 : 0;

    let startAngle = -Math.PI / 2;

    seriesData.forEach((point, i) => {
      const sliceAngle = (point.value / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;
      const color = point.color ?? colors[i % colors.length];

      // パスを構築
      const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);

      let path: string;
      if (isDoughnut) {
        const ix1 = cx + innerRadius * Math.cos(startAngle);
        const iy1 = cy + innerRadius * Math.sin(startAngle);
        const ix2 = cx + innerRadius * Math.cos(endAngle);
        const iy2 = cy + innerRadius * Math.sin(endAngle);
        path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1} Z`;
      } else {
        path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
      }

      this.elements.push(`<path d="${path}" fill="${color}"/>`);

      // ラベル
      if (this.options.showValues) {
        const midAngle = startAngle + sliceAngle / 2;
        const labelRadius = radius * (isDoughnut ? 0.75 : 0.65);
        const lx = cx + labelRadius * Math.cos(midAngle);
        const ly = cy + labelRadius * Math.sin(midAngle);
        const percent = ((point.value / total) * 100).toFixed(1);
        this.elements.push(
          `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#fff" font-weight="bold">${percent}%</text>`
        );
      }

      startAngle = endAngle;
    });
  }

  /**
   * 散布図を描画
   */
  drawScatterChart(data: ChartData): void {
    const colors = this.getColors();

    // データ範囲を計算
    const xValues: number[] = [];
    const yValues: number[] = [];

    data.series.forEach((series: DataSeries) => {
      const seriesData = this.normalizeSeriesData(series, data.labels ?? []);
      seriesData.forEach((point, i) => {
        xValues.push(i);
        yValues.push(point.value);
      });
    });

    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);

    // 軸を追加
    this.addXAxis(
      data.labels ?? xValues.map(String),
      this.options.xAxis
    );
    this.addYAxis(yMin, yMax, this.options.yAxis);

    // ポイントを描画
    data.series.forEach((series: DataSeries, seriesIndex: number) => {
      const color = series.color ?? colors[seriesIndex % colors.length];
      const seriesData = this.normalizeSeriesData(series, data.labels ?? []);

      seriesData.forEach((point, i) => {
        const x =
          this.padding.left +
          ((i - xMin) / Math.max(xMax - xMin, 1)) * this.chartWidth;
        const y =
          this.padding.top +
          this.chartHeight -
          ((point.value - yMin) / Math.max(yMax - yMin, 1)) * this.chartHeight;
        const size = point.value2 ? Math.sqrt(point.value2) * 3 : 5;

        this.elements.push(
          `<circle cx="${x}" cy="${y}" r="${size}" fill="${color}" opacity="0.7"/>`
        );
      });
    });
  }

  /**
   * エリアチャートを描画
   */
  drawAreaChart(data: ChartData): void {
    const colors = this.getColors();
    const labels = data.labels ?? [];

    // データ範囲を計算
    const { min, max } = this.calculateRange(data.series);

    // 軸を追加
    this.addXAxis(labels, this.options.xAxis);
    this.addYAxis(min, max, this.options.yAxis);

    // エリアを描画
    data.series.forEach((series: DataSeries, seriesIndex: number) => {
      const color = series.color ?? colors[seriesIndex % colors.length];
      const seriesData = this.normalizeSeriesData(series, labels);
      const step = this.chartWidth / Math.max(seriesData.length - 1, 1);

      // パスを構築
      const baseline = this.padding.top + this.chartHeight;
      const points = seriesData.map((point, i) => {
        const x = this.padding.left + i * step;
        const y =
          this.padding.top +
          this.chartHeight -
          ((point.value - min) / (max - min)) * this.chartHeight;
        return { x, y };
      });

      const pathData = [
        `M ${this.padding.left} ${baseline}`,
        ...points.map(p => `L ${p.x} ${p.y}`),
        `L ${points[points.length - 1]?.x ?? this.padding.left} ${baseline}`,
        'Z',
      ].join(' ');

      this.elements.push(
        `<path d="${pathData}" fill="${color}" opacity="0.3"/>`
      );

      // 線
      const linePoints = points.map(p => `${p.x},${p.y}`).join(' ');
      this.elements.push(
        `<polyline points="${linePoints}" fill="none" stroke="${color}" stroke-width="2"/>`
      );
    });
  }

  /**
   * レーダーチャートを描画
   */
  drawRadarChart(data: ChartData): void {
    const colors = this.getColors();
    const labels = data.labels ?? [];
    const sides = labels.length;
    if (sides < 3) return;

    const cx = this.width / 2;
    const cy = this.padding.top + this.chartHeight / 2;
    const radius = Math.min(this.chartWidth, this.chartHeight) / 2 - 40;

    // データ範囲を計算
    const { max } = this.calculateRange(data.series);

    // グリッドを描画
    const levels = 5;
    for (let level = 1; level <= levels; level++) {
      const levelRadius = (radius * level) / levels;
      const points: string[] = [];
      for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
        const x = cx + levelRadius * Math.cos(angle);
        const y = cy + levelRadius * Math.sin(angle);
        points.push(`${x},${y}`);
      }
      this.elements.push(
        `<polygon points="${points.join(' ')}" fill="none" stroke="#ddd" stroke-width="1"/>`
      );
    }

    // 軸線とラベル
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      const labelX = cx + (radius + 20) * Math.cos(angle);
      const labelY = cy + (radius + 20) * Math.sin(angle);

      this.elements.push(
        `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#ccc" stroke-width="1"/>`
      );
      this.elements.push(
        `<text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" font-size="10">${this.escapeXml(labels[i] ?? '')}</text>`
      );
    }

    // データを描画
    data.series.forEach((series: DataSeries, seriesIndex: number) => {
      const color = series.color ?? colors[seriesIndex % colors.length];
      const seriesData = this.normalizeSeriesData(series, labels);
      const points: string[] = [];

      seriesData.forEach((point, i) => {
        const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
        const value = point.value / max;
        const x = cx + radius * value * Math.cos(angle);
        const y = cy + radius * value * Math.sin(angle);
        points.push(`${x},${y}`);
      });

      this.elements.push(
        `<polygon points="${points.join(' ')}" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>`
      );
    });
  }

  /**
   * 凡例を追加
   */
  addLegend(data: ChartData): void {
    if (!this.options.legend?.show) return;

    const colors = this.getColors();
    const position = this.options.legend.position ?? 'bottom';
    const fontFamily = this.options.fontFamily ?? this.config.fontFamily;
    const fontSize = this.options.fontSize ?? this.config.fontSize;

    let x: number, y: number;
    const isHorizontal =
      (this.options.legend.orientation ?? 'horizontal') === 'horizontal';

    switch (position) {
      case 'top':
        x = this.width / 2;
        y = 45;
        break;
      case 'bottom':
        x = this.width / 2;
        y = this.height - 20;
        break;
      case 'left':
        x = 20;
        y = this.padding.top + 20;
        break;
      case 'right':
        x = this.width - 100;
        y = this.padding.top + 20;
        break;
    }

    data.series.forEach((series: DataSeries, i: number) => {
      const color = series.color ?? colors[i % colors.length];
      const offsetX = isHorizontal ? i * 100 - (data.series.length * 100) / 2 : 0;
      const offsetY = isHorizontal ? 0 : i * 20;

      this.elements.push(
        `<rect x="${x + offsetX}" y="${y + offsetY - 6}" width="12" height="12" fill="${color}" rx="2"/>`
      );
      this.elements.push(
        `<text x="${x + offsetX + 18}" y="${y + offsetY + 4}" font-family="${fontFamily}" font-size="${fontSize - 2}">${this.escapeXml(series.name)}</text>`
      );
    });
  }

  /**
   * SVGを出力
   */
  build(): string {
    this.elements.push('</svg>');
    return this.elements.join('\n');
  }

  /**
   * シリーズデータを正規化
   */
  private normalizeSeriesData(
    series: DataSeries,
    labels: string[]
  ): Array<{ label: string; value: number; value2?: number; color?: string }> {
    if (typeof series.data[0] === 'number') {
      return (series.data as number[]).map((value, i) => ({
        label: labels[i] ?? `${i}`,
        value,
      }));
    }
    return series.data as Array<{
      label: string;
      value: number;
      value2?: number;
      color?: string;
    }>;
  }

  /**
   * データ範囲を計算
   */
  private calculateRange(seriesList: DataSeries[]): { min: number; max: number } {
    const values: number[] = [];
    seriesList.forEach(series => {
      if (typeof series.data[0] === 'number') {
        values.push(...(series.data as number[]));
      } else {
        values.push(
          ...(series.data as Array<{ value: number }>).map(d => d.value)
        );
      }
    });

    const min = Math.min(0, ...values);
    const max = Math.max(...values) * 1.1;
    return { min, max };
  }

  /**
   * 線のスタイルを取得
   */
  private getStrokeDasharray(
    style?: 'solid' | 'dashed' | 'dotted'
  ): string {
    switch (style) {
      case 'dashed':
        return ' stroke-dasharray="8,4"';
      case 'dotted':
        return ' stroke-dasharray="2,2"';
      default:
        return '';
    }
  }

  /**
   * マーカーを描画
   */
  private drawMarker(
    x: number,
    y: number,
    color: string,
    type?: 'circle' | 'square' | 'triangle' | 'none'
  ): void {
    switch (type) {
      case 'square':
        this.elements.push(
          `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" fill="${color}"/>`
        );
        break;
      case 'triangle':
        this.elements.push(
          `<polygon points="${x},${y - 5} ${x - 5},${y + 3} ${x + 5},${y + 3}" fill="${color}"/>`
        );
        break;
      case 'circle':
      default:
        this.elements.push(
          `<circle cx="${x}" cy="${y}" r="4" fill="${color}"/>`
        );
        break;
    }
  }

  /**
   * 数値をフォーマット
   */
  private formatNumber(value: number): string {
    if (Math.abs(value) >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (Math.abs(value) >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toFixed(value % 1 === 0 ? 0 : 1);
  }

  /**
   * XMLエスケープ
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
