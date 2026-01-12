/**
 * FactChecker モジュールエクスポート
 *
 * @requirement REQ-ANALYZE-006
 * @design DES-ANALYZE-006-FactChecker
 */

export {
  FactChecker,
  type FactCheckError,
  type FactCheckErrorCode,
} from './FactChecker.js';

export { ClaimParser } from './ClaimParser.js';
export { TrustedSourceRegistry } from './TrustedSourceRegistry.js';
export {
  EvidenceCollector,
  type SearchClient,
  type Scraper,
  type SearchResultItem,
  type ScrapedPage,
  type EvidenceCollectorConfig,
} from './EvidenceCollector.js';
export {
  ConsistencyChecker,
  type ConsistencyResult,
} from './ConsistencyChecker.js';
export { VerdictGenerator } from './VerdictGenerator.js';

export type {
  VerificationSourceType,
  VerdictLabel,
  EvidenceRelation,
  StrictnessLevel,
  FactCheckRequest,
  Verdict,
  Evidence,
  VerificationDetails,
  Reference,
  ExistingFactCheck,
  FactCheckMetadata,
  FactCheckResultDetail,
  QuickCheckResult,
  ExtractedClaim,
  ClaimType,
  ClaimVerification,
  TrustedSourceConfig,
  VerdictInput,
  FactCheckerConfig,
} from './types.js';

export { DEFAULT_FACTCHECKER_CONFIG } from './types.js';
