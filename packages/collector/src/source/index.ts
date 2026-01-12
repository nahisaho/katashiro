/**
 * Source tracking and credibility scoring
 * @since 0.2.0
 * @requirement REQ-COLLECT-007-ENH
 * @design DES-KATASHIRO-002 §4.6 ソース追跡強化
 */

export {
  SourceTracker,
  type TrackedSource,
  type SourceMetadata,
} from './source-tracker.js';

export {
  CredibilityScorer,
  type CredibilityFactors,
  type CredibilityScore,
} from './credibility-scorer.js';
