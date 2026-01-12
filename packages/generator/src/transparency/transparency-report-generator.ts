/**
 * TransparencyReportGenerator
 * AI使用透明性レポートの生成
 *
 * @module transparency/transparency-report-generator
 * @requirement Phase 2 - 透明性機能
 */

import type {
  TransparencyReport,
  TransparencyReportOptions,
  ContributionAnalysis,
  AIDisclosure,
  SectionContribution,
  VersionHistory,
  CollaborationSession,
} from './types.js';
import { ContributionAnalyzer, type SectionInput } from './contribution-analyzer.js';

/** レポート生成設定 */
export interface ReportGeneratorConfig {
  /** デフォルト言語 */
  defaultLanguage: 'ja' | 'en';
  /** デフォルト詳細レベル */
  defaultDetailLevel: 'summary' | 'standard' | 'detailed';
  /** 組織名 */
  organizationName?: string;
  /** カスタムフッター */
  customFooter?: string;
}

/**
 * TransparencyReportGenerator
 * AI使用の透明性レポートを生成
 */
export class TransparencyReportGenerator {
  private config: ReportGeneratorConfig;
  private analyzer: ContributionAnalyzer;
  private reportCounter: number = 0;

  constructor(config?: Partial<ReportGeneratorConfig>) {
    this.config = {
      defaultLanguage: 'ja',
      defaultDetailLevel: 'standard',
      ...config,
    };
    this.analyzer = new ContributionAnalyzer();
  }

  /**
   * 透明性レポートを生成
   */
  generate(options: TransparencyReportOptions): TransparencyReport {
    const {
      documentId,
      title,
      content,
      sections,
      versionHistory,
      collaborationSessions,
      format = 'markdown',
      detailLevel = this.config.defaultDetailLevel,
      language = this.config.defaultLanguage,
    } = options;

    // 貢献分析
    const contribution = this.analyzeContribution(documentId, title, content, sections);

    // AI開示情報を生成
    const aiDisclosure = this.generateAIDisclosure(contribution, language);

    // バージョンサマリ
    const versionSummary = this.summarizeVersionHistory(versionHistory);

    // コラボレーション情報
    const collaboration = this.summarizeCollaboration(collaborationSessions);

    // レポートID生成
    const reportId = this.generateReportId();

    // レポート本文を生成
    const reportContent = this.formatReport({
      reportId,
      documentId,
      title,
      contribution,
      versionSummary,
      collaboration,
      aiDisclosure,
      format,
      detailLevel,
      language,
    });

    return {
      id: reportId,
      documentId,
      documentTitle: title,
      generatedAt: new Date(),
      contribution,
      versionSummary,
      collaboration,
      aiDisclosure,
      format,
      content: reportContent,
    };
  }

  /**
   * 貢献度を分析
   */
  private analyzeContribution(
    documentId: string,
    title: string,
    content: string,
    sections?: SectionContribution[]
  ): ContributionAnalysis {
    if (sections && sections.length > 0) {
      // セクション情報が提供されている場合はそのまま使用
      const sectionInputs: SectionInput[] = sections.map(s => ({
        id: s.sectionId,
        name: s.sectionName,
        content: s.content,
        isAIGenerated: s.contributorType === 'ai',
        aiModel: s.aiModel,
        humanContributor: s.humanContributor,
        aiContributions: s.aiContributions,
        humanContributions: s.humanContributions,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }));

      return this.analyzer.analyze(documentId, title, sectionInputs);
    }

    // セクション情報がない場合はコンテンツを自動分割
    const autoSections = this.splitContentIntoSections(content);
    return this.analyzer.analyze(documentId, title, autoSections);
  }

