/**
 * EntityExtractor - エンティティ抽出
 *
 * @requirement REQ-ANALYZE-008
 * @design DES-KATASHIRO-001 §2.2 Analyzer Container
 * @task TSK-022
 */

/**
 * エンティティタイプ
 */
export type EntityType =
  | 'person'
  | 'organization'
  | 'location'
  | 'date'
  | 'time'
  | 'url'
  | 'email'
  | 'phone'
  | 'money'
  | 'percentage'
  | 'number';

/**
 * 抽出されたエンティティ
 */
export interface Entity {
  readonly type: EntityType;
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly normalized?: string;
  readonly count?: number;
}

/**
 * extract() メソッドの戻り値型
 */
export interface ExtractedEntities {
  readonly persons: string[];
  readonly organizations: string[];
  readonly locations: string[];
  readonly dates: string[];
  readonly times: string[];
  readonly urls: string[];
  readonly emails: string[];
  readonly phones: string[];
  readonly money: string[];
  readonly percentages: string[];
  readonly numbers: string[];
  readonly all: Entity[];
}

/**
 * 有名なグローバル企業名（エンティティ抽出用）
 */
const KNOWN_ORGANIZATIONS = [
  // Tech giants
  'Microsoft', 'Google', 'Amazon', 'Apple', 'Meta', 'Facebook', 'Twitter', 'X Corp',
  'Netflix', 'Tesla', 'SpaceX', 'OpenAI', 'Anthropic', 'NVIDIA', 'Intel', 'AMD',
  'IBM', 'Oracle', 'Salesforce', 'Adobe', 'SAP', 'VMware', 'Cisco', 'Dell',
  'HP', 'Hewlett-Packard', 'Lenovo', 'Samsung', 'Sony', 'Panasonic', 'LG',
  // Cloud/Services
  'AWS', 'Azure', 'GCP', 'Alibaba Cloud', 'GitHub', 'GitLab', 'Atlassian',
  'Slack', 'Zoom', 'Dropbox', 'Box', 'Stripe', 'Square', 'PayPal',
  // Japanese tech companies
  'トヨタ', 'ソニー', 'パナソニック', 'NTT', 'ソフトバンク', '楽天', 'リクルート',
  'サイバーエージェント', 'DeNA', 'メルカリ', 'LINE', 'ヤフー', 'mixi',
];

/**
 * 正規表現パターン定義
 */
const PATTERNS: Record<EntityType, RegExp> = {
  // URL pattern (stops at Japanese characters, whitespace, common punctuation)
  url: /https?:\/\/[a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+/g,
  
  // Email pattern
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  
  // Japanese phone numbers
  phone: /(?:0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{4})|(?:\d{2,4}[-\s]\d{2,4}[-\s]\d{4})/g,
  
  // Japanese dates
  date: /(?:\d{4}年\d{1,2}月\d{1,2}日)|(?:\d{1,2}月\d{1,2}日)|(?:\d{4}[-/]\d{1,2}[-/]\d{1,2})/g,
  
  // Time patterns
  time: /(?:\d{1,2}:\d{2}(?::\d{2})?)|(?:\d{1,2}時\d{1,2}分(?:\d{1,2}秒)?)/g,
  
  // Money amounts
  money: /(?:[¥$€£]\s?[\d,]+(?:\.\d{2})?)|(?:[\d,]+(?:\.\d{2})?\s?(?:円|ドル|ユーロ))/g,
  
  // Percentages
  percentage: /\d+(?:\.\d+)?%/g,
  
  // Numbers with units
  number: /\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:個|件|人|台|本|枚|回|年|月|日|時間|分|秒))?/g,
  
  // Japanese organization names + Well-known global companies
  organization: new RegExp(
    `(?:株式会社|有限会社|合同会社|一般社団法人|NPO法人|独立行政法人)[^\\s、。]+|[^\\s、。]+(?:株式会社|有限会社|合同会社)|\\b(?:${KNOWN_ORGANIZATIONS.join('|')})\\b`,
    'g'
  ),
  
  // Japanese locations
  location: /(?:東京都|北海道|(?:大阪|京都|神奈川|埼玉|千葉|愛知|福岡|兵庫|広島|宮城|新潟|長野|静岡|岐阜|三重|滋賀|奈良|和歌山|岡山|山口|鳥取|島根|香川|徳島|愛媛|高知|福井|石川|富山|青森|岩手|秋田|山形|福島|茨城|栃木|群馬|山梨|長崎|熊本|大分|宮崎|鹿児島|沖縄)(?:府|県))[^\s、。]*(?:市|区|町|村)?/g,
  
  // Japanese person names (simplified pattern)
  person: /[一-龯]{1,4}(?:さん|様|氏|君|先生|教授|社長|部長|課長|係長|主任)/g,
};

