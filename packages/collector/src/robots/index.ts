/**
 * robots.txt モジュール
 *
 * @module robots
 * @requirement REQ-DR-W-003
 */

export {
  RobotsConfigSchema,
  DEFAULT_ROBOTS_CONFIG,
  type RobotsConfig,
  type RobotsRule,
  type ParsedRobotsTxt,
  type RobotsCacheEntry,
  type RobotsCheckResult,
} from './types.js';

export { RobotsParser } from './robots-parser.js';
