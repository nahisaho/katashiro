/**
 * ReferenceValidator - 参照一貫性バリデーター
 * @module consistency/validators/ReferenceValidator
 * @see DES-KATASHIRO-004-DCC Section 5.3.4
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  Document,
  ExtractedReference,
  ConsistencyIssue,
} from '../types.js';

/**
 * 参照検証設定
 */
export interface ReferenceValidatorConfig {
  /** ベースディレクトリ（相対パス解決用） */
  baseDir: string;
  /** 外部URLの有効性をチェックするか */
  checkExternalUrls: boolean;
  /** 外部URLチェックのタイムアウト（ミリ秒） */
  urlCheckTimeout: number;
  /** 無視するURLパターン */
  ignorePatterns?: RegExp[];
}

/**
 * 参照一貫性バリデーター
 */
export class ReferenceValidator {
  private readonly config: ReferenceValidatorConfig;
  private readonly sectionHeadings: Map<string, Set<string>>;

  constructor(config?: Partial<ReferenceValidatorConfig>) {
    this.config = {
      baseDir: config?.baseDir ?? process.cwd(),
      checkExternalUrls: config?.checkExternalUrls ?? false,
      urlCheckTimeout: config?.urlCheckTimeout ?? 5000,
      ignorePatterns: config?.ignorePatterns,
    };
    this.sectionHeadings = new Map();
  }