  /**
   * コンテンツをセクションに分割
   */
  private splitContentIntoSections(content: string): SectionInput[] {
    const sections: SectionInput[] = [];
    
    // Markdownの見出しでセクション分割
    const headingPattern = /^(#{1,3})\s+(.+)$/gm;
    let match: RegExpExecArray | null;
    let sectionIndex = 0;

    const matches: Array<{ level: number; title: string; start: number }> = [];
    
    while ((match = headingPattern.exec(content)) !== null) {
      const levelStr = match[1];
      const titleStr = match[2];
      if (levelStr && titleStr) {
        matches.push({
          level: levelStr.length,
          title: titleStr,
          start: match.index,
        });
      }
    }

    if (matches.length === 0) {
      // 見出しがない場合は全体を1セクションとして扱う
      return [{
        id: 'section-1',
        name: 'Main Content',
        content: content,
      }];
    }

    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      const nextMatch = matches[i + 1];
      
      if (!currentMatch) continue;
      
      const sectionStart = currentMatch.start;
      const sectionEnd = nextMatch ? nextMatch.start : content.length;
      const sectionContent = content.substring(sectionStart, sectionEnd).trim();

      sectionIndex++;
      sections.push({
        id: `section-${sectionIndex}`,
        name: currentMatch.title,
        content: sectionContent,
      });
    }

    // 最初の見出し前のコンテンツがあれば追加
    const firstMatch = matches[0];
    if (firstMatch && firstMatch.start > 0) {
      const introContent = content.substring(0, firstMatch.start).trim();
      if (introContent.length > 0) {
        sections.unshift({
          id: 'section-intro',
          name: 'Introduction',
          content: introContent,
        });
      }
    }

    return sections;
  }

  /**
   * AI開示情報を生成
   */
  private generateAIDisclosure(contribution: ContributionAnalysis, language: 'ja' | 'en'): AIDisclosure {
    const aiUsed = contribution.overallAIRatio > 0;
    const purposes = [...new Set(contribution.sections.flatMap(s => s.aiContributions))];
    const models = contribution.aiModelsUsed;
    const humanVerified = contribution.humanContributors.length > 0 ||
      contribution.sections.some(s => s.humanContributions.includes('review') || s.humanContributions.includes('verification'));

    const disclosureStatement = this.generateDisclosureStatement(
      aiUsed,
      contribution.overallAIRatio,
      models,
      humanVerified,
      language
    );

    return {
      aiUsed,
      purposes,
      models,
      contributionRatio: contribution.overallAIRatio,
      humanVerified,
      verifiedBy: contribution.humanContributors.length > 0 ? contribution.humanContributors : undefined,
      disclosureStatement,
    };
  }

  /**
   * AI使用開示ステートメントを生成
   */
  private generateDisclosureStatement(
    aiUsed: boolean,
    aiRatio: number,
    models: string[],
    humanVerified: boolean,
    language: 'ja' | 'en'
  ): string {
    if (!aiUsed) {
      return language === 'ja'
        ? 'このドキュメントは人間によって作成されており、AI支援は使用されていません。'
        : 'This document was created by humans without AI assistance.';
    }

    const modelList = models.length > 0 ? models.join(', ') : (language === 'ja' ? '不明なAIモデル' : 'unspecified AI model');
    const verificationNote = humanVerified
      ? (language === 'ja' ? '内容は人間により検証されています。' : 'The content has been verified by humans.')
      : (language === 'ja' ? '内容は人間による検証を受けていません。' : 'The content has not been verified by humans.');

    if (language === 'ja') {
      if (aiRatio >= 80) {
        return `このドキュメントは主にAI（${modelList}）によって生成されました。AI貢献率: ${aiRatio}%。${verificationNote}`;
      } else if (aiRatio >= 50) {
        return `このドキュメントはAI（${modelList}）と人間の共同作業により作成されました。AI貢献率: ${aiRatio}%。${verificationNote}`;
      } else {
        return `このドキュメントは主に人間によって作成され、一部でAI（${modelList}）の支援を受けています。AI貢献率: ${aiRatio}%。${verificationNote}`;
      }
    } else {
      if (aiRatio >= 80) {
        return `This document was primarily generated by AI (${modelList}). AI contribution: ${aiRatio}%. ${verificationNote}`;
      } else if (aiRatio >= 50) {
        return `This document was created through collaboration between AI (${modelList}) and humans. AI contribution: ${aiRatio}%. ${verificationNote}`;
      } else {
        return `This document was primarily created by humans with some AI assistance (${modelList}). AI contribution: ${aiRatio}%. ${verificationNote}`;
      }
    }
  }

