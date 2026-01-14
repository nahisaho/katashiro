/**
 * Dataset Manager
 *
 * @requirement REQ-EVAL-004
 * @design DES-KATASHIRO-003-EVAL §3.4
 */

import type { Dataset, DatasetItem } from './types.js';

/**
 * データセット管理クラス
 */
export class DatasetManager {
  private datasets: Map<string, Dataset> = new Map();
  private items: Map<string, DatasetItem[]> = new Map();

  /**
   * データセット作成
   */
  create(
    name: string,
    options?: {
      description?: string;
      tags?: string[];
    }
  ): Dataset {
    const id = `ds-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();

    const dataset: Dataset = {
      id,
      name,
      description: options?.description,
      size: 0,
      tags: options?.tags,
      createdAt: now,
      updatedAt: now,
    };

    this.datasets.set(id, dataset);
    this.items.set(id, []);

    return dataset;
  }

  /**
   * データセット取得
   */
  get(id: string): Dataset | undefined {
    return this.datasets.get(id);
  }

  /**
   * データセット一覧取得
   */
  list(filter?: { tags?: string[] }): Dataset[] {
    const datasets = Array.from(this.datasets.values());

    if (filter?.tags && filter.tags.length > 0) {
      return datasets.filter(
        (ds) =>
          ds.tags && filter.tags!.some((tag) => ds.tags!.includes(tag))
      );
    }

    return datasets;
  }

  /**
   * データセット削除
   */
  delete(id: string): boolean {
    this.items.delete(id);
    return this.datasets.delete(id);
  }

  /**
   * アイテム追加
   */
  addItem(
    datasetId: string,
    item: Omit<DatasetItem, 'id'>
  ): DatasetItem | undefined {
    const dataset = this.datasets.get(datasetId);
    const datasetItems = this.items.get(datasetId);

    if (!dataset || !datasetItems) {
      return undefined;
    }

    const newItem: DatasetItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ...item,
    };

    datasetItems.push(newItem);
    dataset.size = datasetItems.length;
    dataset.updatedAt = new Date().toISOString();

    return newItem;
  }

  /**
   * 複数アイテム追加
   */
  addItems(
    datasetId: string,
    items: Array<Omit<DatasetItem, 'id'>>
  ): DatasetItem[] {
    return items
      .map((item) => this.addItem(datasetId, item))
      .filter((item): item is DatasetItem => item !== undefined);
  }

  /**
   * アイテム取得
   */
  getItems(datasetId: string): DatasetItem[] {
    return this.items.get(datasetId) ?? [];
  }

  /**
   * アイテム削除
   */
  removeItem(datasetId: string, itemId: string): boolean {
    const dataset = this.datasets.get(datasetId);
    const datasetItems = this.items.get(datasetId);

    if (!dataset || !datasetItems) {
      return false;
    }

    const idx = datasetItems.findIndex((item) => item.id === itemId);
    if (idx >= 0) {
      datasetItems.splice(idx, 1);
      dataset.size = datasetItems.length;
      dataset.updatedAt = new Date().toISOString();
      return true;
    }

    return false;
  }

  /**
   * データセットをJSONにエクスポート
   */
  export(datasetId: string): string | undefined {
    const dataset = this.datasets.get(datasetId);
    const items = this.items.get(datasetId);

    if (!dataset || !items) {
      return undefined;
    }

    return JSON.stringify({ dataset, items }, null, 2);
  }

  /**
   * JSONからデータセットをインポート
   */
  import(json: string): Dataset | undefined {
    try {
      const { dataset, items } = JSON.parse(json) as {
        dataset: Dataset;
        items: DatasetItem[];
      };

      // 新しいIDを生成
      const newId = `ds-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const now = new Date().toISOString();

      const newDataset: Dataset = {
        ...dataset,
        id: newId,
        createdAt: now,
        updatedAt: now,
      };

      const newItems = items.map((item) => ({
        ...item,
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }));

      this.datasets.set(newId, newDataset);
      this.items.set(newId, newItems);

      return newDataset;
    } catch {
      return undefined;
    }
  }
}

// シングルトン
let datasetManager: DatasetManager | null = null;

/**
 * グローバルデータセットマネージャー取得
 */
export function getDatasetManager(): DatasetManager {
  if (!datasetManager) {
    datasetManager = new DatasetManager();
  }
  return datasetManager;
}

/**
 * データセットマネージャーリセット（テスト用）
 */
export function resetDatasetManager(): void {
  datasetManager = null;
}