/**
 * エンティティ抽出実装
 */
export class EntityExtractor {
  /**
   * テキストからエンティティを抽出（推奨API）
   * AGENTS.md/CLAUDE.md のドキュメントと一致するメソッド
   */
  async extract(text: string): Promise<ExtractedEntities> {
    const entities = this.extractEntities(text);
    
    return {
      persons: this.filterByType(entities, 'person'),
      organizations: this.filterByType(entities, 'organization'),
      locations: this.filterByType(entities, 'location'),
      dates: this.filterByType(entities, 'date'),
      times: this.filterByType(entities, 'time'),
      urls: this.filterByType(entities, 'url'),
      emails: this.filterByType(entities, 'email'),
      phones: this.filterByType(entities, 'phone'),
      money: this.filterByType(entities, 'money'),
      percentages: this.filterByType(entities, 'percentage'),
      numbers: this.filterByType(entities, 'number'),
      all: entities,
    };
  }

  /**
   * タイプでエンティティをフィルタリング
   */
  private filterByType(entities: Entity[], type: EntityType): string[] {
    return entities
      .filter(e => e.type === type)
      .map(e => e.text);
  }

  /**
   * テキストからエンティティを抽出（低レベルAPI）
   * 後方互換性のため維持
   */
  extractEntities(text: string): Entity[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const entities: Entity[] = [];
    const extractionOrder: EntityType[] = [
      'url',
      'email',
      'phone',
      'date',
      'time',
      'money',
      'percentage',
      'organization',
      'location',
      'person',
    ];

    // Track extracted ranges to avoid overlaps
    const extractedRanges: Array<{ start: number; end: number }> = [];

    for (const type of extractionOrder) {
      const pattern = PATTERNS[type];
      if (!pattern) continue;

      // Reset regex lastIndex
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;

        // Check for overlap with already extracted entities
        const overlaps = extractedRanges.some(
          range =>
            (start >= range.start && start < range.end) ||
            (end > range.start && end <= range.end) ||
            (start <= range.start && end >= range.end)
        );

        if (!overlaps) {
          entities.push({
            type,
            text: match[0],
            start,
            end,
          });
          extractedRanges.push({ start, end });
        }
      }
    }

    // Sort by position
    return entities.sort((a, b) => a.start - b.start);
  }

  /**
   * 特定のタイプのエンティティのみ抽出
   */
  extractByType(text: string, type: EntityType): Entity[] {
    const pattern = PATTERNS[type];
    if (!pattern || !text) return [];

    const entities: Entity[] = [];
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        type,
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return entities;
  }

  /**
   * エンティティを正規化
   */
  normalizeEntity(entity: Entity): Entity {
    let normalized: string | undefined;

    switch (entity.type) {
      case 'phone':
        // Remove hyphens and spaces
        normalized = entity.text.replace(/[-\s]/g, '');
        break;

      case 'date': {
        // Try to parse Japanese date format
        const jpMatch = entity.text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (jpMatch?.[1] && jpMatch?.[2] && jpMatch?.[3]) {
          normalized = `${jpMatch[1]}-${jpMatch[2].padStart(2, '0')}-${jpMatch[3].padStart(2, '0')}`;
        } else {
          // Try standard date format
          const stdMatch = entity.text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
          if (stdMatch?.[1] && stdMatch?.[2] && stdMatch?.[3]) {
            normalized = `${stdMatch[1]}-${stdMatch[2].padStart(2, '0')}-${stdMatch[3].padStart(2, '0')}`;
          }
        }
        break;
      }

      case 'money': {
        // Extract numeric value
        const numMatch = entity.text.match(/[\d,]+(?:\.\d+)?/);
        if (numMatch) {
          normalized = numMatch[0].replace(/,/g, '');
        }
        break;
      }

      case 'email':
        // Lowercase email
        normalized = entity.text.toLowerCase();
        break;

      case 'url':
        // Lowercase URL
        normalized = entity.text.toLowerCase();
        break;

      default:
        normalized = entity.text;
    }

    return {
      ...entity,
      normalized,
    };
  }

  /**
   * 重複エンティティをマージ
   */
  mergeEntities(entities: Entity[]): Entity[] {
    const merged = new Map<string, Entity & { count: number }>();

    for (const entity of entities) {
      const key = `${entity.type}:${entity.text}`;
      const existing = merged.get(key);

      if (existing) {
        existing.count++;
      } else {
        merged.set(key, { ...entity, count: 1 });
      }
    }

    return Array.from(merged.values()).sort((a, b) => b.count - a.count);
  }
}
