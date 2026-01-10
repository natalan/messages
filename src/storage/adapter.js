/**
 * Storage adapter interface
 * Abstracts storage implementation (KV, D1, etc.)
 */

/**
 * Storage adapter interface
 * @interface StorageAdapter
 */
export class StorageAdapter {
  /**
   * Store a knowledge item
   * @param {Object} _env - Environment with storage bindings
   * @param {import("../types/knowledge-item.js").KnowledgeItem} _item - Knowledge item to store
   * @returns {Promise<string>} - Stored item ID
   */
  async storeKnowledgeItem(_env, _item) {
    throw new Error("Not implemented");
  }

  /**
   * Retrieve a knowledge item by ID
   * @param {Object} _env - Environment with storage bindings
   * @param {string} _id - Knowledge item ID
   * @returns {Promise<import("../types/knowledge-item.js").KnowledgeItem|null>} - Knowledge item or null
   */
  async getKnowledgeItem(_env, _id) {
    throw new Error("Not implemented");
  }

  /**
   * List knowledge items with optional filters
   * @param {Object} _env - Environment with storage bindings
   * @param {Object} _filters - Filter options (property_id, booking_id, source, etc.)
   * @returns {Promise<import("../types/knowledge-item.js").KnowledgeItem[]>} - Array of knowledge items
   */
  async listKnowledgeItems(_env, _filters = {}) {
    throw new Error("Not implemented");
  }
}
