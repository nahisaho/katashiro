/**
 * Platform-specific generators
 * @since 0.2.0
 * @requirement REQ-GENERATE-008-NEW, REQ-GENERATE-009-NEW, REQ-GENERATE-010-NEW
 * @design DES-KATASHIRO-002 §4.3, §4.4, §4.5
 */

export {
  QiitaGenerator,
  type QiitaArticleOptions,
  type QiitaArticle,
} from './qiita.js';

export {
  ZennGenerator,
  type ZennArticleOptions,
  type ZennArticle,
  type ZennBookOptions,
  type ZennBook,
  type ZennBookChapter,
} from './zenn.js';

export {
  NoteGenerator,
  type NoteArticleOptions,
  type NoteArticle,
} from './note.js';
