/**
 * TopicModeler - トピックモデリング
 *
 * @requirement REQ-ANALYZE-010
 * @design DES-KATASHIRO-001 §2.2 Analyzer Container
 * @task TSK-024
 */

/**
 * トピック
 */
export interface Topic {
  readonly id: string;
  readonly name: string;
  readonly keywords: string[];
  readonly confidence: number;
}

/**
 * トピック分布
 */
export interface TopicDistribution {
  readonly topics: Array<{
    readonly topic: Topic;
    readonly weight: number;
  }>;
}

/**
 * 類似文書
 */
export interface SimilarDocument {
  readonly index: number;
  readonly text: string;
  readonly similarity: number;
}

/**
 * 文書クラスタ
 */
export interface DocumentCluster {
  readonly id: number;
  readonly documents: string[];
  readonly centroid: string[];
}

/**
 * 日本語ストップワード
 */
const JAPANESE_STOPWORDS = new Set([
  'の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し', 'れ', 'さ',
  'ある', 'いる', 'も', 'な', 'する', 'から', 'こと', 'として', 'い', 'や',
  'など', 'なっ', 'ない', 'この', 'ため', 'その', 'あっ', 'よう', 'また',
  'もの', 'という', 'あり', 'まで', 'られ', 'なる', 'へ', 'か', 'だ', 'これ',
  'によって', 'により', 'おり', 'より', 'による', 'ず', 'なり', 'られる',
  'です', 'ます', 'した', 'して', 'です', 'ました',
]);

/**
 * 英語ストップワード
 */
const ENGLISH_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'this', 'that', 'these', 'those', 'it', 'its',
]);

/**
 * トピックモデリング実装
 */
export class TopicModeler {
  /**
   * 複数文書からトピックをモデリング（簡易API）
   * @param documents 文書の配列または単一のテキスト
   * @param options オプション（numTopics）
   */
  model(
    documents: string | string[],
    options?: { numTopics?: number }
  ): Topic[] {
    const numTopics = options?.numTopics ?? 5;
    const texts = Array.isArray(documents) ? documents : [documents];
    const combined = texts.join('\n\n');
    return this.extractTopics(combined, numTopics);
  }

  /**
   * 文書からトピックを抽出
   */
  extractTopics(textOrDocuments: string | string[], numTopics: number = 3): Topic[] {
    // 配列の場合は結合
    const text = Array.isArray(textOrDocuments)
      ? textOrDocuments.join('\n\n')
      : textOrDocuments;
    
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return [];
    }

    // Tokenize and get term frequencies
    const tokens = this.tokenize(text);
    const termFreq = this.calculateTermFrequency(tokens);
    
    // Sort by frequency and get top terms
    const sortedTerms = Array.from(termFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, numTopics * 5);

    // Group into topics
    const topics: Topic[] = [];
    const termsPerTopic = Math.ceil(sortedTerms.length / numTopics);

    for (let i = 0; i < numTopics && i * termsPerTopic < sortedTerms.length; i++) {
      const topicTerms = sortedTerms.slice(i * termsPerTopic, (i + 1) * termsPerTopic);
      if (topicTerms.length === 0) continue;

      const keywords = topicTerms.map(t => t[0]);
      const avgFreq = topicTerms.reduce((sum, t) => sum + t[1], 0) / topicTerms.length;
      const maxFreq = Math.max(...Array.from(termFreq.values()));

      topics.push({
        id: `topic-${i + 1}`,
        name: keywords[0] ?? `Topic ${i + 1}`,
        keywords,
        confidence: maxFreq > 0 ? Math.min(avgFreq / maxFreq + 0.3, 1) : 0.5,
      });
    }

