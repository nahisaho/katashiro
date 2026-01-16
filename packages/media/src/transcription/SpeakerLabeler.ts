/**
 * Speaker Labeler
 *
 * 話者分離・ラベリング機能
 *
 * @task TASK-013-3
 */

import type { TranscriptionSegment } from '../types.js';

/**
 * 話者情報
 */
export interface Speaker {
  id: string;
  label: string;
  segments: number[];
  totalDuration: number;
  wordCount: number;
}

/**
 * 話者分離設定
 */
export interface SpeakerDiarizationConfig {
  /** 最大話者数 */
  maxSpeakers?: number;
  /** 最小セグメント長（秒） */
  minSegmentDuration?: number;
  /** 話者変更検出感度（0-1） */
  sensitivity?: number;
}

/**
 * 話者分離結果
 */
export interface SpeakerDiarizationResult {
  /** 検出された話者一覧 */
  speakers: Speaker[];
  /** 話者ラベル付きセグメント */
  labeledSegments: LabeledSegment[];
  /** 話者数 */
  speakerCount: number;
}

/**
 * 話者ラベル付きセグメント
 */
export interface LabeledSegment extends TranscriptionSegment {
  /** 話者ID */
  speakerId: string;
  /** 話者ラベル */
  speakerLabel: string;
}

/**
 * 話者分離・ラベリングクラス
 */
export class SpeakerLabeler {
  private readonly config: SpeakerDiarizationConfig;

  constructor(config: SpeakerDiarizationConfig = {}) {
    this.config = {
      maxSpeakers: config.maxSpeakers || 10,
      minSegmentDuration: config.minSegmentDuration || 0.5,
      sensitivity: config.sensitivity || 0.5,
    };
  }

  /**
   * セグメントに話者ラベルを付与
   *
   * 注意: これは簡易実装です。
   * 実際の話者分離にはpyannote-audioなどの専門ライブラリが必要です。
   */
  async labelSegments(
    segments: TranscriptionSegment[],
    audioFeatures?: Float32Array[]
  ): Promise<SpeakerDiarizationResult> {
    // 簡易実装: 音声特徴量がない場合はヒューリスティックで分離
    if (!audioFeatures) {
      return this.labelByHeuristics(segments);
    }

    // 音声特徴量がある場合はクラスタリングで分離
    return this.labelByClustering(segments, audioFeatures);
  }

  /**
   * 手動で話者ラベルを設定
   */
  setManualLabels(
    segments: TranscriptionSegment[],
    speakerAssignments: Map<number, string>
  ): LabeledSegment[] {
    return segments.map((seg, index) => ({
      ...seg,
      speakerId: speakerAssignments.get(index) || 'speaker-0',
      speakerLabel: speakerAssignments.get(index) || 'Speaker 1',
    }));
  }

  /**
   * 話者統計を計算
   */
  calculateSpeakerStats(labeledSegments: LabeledSegment[]): Speaker[] {
    const speakerMap = new Map<string, Speaker>();

    labeledSegments.forEach((seg, index) => {
      const existing = speakerMap.get(seg.speakerId);
      const wordCount = seg.words?.length ?? seg.text.split(/\s+/).length;

      if (existing) {
        existing.segments.push(index);
        existing.totalDuration += seg.end - seg.start;
        existing.wordCount += wordCount;
      } else {
        speakerMap.set(seg.speakerId, {
          id: seg.speakerId,
          label: seg.speakerLabel,
          segments: [index],
          totalDuration: seg.end - seg.start,
          wordCount,
        });
      }
    });

    return Array.from(speakerMap.values());
  }