  /**
   * バージョン履歴をサマリ化
   */
  private summarizeVersionHistory(history?: VersionHistory): TransparencyReport['versionSummary'] {
    if (!history || history.versions.length === 0) {
      return {
        totalVersions: 0,
        majorChanges: 0,
        lastUpdated: new Date(),
      };
    }

    const majorChanges = history.versions.filter(v => 
      v.changeType === 'create' || v.changeType === 'merge'
    ).length;

    return {
      totalVersions: history.totalVersions,
      majorChanges,
      lastUpdated: history.lastVersionAt,
    };
  }

  /**
   * コラボレーション情報をサマリ化
   */
  private summarizeCollaboration(sessions?: CollaborationSession[]): TransparencyReport['collaboration'] {
    if (!sessions || sessions.length === 0) {
      return undefined;
    }

    const allParticipants = new Set<string>();
    let totalDurationMs = 0;

    for (const session of sessions) {
      for (const participant of session.participants) {
        allParticipants.add(participant.name);
      }
      totalDurationMs += session.stats.durationMs;
    }

    return {
      totalSessions: sessions.length,
      participants: Array.from(allParticipants),
      totalDurationMs,
    };
  }

  /**
   * レポートをフォーマット
   */
  private formatReport(data: {
    reportId: string;
    documentId: string;
    title: string;
    contribution: ContributionAnalysis;
    versionSummary: TransparencyReport['versionSummary'];
    collaboration?: TransparencyReport['collaboration'];
    aiDisclosure: AIDisclosure;
    format: 'markdown' | 'json' | 'html';
    detailLevel: 'summary' | 'standard' | 'detailed';
    language: 'ja' | 'en';
  }): string {
    switch (data.format) {
      case 'json':
        return this.formatAsJSON(data);
      case 'html':
        return this.formatAsHTML(data);
      case 'markdown':
      default:
        return this.formatAsMarkdown(data);
    }
  }

