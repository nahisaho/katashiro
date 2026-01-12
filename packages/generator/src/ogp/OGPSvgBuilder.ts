/**
 * OGP SVG Builder
 * OGP画像をSVGで構築するユーティリティ
 * REQ-MEDIA-004-001: OGP画像生成
 */

import type {
  OGPContent,
  OGPStyle,
  GradientDirection,
  TextAlign,
  VerticalAlign,
} from './types.js';
import { THEME_STYLES, type OGPTheme } from './types.js';

/**
 * OGP SVGビルダークラス
 */
export class OGPSvgBuilder {
  private elements: string[] = [];
  private readonly width: number;
  private readonly height: number;
  private readonly style: OGPStyle;
  private gradientId = 'ogp-gradient';

  constructor(
    width: number,
    height: number,
    theme: OGPTheme = 'default',
    customStyle?: Partial<OGPStyle>
  ) {
    this.width = width;
    this.height = height;
    this.style = { ...THEME_STYLES[theme], ...customStyle };
  }

  /**
   * SVGヘッダーを追加
   */
  addHeader(): void {
    this.elements.push(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}">`
    );

    // フォント定義
    this.elements.push(`<defs>`);

    // グラデーション定義（必要な場合）
    if (this.style.gradientFrom && this.style.gradientTo) {
      this.addGradientDef();
    }

