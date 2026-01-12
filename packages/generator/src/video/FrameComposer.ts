/**
 * Frame Composer
 * フレーム合成ユーティリティ
 * REQ-MEDIA-003-001: スライドショー動画
 * REQ-MEDIA-003-002: テキストオーバーレイ
 */

import type {
  Slide,
  TextOverlay,
  TextStyle,
  Resolution,
  TransitionConfig,
  KenBurnsEffect,
} from './types.js';

import { DEFAULT_TEXT_STYLE } from './types.js';

/**
 * フレーム情報
 */
export interface FrameInfo {
  /** フレーム番号 */
  frameNumber: number;
  /** 時間（秒） */
  time: number;
  /** スライドインデックス */
  slideIndex: number;
  /** トランジション中か */
  inTransition: boolean;
  /** トランジション進捗（0-1） */
  transitionProgress?: number;
}

/**
 * レンダリングされたフレーム
 */
export interface RenderedFrame {
  /** フレームデータ（Base64 PNG） */
  data: string;
  /** 幅 */
  width: number;
  /** 高さ */
  height: number;
}

/**
 * フレームコンポーザークラス
 * SVGベースでフレームを生成（モック実装）
 */
export class FrameComposer {
  private readonly resolution: Resolution;
  private readonly backgroundColor: string;

  constructor(resolution: Resolution, backgroundColor = '#000000') {
    this.resolution = resolution;
    this.backgroundColor = backgroundColor;
  }

  /**
   * スライドからフレームを生成
   */
  composeSlideFrame(
    slide: Slide,
    frameInfo: FrameInfo,
    nextSlide?: Slide
  ): string {
    const { width, height } = this.resolution;
    
    // Ken Burns効果の計算
    const transform = slide.kenBurns
      ? this.calculateKenBurnsTransform(slide.kenBurns, frameInfo.time / slide.duration)
      : { scale: 1, x: 0, y: 0 };

    // SVGを構築
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;
    svg += `<rect width="100%" height="100%" fill="${this.backgroundColor}"/>`;
    
    // 背景画像
    svg += `<image href="${this.escapeXml(slide.imageSource)}" `;
    svg += `width="${width * transform.scale}" height="${height * transform.scale}" `;
    svg += `x="${transform.x}" y="${transform.y}" `;
    svg += `preserveAspectRatio="xMidYMid slice"/>`;

    // トランジション中の場合
    if (frameInfo.inTransition && nextSlide && frameInfo.transitionProgress !== undefined) {
      svg += this.applyTransition(
        slide,
        nextSlide,
        frameInfo.transitionProgress,
        slide.transition
      );
    }

    // テキストオーバーレイ
    if (slide.overlays) {
      for (const overlay of slide.overlays) {
        if (this.isOverlayVisible(overlay, frameInfo.time, slide.duration)) {
          svg += this.renderTextOverlay(overlay, frameInfo.time);
        }
      }
    }

    svg += '</svg>';
    return svg;
  }

  /**
   * テキストオーバーレイをレンダリング
   */
  renderTextOverlay(overlay: TextOverlay, currentTime: number): string {
    const style = { ...DEFAULT_TEXT_STYLE, ...overlay.style };
    const position = this.calculateTextPosition(overlay.position, style);
    
    // アニメーション計算
    let opacity = 1;
    let translateX = 0;
    let translateY = 0;
    let scale = 1;

    if (overlay.animation) {
      const animProgress = this.calculateAnimationProgress(
        overlay,
        currentTime
      );
      const animResult = this.applyTextAnimation(overlay.animation.type, animProgress);
      opacity = animResult.opacity;
      translateX = animResult.translateX;
      translateY = animResult.translateY;
      scale = animResult.scale;
    }

    const transform = `translate(${position.x + translateX}, ${position.y + translateY}) scale(${scale})`;

    let svg = `<g transform="${transform}" opacity="${opacity}">`;

    // 背景ボックス
    if (style.backgroundColor && style.backgroundOpacity > 0) {
      const bgWidth = this.estimateTextWidth(overlay.text, style.fontSize) + style.padding * 2;
      const bgHeight = style.fontSize * style.lineHeight + style.padding * 2;
      svg += `<rect x="${-style.padding}" y="${-style.padding}" `;
      svg += `width="${bgWidth}" height="${bgHeight}" `;
      svg += `fill="${style.backgroundColor}" fill-opacity="${style.backgroundOpacity}" `;
      svg += `rx="${style.borderRadius}" ry="${style.borderRadius}"/>`;
    }

    // テキスト
    svg += `<text `;
    svg += `font-family="${style.fontFamily}" `;
    svg += `font-size="${style.fontSize}" `;
    svg += `font-weight="${style.fontWeight}" `;
    svg += `fill="${style.color}" `;
    svg += `text-anchor="${this.getTextAnchor(style.textAlign)}" `;
    
    // シャドウ
    if (style.shadow && style.shadow.blur > 0) {
      svg += `filter="drop-shadow(${style.shadow.offsetX}px ${style.shadow.offsetY}px ${style.shadow.blur}px ${style.shadow.color})" `;
    }

    // ストローク
    if (style.stroke && style.stroke.width > 0) {
      svg += `stroke="${style.stroke.color}" stroke-width="${style.stroke.width}" `;
    }

    svg += `>${this.escapeXml(overlay.text)}</text>`;
    svg += '</g>';

    return svg;
  }

