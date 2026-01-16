/**
 * Cache exports
 *
 * @module cache
 * @requirement REQ-DR-E-005 キャッシュヒット時の高速応答
 * @requirement REQ-DR-S-003 キャッシュサイズ管理
 */

// 型定義
export {
  type CacheMetadata,
  type CacheEntry,
  type LRUCacheConfig,
  type CacheStatistics,
  type CacheKeyGeneratorConfig,
  type CacheManagerConfig,
  type CacheEvent,
  type CacheEventListener,
  type PersistedCacheData,
  CacheMetadataSchema,
  CacheEntrySchema,
  LRUCacheConfigSchema,
  CacheStatisticsSchema,
  CacheKeyGeneratorConfigSchema,
  CacheManagerConfigSchema,
  PersistedCacheDataSchema,
  DEFAULT_LRU_CACHE_CONFIG,
  DEFAULT_CACHE_KEY_GENERATOR_CONFIG,
  DEFAULT_CACHE_MANAGER_CONFIG,
  createInitialStatistics,
} from './types.js';

// LRUCache
export { LRUCache } from './lru-cache.js';

// CacheKeyGenerator
export { CacheKeyGenerator } from './cache-key-generator.js';

// TTLManager
export {
  TTLManager,
  type TtlPattern,
  type TtlResult,
  TTL_PRESETS,
  RECOMMENDED_PATTERNS,
} from './ttl-manager.js';

// CachePersistence
export {
  CachePersistence,
  BackupCachePersistence,
  type CachePersistenceOptions,
  type PersistenceResult,
} from './cache-persistence.js';

// CacheManager
export {
  CacheManager,
  type CacheGetResult,
  type CacheSetOptions,
  type RevalidateCallback,
} from './cache-manager.js';

// SearchCache (既存)
export { SearchCache, type SearchCacheOptions } from './search-cache.js';
