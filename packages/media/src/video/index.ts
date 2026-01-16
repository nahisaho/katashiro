/**
 * Video module exports
 *
 * @task TASK-012-5
 */

export { VideoGenerator } from './VideoGenerator.js';
export type { VideoGeneratorConfig } from './VideoGenerator.js';

export {
  BaseVideoProvider,
  type VideoProviderInterface,
  type VideoProviderConfig,
  type VideoJobStatus,
} from './VideoProviderInterface.js';

export { RunwayProvider } from './providers/RunwayProvider.js';
export type {
  RunwayProviderConfig,
  RunwayModel,
} from './providers/RunwayProvider.js';

export { PikaProvider } from './providers/PikaProvider.js';
export type {
  PikaProviderConfig,
  PikaModel,
} from './providers/PikaProvider.js';