  /**
   * Markdown形式でフォーマット
   */
  private formatAsMarkdown(data: {
    reportId: string;
    documentId: string;
    title: string;
    contribution: ContributionAnalysis;
    versionSummary: TransparencyReport['versionSummary'];
    collaboration?: TransparencyReport['collaboration'];
    aiDisclosure: AIDisclosure;
    detailLevel: 'summary' | 'standard' | 'detailed';
    language: 'ja' | 'en';
  }): string {
    const { language, detailLevel } = data;
    const isJa = language === 'ja';
    const lines: string[] = [];

    // タイトル
    lines.push(isJa ? `# AI使用透明性レポート` : `# AI Usage Transparency Report`);
    lines.push('');
    lines.push(isJa ? `**対象ドキュメント**: ${data.title}` : `**Document**: ${data.title}`);
    lines.push(isJa ? `**レポートID**: ${data.reportId}` : `**Report ID**: ${data.reportId}`);
    lines.push(isJa ? `**生成日時**: ${new Date().toISOString()}` : `**Generated**: ${new Date().toISOString()}`);
    lines.push('');

    // AI使用開示
    lines.push(isJa ? '## AI使用開示' : '## AI Disclosure');
    lines.push('');
    lines.push(`> ${data.aiDisclosure.disclosureStatement}`);
    lines.push('');

    // 貢献度サマリ
    lines.push(isJa ? '## 貢献度サマリ' : '## Contribution Summary');
    lines.push('');
    lines.push(`| ${isJa ? '指標' : 'Metric'} | ${isJa ? '値' : 'Value'} |`);
    lines.push('|---|---|');
    lines.push(`| ${isJa ? 'AI貢献率' : 'AI Contribution'} | ${data.contribution.overallAIRatio}% |`);
    lines.push(`| ${isJa ? '人間貢献率' : 'Human Contribution'} | ${data.contribution.overallHumanRatio}% |`);
    lines.push(`| ${isJa ? '全体文字数' : 'Total Characters'} | ${data.contribution.summary.totalChars.toLocaleString()} |`);
    lines.push(`| ${isJa ? 'セクション数' : 'Total Sections'} | ${data.contribution.summary.totalSections} |`);
    lines.push('');

    if (data.aiDisclosure.aiUsed && data.aiDisclosure.models.length > 0) {
      lines.push(isJa ? '### 使用AIモデル' : '### AI Models Used');
      lines.push('');
      for (const model of data.aiDisclosure.models) {
        lines.push(`- ${model}`);
      }
      lines.push('');
    }

    if (data.contribution.humanContributors.length > 0) {
      lines.push(isJa ? '### 人間の貢献者' : '### Human Contributors');
      lines.push('');
      for (const contributor of data.contribution.humanContributors) {
        lines.push(`- ${contributor}`);
      }
      lines.push('');
    }

    // 詳細レベルに応じたセクション別詳細
    if (detailLevel === 'detailed') {
      lines.push(isJa ? '## セクション別詳細' : '## Section Details');
      lines.push('');
      lines.push(`| ${isJa ? 'セクション' : 'Section'} | ${isJa ? 'AI比率' : 'AI Ratio'} | ${isJa ? '貢献タイプ' : 'Type'} | ${isJa ? '文字数' : 'Chars'} |`);
      lines.push('|---|---|---|---|');
      
      for (const section of data.contribution.sections) {
        lines.push(`| ${section.sectionName} | ${section.aiContributionRatio}% | ${section.contributorType} | ${section.charCount.toLocaleString()} |`);
      }
      lines.push('');
    }

    // バージョン情報
    if (detailLevel !== 'summary') {
      lines.push(isJa ? '## バージョン情報' : '## Version Information');
      lines.push('');
      lines.push(`- ${isJa ? 'バージョン数' : 'Total Versions'}: ${data.versionSummary.totalVersions}`);
      lines.push(`- ${isJa ? '主要な変更' : 'Major Changes'}: ${data.versionSummary.majorChanges}`);
      lines.push(`- ${isJa ? '最終更新' : 'Last Updated'}: ${data.versionSummary.lastUpdated.toISOString()}`);
      lines.push('');
    }

    // コラボレーション情報
    if (data.collaboration && detailLevel !== 'summary') {
      lines.push(isJa ? '## コラボレーション情報' : '## Collaboration Information');
      lines.push('');
      lines.push(`- ${isJa ? 'セッション数' : 'Total Sessions'}: ${data.collaboration.totalSessions}`);
      lines.push(`- ${isJa ? '参加者' : 'Participants'}: ${data.collaboration.participants.join(', ')}`);
      lines.push(`- ${isJa ? '合計作業時間' : 'Total Duration'}: ${this.formatDuration(data.collaboration.totalDurationMs, language)}`);
      lines.push('');
    }

    // フッター
    lines.push('---');
    lines.push('');
    if (this.config.organizationName) {
      lines.push(`${isJa ? '発行' : 'Issued by'}: ${this.config.organizationName}`);
    }
    if (this.config.customFooter) {
      lines.push(this.config.customFooter);
    }
    lines.push(isJa ? '*このレポートはKATASHIRO Transparency Moduleにより自動生成されました。*' : '*This report was automatically generated by KATASHIRO Transparency Module.*');

    return lines.join('\n');
  }

  /**
   * JSON形式でフォーマット
   */
  private formatAsJSON(data: {
    reportId: string;
    documentId: string;
    title: string;
    contribution: ContributionAnalysis;
    versionSummary: TransparencyReport['versionSummary'];
    collaboration?: TransparencyReport['collaboration'];
    aiDisclosure: AIDisclosure;
    detailLevel: 'summary' | 'standard' | 'detailed';
    language: 'ja' | 'en';
  }): string {
    return JSON.stringify({
      reportId: data.reportId,
      documentId: data.documentId,
      title: data.title,
      generatedAt: new Date().toISOString(),
      aiDisclosure: data.aiDisclosure,
      contribution: data.detailLevel === 'summary' ? {
        overallAIRatio: data.contribution.overallAIRatio,
        overallHumanRatio: data.contribution.overallHumanRatio,
        summary: data.contribution.summary,
      } : data.contribution,
      versionSummary: data.versionSummary,
      collaboration: data.collaboration,
      meta: {
        generator: 'KATASHIRO Transparency Module',
        language: data.language,
        detailLevel: data.detailLevel,
        organization: this.config.organizationName,
      },
    }, null, 2);
  }