    this.elements.push(`</defs>`);
  }

  /**
   * グラデーション定義を追加
   */
  private addGradientDef(): void {
    const { x1, y1, x2, y2 } = this.getGradientCoords(
      this.style.gradientDirection ?? 'to-right'
    );

    this.elements.push(
      `<linearGradient id="${this.gradientId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">`
    );
    this.elements.push(
      `<stop offset="0%" style="stop-color:${this.style.gradientFrom}"/>`
    );
    this.elements.push(
      `<stop offset="100%" style="stop-color:${this.style.gradientTo}"/>`
    );
    this.elements.push(`</linearGradient>`);
  }

  /**
   * グラデーション方向を座標に変換
   */
  private getGradientCoords(direction: GradientDirection): {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } {
    switch (direction) {
      case 'to-right':
        return { x1: 0, y1: 0, x2: 100, y2: 0 };
      case 'to-left':
        return { x1: 100, y1: 0, x2: 0, y2: 0 };
      case 'to-bottom':
        return { x1: 0, y1: 0, x2: 0, y2: 100 };
      case 'to-top':
        return { x1: 0, y1: 100, x2: 0, y2: 0 };
      case 'to-bottom-right':
        return { x1: 0, y1: 0, x2: 100, y2: 100 };
      case 'to-bottom-left':
        return { x1: 100, y1: 0, x2: 0, y2: 100 };
      case 'to-top-right':
        return { x1: 0, y1: 100, x2: 100, y2: 0 };
      case 'to-top-left':
        return { x1: 100, y1: 100, x2: 0, y2: 0 };
    }
  }

  /**
   * 背景を追加
   */
  addBackground(): void {
    let fill: string;

    if (this.style.gradientFrom && this.style.gradientTo) {
      fill = `url(#${this.gradientId})`;
    } else {
      fill = this.style.backgroundColor ?? '#ffffff';
    }

    const borderRadius = this.style.borderRadius ?? 0;

    if (borderRadius > 0) {
      this.elements.push(
        `<rect width="${this.width}" height="${this.height}" fill="${fill}" rx="${borderRadius}" ry="${borderRadius}"/>`
      );
    } else {
      this.elements.push(
        `<rect width="${this.width}" height="${this.height}" fill="${fill}"/>`
      );
    }

    // ボーダー
    if (this.style.borderWidth && this.style.borderColor) {
      this.elements.push(
        `<rect x="${this.style.borderWidth / 2}" y="${this.style.borderWidth / 2}" ` +
          `width="${this.width - this.style.borderWidth}" height="${this.height - this.style.borderWidth}" ` +
          `fill="none" stroke="${this.style.borderColor}" stroke-width="${this.style.borderWidth}" ` +
          `rx="${borderRadius}" ry="${borderRadius}"/>`
      );
    }
  }

  /**
   * 背景画像オーバーレイを追加
   */
  addBackgroundImage(imageUrl: string): void {
    // 画像
    this.elements.push(
      `<image href="${this.escapeXml(imageUrl)}" x="0" y="0" width="${this.width}" height="${this.height}" preserveAspectRatio="xMidYMid slice"/>`
    );

    // オーバーレイ
    const opacity = this.style.overlayOpacity ?? 0.5;
    const overlayColor = this.style.backgroundColor ?? '#000000';
    this.elements.push(
      `<rect width="${this.width}" height="${this.height}" fill="${overlayColor}" opacity="${opacity}"/>`
    );
  }

  /**
   * コンテンツを追加
   */
  addContent(content: OGPContent): void {
    const padding = this.style.padding ?? 60;
    const textAlign = this.style.textAlign ?? 'left';
    const verticalAlign = this.style.verticalAlign ?? 'middle';

    // コンテンツ領域
    const contentWidth = this.width - padding * 2;
    const contentHeight = this.height - padding * 2;

    // X座標を計算
    const x = this.getXPosition(textAlign, padding, contentWidth);
    const anchor = this.getTextAnchor(textAlign);

    // Y座標を計算
    const contentY = this.getYPosition(
      verticalAlign,
      padding,
      contentHeight,
      content
    );

    let currentY = contentY;

    // 絵文字/アイコン
    if (content.emoji) {
      this.elements.push(
        `<text x="${x}" y="${currentY}" text-anchor="${anchor}" font-size="80">${content.emoji}</text>`
      );
      currentY += 100;
    }

    // タイトル
    const titleFontSize = this.style.titleFontSize ?? 60;
    const titleLines = this.wrapText(
      content.title,
      contentWidth,
      titleFontSize
    );

    for (const line of titleLines) {
      this.elements.push(
        `<text x="${x}" y="${currentY}" text-anchor="${anchor}" ` +
          `font-family="${this.style.fontFamily ?? 'sans-serif'}" ` +
          `font-size="${titleFontSize}" font-weight="bold" ` +
          `fill="${this.style.textColor ?? '#000000'}">${this.escapeXml(line)}</text>`
      );
      currentY += titleFontSize * 1.2;
    }

    currentY += 20;

    // 説明文
    if (content.description) {
      const descFontSize = this.style.descriptionFontSize ?? 28;
      const descLines = this.wrapText(
        content.description,
        contentWidth,
        descFontSize,
        2
      );

      for (const line of descLines) {
        this.elements.push(
          `<text x="${x}" y="${currentY}" text-anchor="${anchor}" ` +
            `font-family="${this.style.fontFamily ?? 'sans-serif'}" ` +
            `font-size="${descFontSize}" ` +
            `fill="${this.style.secondaryTextColor ?? '#666666'}">${this.escapeXml(line)}</text>`
        );
        currentY += descFontSize * 1.4;
      }
    }
  }

  /**
   * フッター（メタ情報）を追加
   */
  addFooter(content: OGPContent): void {
    const padding = this.style.padding ?? 60;
    const footerY = this.height - padding;
    const fontSize = 24;
    const fontFamily = this.style.fontFamily ?? 'sans-serif';
    const color = this.style.secondaryTextColor ?? '#666666';

    const footerItems: string[] = [];

    if (content.author) {
      footerItems.push(content.author);
    }
    if (content.siteName) {
      footerItems.push(content.siteName);
    }
    if (content.date) {
      footerItems.push(content.date);
    }
    if (content.readTime) {
      footerItems.push(content.readTime);
    }

    if (footerItems.length > 0) {
      const footerText = footerItems.join(' • ');
      this.elements.push(
        `<text x="${padding}" y="${footerY}" text-anchor="start" ` +
          `font-family="${fontFamily}" font-size="${fontSize}" ` +
          `fill="${color}">${this.escapeXml(footerText)}</text>`
      );
    }

    // タグ
    if (content.tags && content.tags.length > 0) {
      const tagsText = content.tags.slice(0, 3).map(t => `#${t}`).join('  ');
      this.elements.push(
        `<text x="${this.width - padding}" y="${footerY}" text-anchor="end" ` +
          `font-family="${fontFamily}" font-size="${fontSize}" ` +
          `fill="${this.style.accentColor ?? '#2563eb'}">${this.escapeXml(tagsText)}</text>`
      );
    }
  }

  /**
   * ロゴを追加
   */
  addLogo(logoUrl: string, size = 60): void {
    const padding = this.style.padding ?? 60;
    const x = this.width - padding - size;
    const y = padding;

    this.elements.push(
      `<image href="${this.escapeXml(logoUrl)}" x="${x}" y="${y}" width="${size}" height="${size}"/>`
    );
  }

  /**
   * 装飾を追加
   */
  addDecoration(type: 'dots' | 'lines' | 'circles' | 'corner'): void {
    const accentColor = this.style.accentColor ?? '#2563eb';

    switch (type) {
      case 'dots':
        this.addDotPattern(accentColor);
        break;
      case 'lines':
        this.addLinePattern(accentColor);
        break;
      case 'circles':
        this.addCircleDecoration(accentColor);
        break;
      case 'corner':
        this.addCornerDecoration(accentColor);
        break;
    }
  }

  /**
   * ドットパターンを追加
   */
  private addDotPattern(color: string): void {
    const spacing = 30;
    const radius = 3;
    const opacity = 0.1;

    for (let x = spacing; x < this.width; x += spacing) {
      for (let y = spacing; y < this.height; y += spacing) {
        this.elements.push(
          `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" opacity="${opacity}"/>`
        );
      }
    }
  }

  /**
   * ラインパターンを追加
   */
  private addLinePattern(color: string): void {
    const spacing = 20;
    const opacity = 0.05;

    for (let i = -this.height; i < this.width; i += spacing) {
      this.elements.push(
        `<line x1="${i}" y1="0" x2="${i + this.height}" y2="${this.height}" ` +
          `stroke="${color}" stroke-width="1" opacity="${opacity}"/>`
      );
    }
  }

  /**
   * 円装飾を追加
   */
  private addCircleDecoration(color: string): void {
    const circles = [
      { cx: this.width * 0.9, cy: this.height * 0.2, r: 100, opacity: 0.1 },
      { cx: this.width * 0.1, cy: this.height * 0.8, r: 80, opacity: 0.08 },
      { cx: this.width * 0.7, cy: this.height * 0.9, r: 60, opacity: 0.06 },
    ];

    for (const c of circles) {
      this.elements.push(
        `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="${color}" opacity="${c.opacity}"/>`
      );
    }
  }

  /**
   * コーナー装飾を追加
   */
  private addCornerDecoration(color: string): void {
    const size = 100;

    // 左上
    this.elements.push(
      `<path d="M 0 ${size} L 0 0 L ${size} 0" fill="none" stroke="${color}" stroke-width="4" opacity="0.3"/>`
    );

    // 右下
    this.elements.push(
      `<path d="M ${this.width - size} ${this.height} L ${this.width} ${this.height} L ${this.width} ${this.height - size}" ` +
        `fill="none" stroke="${color}" stroke-width="4" opacity="0.3"/>`
    );
  }

  /**
   * SVGを出力
   */
  build(): string {
    this.elements.push('</svg>');
    return this.elements.join('\n');
  }

  /**
   * テキストを折り返し
   */
  private wrapText(
    text: string,
    maxWidth: number,
    fontSize: number,
    maxLines?: number
  ): string[] {
    // 1文字あたりの平均幅（フォントによって異なる）
    const charWidth = fontSize * 0.55;
    const maxCharsPerLine = Math.floor(maxWidth / charWidth);

    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        // 単語が長すぎる場合は分割
        if (word.length > maxCharsPerLine) {
          let remaining = word;
          while (remaining.length > maxCharsPerLine) {
            lines.push(remaining.slice(0, maxCharsPerLine));
            remaining = remaining.slice(maxCharsPerLine);
          }
          currentLine = remaining;
        } else {
          currentLine = word;
        }
      }

      // 最大行数に達したら終了
      if (maxLines && lines.length >= maxLines) {
        // 最後の行に省略記号を追加
        if (currentLine && lines.length > 0) {
          const lastLine = lines[lines.length - 1] ?? '';
          if (lastLine.length + 3 <= maxCharsPerLine) {
            lines[lines.length - 1] = lastLine + '...';
          } else {
            lines[lines.length - 1] = lastLine.slice(0, -3) + '...';
          }
        }
        break;
      }
    }

    if (currentLine && (!maxLines || lines.length < maxLines)) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * X位置を計算
   */
  private getXPosition(
    textAlign: TextAlign,
    padding: number,
    contentWidth: number
  ): number {
    switch (textAlign) {
      case 'left':
        return padding;
      case 'center':
        return padding + contentWidth / 2;
      case 'right':
        return padding + contentWidth;
    }
  }

  /**
   * テキストアンカーを取得
   */
  private getTextAnchor(textAlign: TextAlign): string {
    switch (textAlign) {
      case 'left':
        return 'start';
      case 'center':
        return 'middle';
      case 'right':
        return 'end';
    }
  }

  /**
   * Y位置を計算
   */
  private getYPosition(
    verticalAlign: VerticalAlign,
    padding: number,
    contentHeight: number,
    content: OGPContent
  ): number {
    // コンテンツの高さを推定
    const titleFontSize = this.style.titleFontSize ?? 60;
    const descFontSize = this.style.descriptionFontSize ?? 28;

    let estimatedHeight = 0;

    if (content.emoji) {
      estimatedHeight += 100;
    }

    // タイトル（2行想定）
    estimatedHeight += titleFontSize * 1.2 * 2;

    if (content.description) {
      estimatedHeight += 20 + descFontSize * 1.4 * 2;
    }

    switch (verticalAlign) {
      case 'top':
        return padding + titleFontSize;
      case 'middle':
        return padding + (contentHeight - estimatedHeight) / 2 + titleFontSize;
      case 'bottom':
        return padding + contentHeight - estimatedHeight;
    }
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