  /**
   * トランジション効果を適用
   */
  private applyTransition(
    _currentSlide: Slide,
    nextSlide: Slide,
    progress: number,
    config?: TransitionConfig
  ): string {
    const type = config?.type ?? 'crossfade';
    const { width, height } = this.resolution;

    switch (type) {
      case 'fade':
        return `<rect width="100%" height="100%" fill="black" opacity="${progress}"/>`;

      case 'crossfade':
      case 'dissolve':
        return `<image href="${this.escapeXml(nextSlide.imageSource)}" ` +
          `width="${width}" height="${height}" opacity="${progress}" ` +
          `preserveAspectRatio="xMidYMid slice"/>`;

      case 'wipe-left':
        return `<clipPath id="wipe"><rect x="${width * (1 - progress)}" y="0" width="${width * progress}" height="${height}"/></clipPath>` +
          `<image href="${this.escapeXml(nextSlide.imageSource)}" width="${width}" height="${height}" clip-path="url(#wipe)" preserveAspectRatio="xMidYMid slice"/>`;

      case 'wipe-right':
        return `<clipPath id="wipe"><rect x="0" y="0" width="${width * progress}" height="${height}"/></clipPath>` +
          `<image href="${this.escapeXml(nextSlide.imageSource)}" width="${width}" height="${height}" clip-path="url(#wipe)" preserveAspectRatio="xMidYMid slice"/>`;

      case 'slide-left':
        return `<image href="${this.escapeXml(nextSlide.imageSource)}" ` +
          `x="${width * (1 - progress)}" width="${width}" height="${height}" ` +
          `preserveAspectRatio="xMidYMid slice"/>`;

      case 'slide-right':
        return `<image href="${this.escapeXml(nextSlide.imageSource)}" ` +
          `x="${-width * (1 - progress)}" width="${width}" height="${height}" ` +
          `preserveAspectRatio="xMidYMid slice"/>`;

      case 'zoom-in':
        const zoomScale = 1 + progress * 0.5;
        return `<image href="${this.escapeXml(nextSlide.imageSource)}" ` +
          `width="${width}" height="${height}" opacity="${progress}" ` +
          `transform="scale(${zoomScale}) translate(${-width * (zoomScale - 1) / 2}, ${-height * (zoomScale - 1) / 2})" ` +
          `preserveAspectRatio="xMidYMid slice"/>`;

      case 'zoom-out':
        const zoomOutScale = 1.5 - progress * 0.5;
        return `<image href="${this.escapeXml(nextSlide.imageSource)}" ` +
          `width="${width}" height="${height}" opacity="${progress}" ` +
          `transform="scale(${zoomOutScale}) translate(${-width * (zoomOutScale - 1) / 2}, ${-height * (zoomOutScale - 1) / 2})" ` +
          `preserveAspectRatio="xMidYMid slice"/>`;

      default:
        return '';
    }
  }

  /**
   * Ken Burns効果の変換を計算
   */
  private calculateKenBurnsTransform(
    effect: KenBurnsEffect,
    progress: number
  ): { scale: number; x: number; y: number } {
    const scale = effect.startZoom + (effect.endZoom - effect.startZoom) * progress;
    const x = (effect.startPosition.x + (effect.endPosition.x - effect.startPosition.x) * progress) * this.resolution.width * (1 - scale);
    const y = (effect.startPosition.y + (effect.endPosition.y - effect.startPosition.y) * progress) * this.resolution.height * (1 - scale);

    return { scale, x, y };
  }