  /**
   * 文書の見出しを登録
   */
  registerHeadings(filePath: string, content: string): void {
    const headings = new Set<string>();
    const lines = content.split('\n');

    for (const line of lines) {
      if (!line) continue;
      const match = line.match(/^#+\s+(.+)/);
      if (match?.[1]) {
        // 見出しをアンカー形式に変換
        const anchor = this.headingToAnchor(match[1]);
        headings.add(anchor);
      }
    }

    this.sectionHeadings.set(filePath, headings);
  }

  /**
   * 見出しをアンカー形式に変換
   */
  private headingToAnchor(heading: string): string {
    return heading
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF-]/g, '');
  }

  /**
   * 参照の有効性を検証（同期版）
   * 外部URL検証は行わない（validateAsyncを使用してください）
   */
  validate(
    references: ExtractedReference[],
    documents: Document[] = [],
  ): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // 文書の見出しを登録
    for (const doc of documents) {
      this.registerHeadings(doc.path, doc.content);
    }

    for (const ref of references) {
      // 無視パターンにマッチする場合はスキップ
      if (this.shouldIgnore(ref.target)) continue;

      switch (ref.type) {
        case 'file': {
          // documentsが空の場合はファイル参照検証をスキップ
          if (documents.length === 0) break;
          const issue = this.validateFileReference(ref, documents);
          if (issue) issues.push(issue);
          break;
        }
        case 'section': {
          const issue = this.validateSectionReference(ref);
          if (issue) issues.push(issue);
          break;
        }
        case 'external': {
          // 同期版では外部URL検証をスキップ
          break;
        }
      }
    }

    // 重複リンクの検出
    issues.push(...this.detectDuplicateLinks(references));

    return issues;
  }

  /**
   * 参照の有効性を検証（非同期版：外部URL検証を含む）
   */
  async validateAsync(
    references: ExtractedReference[],
    documents: Document[] = [],
  ): Promise<ConsistencyIssue[]> {
    const issues = this.validate(references, documents);

    // 外部URL検証
    if (this.config.checkExternalUrls) {
      for (const ref of references) {
        if (ref.type === 'external' && !this.shouldIgnore(ref.target)) {
          const issue = await this.validateExternalUrl(ref);
          if (issue) issues.push(issue);
        }
      }
    }

    return issues;
  }

  /**
   * 無視すべき参照かどうか
   */
  private shouldIgnore(target: string): boolean {
    if (!this.config.ignorePatterns) return false;
    for (const pattern of this.config.ignorePatterns) {
      if (pattern.test(target)) return true;
    }
    return false;
  }

  /**
   * ファイル参照を検証
   */
  private validateFileReference(
    ref: ExtractedReference,
    documents: Document[],
  ): ConsistencyIssue | undefined {
    let targetPath = ref.target;

    // アンカー部分を除去
    const anchorIndex = targetPath.indexOf('#');
    let anchor: string | undefined;
    if (anchorIndex >= 0) {
      anchor = targetPath.substring(anchorIndex + 1);
      targetPath = targetPath.substring(0, anchorIndex);
    }

    // 空のパスは現在のファイル内のアンカー参照
    if (!targetPath && anchor) {
      return this.validateSectionReference({
        ...ref,
        target: '#' + anchor,
      });
    }

    // 相対パスを絶対パスに変換
    const sourceDir = path.dirname(ref.location.file);
    const absolutePath = path.resolve(sourceDir, targetPath);

    // ファイルの存在確認
    const fileExists =
      documents.some((d) => d.path === absolutePath) ||
      fs.existsSync(absolutePath);

    if (!fileExists) {
      return {
        type: 'broken_reference',
        severity: 'error',
        message: `ファイル「${targetPath}」が見つかりません`,
        locations: [ref.location],
        details: {
          referenceType: 'file',
          target: targetPath,
          resolvedPath: absolutePath,
        },
      };
    }

    // アンカーの検証
    if (anchor) {
      const headings = this.sectionHeadings.get(absolutePath);
      if (headings && !headings.has(anchor)) {
        return {
          type: 'broken_reference',
          severity: 'warning',
          message: `ファイル「${targetPath}」内のセクション「#${anchor}」が見つかりません`,
          locations: [ref.location],
          details: {
            referenceType: 'section',
            target: targetPath + '#' + anchor,
            anchor,
          },
        };
      }
    }

    return undefined;
  }

  /**
   * セクション参照を検証
   */
  private validateSectionReference(
    ref: ExtractedReference,
  ): ConsistencyIssue | undefined {
    const anchor = ref.target.replace(/^#/, '');
    const headings = this.sectionHeadings.get(ref.location.file);

    if (!headings) {
      // 見出し情報がない場合は検証をスキップ
      return undefined;
    }

    if (!headings.has(anchor)) {
      return {
        type: 'broken_reference',
        severity: 'warning',
        message: `セクション「#${anchor}」が見つかりません`,
        locations: [ref.location],
        suggestion: this.suggestSimilarHeading(anchor, headings),
        details: {
          referenceType: 'section',
          target: ref.target,
          anchor,
        },
      };
    }

    return undefined;
  }

  /**
   * 類似の見出しを提案
   */
  private suggestSimilarHeading(
    anchor: string,
    headings: Set<string>,
  ): string | undefined {
    let bestMatch: string | undefined;
    let bestDistance = Infinity;

    for (const heading of headings) {
      const distance = this.levenshteinDistance(anchor, heading);
      if (distance < bestDistance && distance <= 3) {
        bestDistance = distance;
        bestMatch = heading;
      }
    }

    if (bestMatch) {
      return `#${bestMatch}`;
    }
    return undefined;
  }

  /**
   * 外部URLを検証
   */
  private async validateExternalUrl(
    ref: ExtractedReference,
  ): Promise<ConsistencyIssue | undefined> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.urlCheckTimeout,
      );

      const response = await fetch(ref.target, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          type: 'broken_reference',
          severity: response.status === 404 ? 'error' : 'warning',
          message: `外部URL「${ref.target}」にアクセスできません (${response.status})`,
          locations: [ref.location],
          details: {
            referenceType: 'external',
            target: ref.target,
            statusCode: response.status,
          },
        };
      }
    } catch (error) {
      return {
        type: 'broken_reference',
        severity: 'warning',
        message: `外部URL「${ref.target}」の検証に失敗しました`,
        locations: [ref.location],
        details: {
          referenceType: 'external',
          target: ref.target,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }

    return undefined;
  }

  /**
   * 重複リンクを検出
   */
  private detectDuplicateLinks(
    references: ExtractedReference[],
  ): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    const linksByFile = new Map<string, Map<string, ExtractedReference[]>>();

    for (const ref of references) {
      const file = ref.location.file;
      let fileLinks = linksByFile.get(file);
      if (!fileLinks) {
        fileLinks = new Map();
        linksByFile.set(file, fileLinks);
      }

      const target = ref.target;
      let links = fileLinks.get(target);
      if (!links) {
        links = [];
        fileLinks.set(target, links);
      }
      links.push(ref);
    }

    for (const [, fileLinks] of linksByFile) {
      for (const [target, refs] of fileLinks) {
        if (refs.length > 3) {
          issues.push({
            type: 'broken_reference',
            severity: 'info',
            message: `同じリンク「${target}」が${refs.length}回使用されています`,
            locations: refs.map((r) => r.location),
            details: {
              category: 'duplicate',
              target,
              count: refs.length,
            },
          });
        }
      }
    }

    return issues;
  }

  /**
   * レーベンシュタイン距離を計算
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;

    if (m === 0) return n;
    if (n === 0) return m;

    const dp: number[][] = Array.from({ length: m + 1 }, () =>
      Array.from({ length: n + 1 }, () => 0),
    );

    for (let i = 0; i <= m; i++) {
      dp[i]![0] = i;
    }
    for (let j = 0; j <= n; j++) {
      dp[0]![j] = j;
    }

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        const deletion = (dp[i - 1]?.[j] ?? 0) + 1;
        const insertion = (dp[i]?.[j - 1] ?? 0) + 1;
        const substitution = (dp[i - 1]?.[j - 1] ?? 0) + cost;
        dp[i]![j] = Math.min(deletion, insertion, substitution);
      }
    }

    return dp[m]?.[n] ?? 0;
  }
}