  /**
   * HTML形式でフォーマット
   */
  private formatAsHTML(data: {
    reportId: string;
    documentId: string;
    title: string;
    contribution: ContributionAnalysis;
    versionSummary: TransparencyReport['versionSummary'];
    collaboration?: TransparencyReport['collaboration'];
    aiDisclosure: AIDisclosure;
    detailLevel: 'summary' | 'standard' | 'detailed';
    language: 'ja' | 'en';
  }): string {
    const { language } = data;
    const isJa = language === 'ja';

    return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isJa ? 'AI使用透明性レポート' : 'AI Usage Transparency Report'} - ${data.title}</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #4CAF50; }
    .disclosure { background: #f5f5f5; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #4CAF50; color: white; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 0.9em; }
    .ai-ratio { font-size: 2em; color: #4CAF50; font-weight: bold; }
  </style>
</head>
<body>
  <h1>${isJa ? 'AI使用透明性レポート' : 'AI Usage Transparency Report'}</h1>
  <p><strong>${isJa ? '対象ドキュメント' : 'Document'}:</strong> ${data.title}</p>
  <p><strong>${isJa ? 'レポートID' : 'Report ID'}:</strong> ${data.reportId}</p>
  
  <h2>${isJa ? 'AI使用開示' : 'AI Disclosure'}</h2>
  <div class="disclosure">
    <p>${data.aiDisclosure.disclosureStatement}</p>
  </div>
  
  <h2>${isJa ? '貢献度サマリ' : 'Contribution Summary'}</h2>
  <p class="ai-ratio">${isJa ? 'AI貢献率' : 'AI Contribution'}: ${data.contribution.overallAIRatio}%</p>
  <table>
    <tr><th>${isJa ? '指標' : 'Metric'}</th><th>${isJa ? '値' : 'Value'}</th></tr>
    <tr><td>${isJa ? 'AI貢献率' : 'AI Contribution'}</td><td>${data.contribution.overallAIRatio}%</td></tr>
    <tr><td>${isJa ? '人間貢献率' : 'Human Contribution'}</td><td>${data.contribution.overallHumanRatio}%</td></tr>
    <tr><td>${isJa ? '全体文字数' : 'Total Characters'}</td><td>${data.contribution.summary.totalChars.toLocaleString()}</td></tr>
    <tr><td>${isJa ? 'セクション数' : 'Total Sections'}</td><td>${data.contribution.summary.totalSections}</td></tr>
  </table>
  
  <div class="footer">
    ${this.config.organizationName ? `<p>${isJa ? '発行' : 'Issued by'}: ${this.config.organizationName}</p>` : ''}
    <p><em>${isJa ? 'このレポートはKATASHIRO Transparency Moduleにより自動生成されました。' : 'This report was automatically generated by KATASHIRO Transparency Module.'}</em></p>
  </div>
</body>
</html>`;
  }

  /**
   * 継続時間をフォーマット
   */
  private formatDuration(ms: number, language: 'ja' | 'en'): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    
    if (language === 'ja') {
      if (hours > 0) {
        return `${hours}時間${minutes}分`;
      }
      return `${minutes}分`;
    } else {
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    }
  }

  /**
   * レポートIDを生成
   */
  private generateReportId(): string {
    this.reportCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.reportCounter.toString(36).padStart(4, '0');
    return `report-${timestamp}-${counter}`;
  }

  /**
   * 簡易レポートを生成（開示ステートメントのみ）
   */
  generateQuickDisclosure(
    aiRatio: number,
    aiModels: string[],
    humanVerified: boolean,
    language: 'ja' | 'en' = this.config.defaultLanguage
  ): string {
    return this.generateDisclosureStatement(
      aiRatio > 0,
      aiRatio,
      aiModels,
      humanVerified,
      language
    );
  }

  /**
   * バッジ用のテキストを生成
   */
  generateBadgeText(aiRatio: number, language: 'ja' | 'en' = this.config.defaultLanguage): string {
    const isJa = language === 'ja';
    
    if (aiRatio === 0) {
      return isJa ? '100% 人間作成' : '100% Human Created';
    } else if (aiRatio < 30) {
      return isJa ? 'AI支援あり' : 'AI Assisted';
    } else if (aiRatio < 70) {
      return isJa ? 'AI・人間共同作成' : 'AI-Human Collaboration';
    } else {
      return isJa ? 'AI生成' : 'AI Generated';
    }
  }
}
