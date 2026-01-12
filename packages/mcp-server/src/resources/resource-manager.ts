/**
 * ResourceManager - リソース管理
 *
 * MCPリソースの登録・読み取り・購読を管理
 *
 * @module @nahisaho/katashiro-mcp-server
 * @task TSK-063
 */

import { ok, err, type Result } from '@nahisaho/katashiro-core';

/**
 * Resource content
 */
export interface ResourceContent {
  content: string;
  mimeType?: string;
}

/**
 * Content provider function
 */
export type ContentProvider = () => Promise<ResourceContent>;

/**
 * Resource definition
 */
export interface ResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  content?: string;
  provider?: ContentProvider;
}

/**
 * Resource template
 */
export interface ResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * Subscription callback
 */
export type SubscriptionCallback = (uri: string, content: string) => void;

/**
 * List options
 */
export interface ListOptions {
  prefix?: string;
}

/**
 * ResourceManager
 *
 * Manages MCP resources and subscriptions
 */
export class ResourceManager {
  private resources: Map<string, ResourceDefinition> = new Map();
  private subscriptions: Map<string, Map<string, SubscriptionCallback>> = new Map();
  private subscriptionCounter = 0;

  /**
   * Register a resource
   *
   * @param resource - Resource to register
   * @returns Result
   */
  register(resource: ResourceDefinition): Result<void, Error> {
    try {
      if (this.resources.has(resource.uri)) {
        return err(new Error(`Resource already registered: ${resource.uri}`));
      }
      this.resources.set(resource.uri, resource);
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * List all resources
   *
   * @param options - List options
   * @returns Array of resources
   */
  list(options: ListOptions = {}): Result<ResourceDefinition[], Error> {
    try {
      let resources = Array.from(this.resources.values());

      if (options.prefix) {
        resources = resources.filter((r) => r.uri.startsWith(options.prefix!));
      }

      return ok(resources);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Read a resource
   *
   * @param uri - Resource URI
   * @returns Resource content
   */
  async read(uri: string): Promise<Result<ResourceContent, Error>> {
    try {
      const resource = this.resources.get(uri);
      if (!resource) {
        return err(new Error(`Resource not found: ${uri}`));
      }

      // Use provider if available
      if (resource.provider) {
        const content = await resource.provider();
        return ok(content);
      }

      // Return static content
      return ok({
        content: resource.content ?? '',
        mimeType: resource.mimeType,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Subscribe to resource changes
   *
   * @param uri - Resource URI
   * @param callback - Callback function
   * @returns Subscription ID
   */
  subscribe(uri: string, callback: SubscriptionCallback): Result<string, Error> {
    try {
      if (!this.resources.has(uri)) {
        return err(new Error(`Resource not found: ${uri}`));
      }

      if (!this.subscriptions.has(uri)) {
        this.subscriptions.set(uri, new Map());
      }

      const subId = `sub-${++this.subscriptionCounter}`;
      this.subscriptions.get(uri)!.set(subId, callback);

      return ok(subId);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Unsubscribe from resource changes
   *
   * @param subscriptionId - Subscription ID
   * @returns Whether unsubscribed
   */
  unsubscribe(subscriptionId: string): Result<boolean, Error> {
    try {
      for (const subs of this.subscriptions.values()) {
        if (subs.has(subscriptionId)) {
          subs.delete(subscriptionId);
          return ok(true);
        }
      }
      return ok(false);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Update resource content and notify subscribers
   *
   * @param uri - Resource URI
   * @param content - New content
   * @returns Result
   */
  async update(uri: string, content: string): Promise<Result<void, Error>> {
    try {
      const resource = this.resources.get(uri);
      if (!resource) {
        return err(new Error(`Resource not found: ${uri}`));
      }

      // Update content
      resource.content = content;
      this.resources.set(uri, resource);

      // Notify subscribers
      const subs = this.subscriptions.get(uri);
      if (subs) {
        for (const callback of subs.values()) {
          callback(uri, content);
        }
      }

      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * List resource templates
   *
   * @returns Array of templates
   */
  listTemplates(): Result<ResourceTemplate[], Error> {
    try {
      // Built-in templates
      const templates: ResourceTemplate[] = [
        {
          uriTemplate: 'katashiro://knowledge/{topic}',
          name: 'Knowledge Topic',
          description: 'Access knowledge graph by topic',
          mimeType: 'application/json',
        },
        {
          uriTemplate: 'katashiro://patterns/{type}',
          name: 'Pattern Type',
          description: 'Access patterns by type',
          mimeType: 'application/json',
        },
      ];

      return ok(templates);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Unregister a resource
   *
   * @param uri - Resource URI
   * @returns Whether unregistered
   */
  unregister(uri: string): Result<boolean, Error> {
    try {
      this.subscriptions.delete(uri);
      return ok(this.resources.delete(uri));
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Clear all resources
   */
  clear(): void {
    this.resources.clear();
    this.subscriptions.clear();
  }
}
