/**
 * @nahisaho/katashiro-knowledge
 * 知識管理・LLMパッケージ
 *
 * @requirement REQ-NFR-005, REQ-COLLECT-007, REQ-ANALYZE-007
 * @design DES-KATASHIRO-001 §2.2 Knowledge Container
 */

export type {
  ILLMProvider,
  ISourceTracker,
  IYATAClient,
} from './interfaces.js';

export type {
  LLMConfig,
  LLMResponse,
  LLMProvider,
  TrackedSource,
  KnowledgeEntity,
} from './types.js';

// Graph module
export {
  KnowledgeGraph,
  type GraphNode,
  type GraphNodeInput,
  type GraphEdge,
  type GraphEdgeInput,
  type AddNodeOptions,
  type AddEdgeOptions,
  DuplicateNodeError,
} from './graph/index.js';

// Persistence module
export {
  GraphPersistence,
  type SerializedGraph,
  type GraphMetadata,
  type GraphDiff,
} from './persistence/index.js';

// Query module
export {
  GraphQuery,
  type QueryFilter,
  type GraphQueryDef,
  type QueryResult,
} from './query/index.js';

// Visualization module
export {
  GraphVisualization,
  type VisualizationConfig,
  type D3GraphData,
  type CytoscapeData,
  type GraphStats,
} from './visualization/index.js';

// Sync module
export {
  GraphSync,
  type SyncOptions,
  type SyncResult,
  type ComparisonResult,
  type Conflict,
} from './sync/index.js';