  /**
   * テキスト位置を計算
   */
  private calculateTextPosition(
    position: TextOverlay['position'],
    style: Required<TextStyle>
  ): { x: number; y: number } {
    const { width, height } = this.resolution;
    const offsetX = position.offsetX ?? 0;
    const offsetY = position.offsetY ?? 0;

    let x: number;
    let y: number;

    // 水平位置
    switch (position.horizontal) {
      case 'left':
        x = style.padding + offsetX;
        break;
      case 'right':
        x = width - style.padding + offsetX;
        break;
      case 'center':
      default:
        x = width / 2 + offsetX;
    }

    // 垂直位置
    switch (position.vertical) {
      case 'top':
        y = style.fontSize + style.padding + offsetY;
        break;
      case 'bottom':
        y = height - style.padding + offsetY;
        break;
      case 'middle':
      default:
        y = height / 2 + style.fontSize / 2 + offsetY;
    }

    return { x, y };
  }

  /**
   * オーバーレイが表示されるべきか判定
   */
  private isOverlayVisible(
    overlay: TextOverlay,
    currentTime: number,
    slideDuration: number
  ): boolean {
    const startTime = overlay.startTime ?? 0;
    const endTime = overlay.endTime ?? slideDuration;
    return currentTime >= startTime && currentTime <= endTime;
  }

  /**
   * アニメーション進捗を計算
   */
  private calculateAnimationProgress(
    overlay: TextOverlay,
    currentTime: number
  ): number {
    if (!overlay.animation) return 1;

    const startTime = (overlay.startTime ?? 0) + (overlay.animation.delay ?? 0);
    const duration = overlay.animation.duration;

    if (currentTime < startTime) return 0;
    if (currentTime > startTime + duration) return 1;

    const progress = (currentTime - startTime) / duration;
    return this.applyEasing(progress, overlay.animation.easing ?? 'ease-in-out');
  }

  /**
   * テキストアニメーションを適用
   */
  private applyTextAnimation(
    type: string,
    progress: number
  ): { opacity: number; translateX: number; translateY: number; scale: number } {
    switch (type) {
      case 'fade-in':
        return { opacity: progress, translateX: 0, translateY: 0, scale: 1 };
      case 'fade-out':
        return { opacity: 1 - progress, translateX: 0, translateY: 0, scale: 1 };
      case 'slide-in-left':
        return { opacity: 1, translateX: (1 - progress) * -100, translateY: 0, scale: 1 };
      case 'slide-in-right':
        return { opacity: 1, translateX: (1 - progress) * 100, translateY: 0, scale: 1 };
      case 'slide-in-up':
        return { opacity: 1, translateX: 0, translateY: (1 - progress) * 50, scale: 1 };
      case 'slide-in-down':
        return { opacity: 1, translateX: 0, translateY: (1 - progress) * -50, scale: 1 };
      case 'scale':
        return { opacity: 1, translateX: 0, translateY: 0, scale: progress };
      case 'bounce':
        const bounce = Math.sin(progress * Math.PI) * 0.2;
        return { opacity: 1, translateX: 0, translateY: -bounce * 50, scale: 1 + bounce };
      default:
        return { opacity: 1, translateX: 0, translateY: 0, scale: 1 };
    }
  }

  /**
   * イージング関数を適用
   */
  private applyEasing(t: number, easing: string): number {
    switch (easing) {
      case 'linear':
        return t;
      case 'ease-in':
        return t * t;
      case 'ease-out':
        return t * (2 - t);
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default:
        return t;
    }
  }

  /**
   * テキストアンカーを取得
   */
  private getTextAnchor(align: string): string {
    switch (align) {
      case 'left':
        return 'start';
      case 'right':
        return 'end';
      default:
        return 'middle';
    }
  }

  /**
   * テキスト幅を推定
   */
  private estimateTextWidth(text: string, fontSize: number): number {
    // 簡易的な推定（日本語は全角として計算）
    let width = 0;
    for (const char of text) {
      if (/[\u3000-\u9fff]/.test(char)) {
        width += fontSize; // 全角
      } else {
        width += fontSize * 0.6; // 半角
      }
    }
    return width;
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

/**
 * タイムラインを生成
 */
export function generateTimeline(
  slides: Slide[],
  frameRate: number
): FrameInfo[] {
  const frames: FrameInfo[] = [];
  let currentTime = 0;
  let frameNumber = 0;

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]!;
    const slideEnd = currentTime + slide.duration;
    const transitionDuration = slide.transition?.duration ?? 0;
    const transitionStart = slideEnd - transitionDuration;

    while (currentTime < slideEnd) {
      const inTransition = currentTime >= transitionStart && i < slides.length - 1;
      const transitionProgress = inTransition
        ? (currentTime - transitionStart) / transitionDuration
        : undefined;

      frames.push({
        frameNumber,
        time: currentTime - (i > 0 ? slides.slice(0, i).reduce((sum, s) => sum + s.duration, 0) : 0),
        slideIndex: i,
        inTransition,
        transitionProgress,
      });

      frameNumber++;
      currentTime += 1 / frameRate;
    }
  }

  return frames;
}