  /**
   * ヒューリスティックベースの話者分離
   *
   * 発話間のギャップや文の特徴から話者を推定
   */
  private labelByHeuristics(
    segments: TranscriptionSegment[]
  ): SpeakerDiarizationResult {
    const labeledSegments: LabeledSegment[] = [];
    let currentSpeaker = 0;
    let lastEnd = 0;
    const maxSpeakers = this.config.maxSpeakers ?? 10;

    for (const seg of segments) {
      // 長いギャップがある場合は話者変更の可能性
      const gap = seg.start - lastEnd;
      if (gap > 2.0) {
        // 2秒以上のギャップ
        currentSpeaker = (currentSpeaker + 1) % maxSpeakers;
      }

      // 質問形式の場合も話者変更の可能性
      if (this.isQuestion(seg.text) && labeledSegments.length > 0) {
        const lastSegment = labeledSegments[labeledSegments.length - 1];
        const prevSpeaker = lastSegment?.speakerId ?? '';
        if (prevSpeaker === `speaker-${currentSpeaker}`) {
          currentSpeaker = (currentSpeaker + 1) % maxSpeakers;
        }
      }

      labeledSegments.push({
        ...seg,
        speakerId: `speaker-${currentSpeaker}`,
        speakerLabel: `Speaker ${currentSpeaker + 1}`,
      });

      lastEnd = seg.end;
    }

    const speakers = this.calculateSpeakerStats(labeledSegments);

    return {
      speakers,
      labeledSegments,
      speakerCount: speakers.length,
    };
  }

  /**
   * クラスタリングベースの話者分離
   */
  private labelByClustering(
    segments: TranscriptionSegment[],
    audioFeatures: Float32Array[]
  ): SpeakerDiarizationResult {
    // 簡易的なk-meansクラスタリング
    const maxSpeakers = this.config.maxSpeakers ?? 10;
    const k = Math.min(maxSpeakers, audioFeatures.length);
    const clusters = this.kMeansClustering(audioFeatures, k);

    const labeledSegments: LabeledSegment[] = segments.map((seg, index) => {
      const clusterIdx = clusters[index] ?? 0;
      return {
        ...seg,
        speakerId: `speaker-${clusterIdx}`,
        speakerLabel: `Speaker ${clusterIdx + 1}`,
      };
    });

    const speakers = this.calculateSpeakerStats(labeledSegments);

    return {
      speakers,
      labeledSegments,
      speakerCount: speakers.length,
    };
  }

  /**
   * 簡易k-meansクラスタリング
   */
  private kMeansClustering(
    features: Float32Array[],
    k: number,
    maxIterations = 100
  ): number[] {
    if (features.length === 0) return [];
    if (features.length <= k) {
      return features.map((_, i) => i);
    }

    const firstFeature = features[0];
    if (!firstFeature) return features.map(() => 0);
    const dim = firstFeature.length;

    // 初期セントロイドをランダムに選択
    const centroids: Float32Array[] = [];
    const usedIndices = new Set<number>();
    while (centroids.length < k) {
      const idx = Math.floor(Math.random() * features.length);
      if (!usedIndices.has(idx)) {
        usedIndices.add(idx);
        const feature = features[idx];
        if (feature) {
          centroids.push(new Float32Array(feature));
        }
      }
    }

    let assignments = new Array(features.length).fill(0);

    for (let iter = 0; iter < maxIterations; iter++) {
      // 各点を最も近いセントロイドに割り当て
      const newAssignments = features.map((f) => {
        let minDist = Infinity;
        let minIdx = 0;
        for (let c = 0; c < k; c++) {
          const centroid = centroids[c];
          if (centroid && f) {
            const dist = this.euclideanDistance(f, centroid);
            if (dist < minDist) {
              minDist = dist;
              minIdx = c;
            }
          }
        }
        return minIdx;
      });

      // 収束チェック
      if (this.arraysEqual(assignments, newAssignments)) {
        break;
      }
      assignments = newAssignments;

      // セントロイドを更新
      for (let c = 0; c < k; c++) {
        const clusterPoints = features.filter((_, i) => assignments[i] === c);
        if (clusterPoints.length > 0) {
          centroids[c] = this.calculateCentroid(clusterPoints, dim);
        }
      }
    }

    return assignments;
  }

  private euclideanDistance(a: Float32Array, b: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const aVal = a[i] ?? 0;
      const bVal = b[i] ?? 0;
      const diff = aVal - bVal;
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  private calculateCentroid(points: Float32Array[], dim: number): Float32Array {
    const centroid = new Float32Array(dim);
    for (const p of points) {
      for (let i = 0; i < dim; i++) {
        const pVal = p[i] ?? 0;
        centroid[i] = (centroid[i] ?? 0) + pVal;
      }
    }
    for (let i = 0; i < dim; i++) {
      centroid[i] = (centroid[i] ?? 0) / points.length;
    }
    return centroid;
  }

  private arraysEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  private isQuestion(text: string): boolean {
    return text.trim().endsWith('?') || text.includes('？');
  }
}