    return topics;
  }

  /**
   * TF-IDF計算
   */
  calculateTfIdf(documents: string[]): Record<string, number> {
    if (documents.length === 0) {
      return {};
    }

    // Tokenize all documents
    const tokenizedDocs = documents.map(doc => this.tokenize(doc));
    
    // Calculate document frequency
    const docFreq = new Map<string, number>();
    for (const tokens of tokenizedDocs) {
      const uniqueTokens = new Set(tokens);
      for (const token of uniqueTokens) {
        docFreq.set(token, (docFreq.get(token) ?? 0) + 1);
      }
    }

    // Calculate TF-IDF for each term
    const tfidf: Record<string, number> = {};
    const numDocs = documents.length;

    for (const tokens of tokenizedDocs) {
      const termFreq = this.calculateTermFrequency(tokens);
      const maxFreq = Math.max(...Array.from(termFreq.values()), 1);

      for (const [term, freq] of termFreq) {
        const tf = freq / maxFreq;
        const df = docFreq.get(term) ?? 1;
        const idf = Math.log((numDocs + 1) / (df + 1)) + 1;
        
        const score = tf * idf;
        if (!tfidf[term] || score > tfidf[term]) {
          tfidf[term] = score;
        }
      }
    }

    return tfidf;
  }

  /**
   * 文書クラスタリング
   */
  clusterDocuments(documents: string[], numClusters: number): DocumentCluster[] {
    if (documents.length === 0) {
      return [];
    }

    if (documents.length <= numClusters) {
      return documents.map((doc, i) => ({
        id: i,
        documents: [doc],
        centroid: this.tokenize(doc).slice(0, 5),
      }));
    }

    // Simple clustering based on term overlap
    const tokenizedDocs = documents.map(doc => new Set(this.tokenize(doc)));
    const clusters: DocumentCluster[] = [];
    const assigned = new Set<number>();

    for (let c = 0; c < numClusters && assigned.size < documents.length; c++) {
      // Find unassigned document as seed
      let seedIdx = -1;
      for (let i = 0; i < documents.length; i++) {
        if (!assigned.has(i)) {
          seedIdx = i;
          break;
        }
      }
      if (seedIdx === -1) break;

      const clusterDocs: string[] = [];
      const clusterIndices: number[] = [];
      const seedTokens = tokenizedDocs[seedIdx];
      if (!seedTokens) continue;

      // Find similar documents
      for (let i = 0; i < documents.length; i++) {
        if (assigned.has(i)) continue;

        const docTokens = tokenizedDocs[i];
        if (!docTokens) continue;

        const similarity = this.jaccardSimilarity(seedTokens, docTokens);
        
        if (similarity > 0.1 || i === seedIdx) {
          const doc = documents[i];
          if (doc) {
            clusterDocs.push(doc);
            clusterIndices.push(i);
            assigned.add(i);
          }
        }
      }

      if (clusterDocs.length > 0) {
        // Calculate centroid (most common terms)
        const termCounts = new Map<string, number>();
        for (const idx of clusterIndices) {
          const tokens = tokenizedDocs[idx];
          if (tokens) {
            for (const token of tokens) {
              termCounts.set(token, (termCounts.get(token) ?? 0) + 1);
            }
          }
        }
        const centroid = Array.from(termCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(e => e[0]);

        clusters.push({
          id: c,
          documents: clusterDocs,
          centroid,
        });
      }
    }

    return clusters;
  }

  /**
   * 類似文書検索
   */
  findSimilarDocuments(
    query: string,
    corpus: string[],
    topK: number = 5
  ): SimilarDocument[] {
    if (corpus.length === 0) {
      return [];
    }

    const queryTokens = new Set(this.tokenize(query));
    const similarities: SimilarDocument[] = [];

    for (let i = 0; i < corpus.length; i++) {
      const doc = corpus[i];
      if (!doc) continue;

      const docTokens = new Set(this.tokenize(doc));
      const similarity = this.jaccardSimilarity(queryTokens, docTokens);

      similarities.push({
        index: i,
        text: doc,
        similarity,
      });
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * トピック分布取得
   */
  getTopicDistribution(text: string): TopicDistribution {
    const topics = this.extractTopics(text, 3);
    
    if (topics.length === 0) {
      return { topics: [] };
    }

    // Normalize weights to sum to 1
    const totalConfidence = topics.reduce((sum, t) => sum + t.confidence, 0);
    
    return {
      topics: topics.map(topic => ({
        topic,
        weight: totalConfidence > 0 ? topic.confidence / totalConfidence : 1 / topics.length,
      })),
    };
  }

  /**
   * テキストをトークン化
   */
  private tokenize(text: string): string[] {
    // Simple tokenization: split by non-word characters
    const tokens = text
      .toLowerCase()
      .split(/[\s\p{P}]+/u)
      .filter(token => {
        if (token.length < 2) return false;
        if (JAPANESE_STOPWORDS.has(token)) return false;
        if (ENGLISH_STOPWORDS.has(token)) return false;
        if (/^\d+$/.test(token)) return false;
        return true;
      });

    return tokens;
  }

  /**
   * 単語頻度計算
   */
  private calculateTermFrequency(tokens: string[]): Map<string, number> {
    const freq = new Map<string, number>();
    for (const token of tokens) {
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }
    return freq;
  }

  /**
   * Jaccard類似度計算
   */
  private jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
    if (set1.size === 0 && set2.size === 0) return 1;
    if (set1.size === 0 || set2.size === 0) return 0;

    let intersection = 0;
    for (const item of set1) {
      if (set2.has(item)) {
        intersection++;
      }
    }

    const union = set1.size + set2.size - intersection;
    return union > 0 ? intersection / union : 0;
  }
}
