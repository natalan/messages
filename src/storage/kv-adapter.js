/**
 * Cloudflare KV storage adapter implementation
 */

import { StorageAdapter } from "./adapter.js";

export class KVStorageAdapter extends StorageAdapter {
  /**
   * Generate a unique ID for a knowledge item
   * @returns {string}
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Store a knowledge item in KV
   * @param {Object} env - Environment with KV binding
   * @param {import("../types/knowledge-item.js").KnowledgeItem} item - Knowledge item to store
   * @returns {Promise<string>} - Stored item ID
   */
  async storeKnowledgeItem(env, item) {
    if (!env.KNOWLEDGE_ITEMS) {
      throw new Error("KV binding 'KNOWLEDGE_ITEMS' not found in environment");
    }

    const id = item.id || this.generateId();
    const key = `knowledge-item:${id}`;

    // Store the full item
    await env.KNOWLEDGE_ITEMS.put(key, JSON.stringify(item), {
      metadata: {
        source: item.source,
        content_type: item.content_type,
        property_id: item.property_id,
        booking_id: item.booking_id,
        created_at: item.created_at.toISOString(),
      },
    });

    // Store index entries for quick lookups
    if (item.property_id) {
      await env.KNOWLEDGE_ITEMS.put(
        `index:property:${item.property_id}:${id}`,
        id,
        { expirationTtl: 31536000 } // 1 year
      );
    }

    if (item.booking_id) {
      await env.KNOWLEDGE_ITEMS.put(
        `index:booking:${item.booking_id}:${id}`,
        id,
        { expirationTtl: 31536000 } // 1 year
      );
    }

    if (item.external_thread_id) {
      await env.KNOWLEDGE_ITEMS.put(
        `index:thread:${item.external_thread_id}`,
        id,
        { expirationTtl: 31536000 } // 1 year
      );
    }

    return id;
  }

  /**
   * Retrieve a knowledge item by ID
   * @param {Object} env - Environment with KV binding
   * @param {string} id - Knowledge item ID
   * @returns {Promise<import("../types/knowledge-item.js").KnowledgeItem|null>} - Knowledge item or null
   */
  async getKnowledgeItem(env, id) {
    if (!env.KNOWLEDGE_ITEMS) {
      throw new Error("KV binding 'KNOWLEDGE_ITEMS' not found in environment");
    }

    const key = `knowledge-item:${id}`;
    const value = await env.KNOWLEDGE_ITEMS.get(key, "json");

    if (!value) {
      return null;
    }

    // Convert created_at string back to Date
    return {
      ...value,
      created_at: new Date(value.created_at),
    };
  }

  /**
   * List knowledge items with optional filters
   * Note: KV doesn't support complex queries, so this is a simplified implementation
   * @param {Object} env - Environment with KV binding
   * @param {Object} _filters - Filter options
   * @returns {Promise<import("../types/knowledge-item.js").KnowledgeItem[]>} - Array of knowledge items
   */
  async listKnowledgeItems(env, _filters = {}) {
    if (!env.KNOWLEDGE_ITEMS) {
      throw new Error("KV binding 'KNOWLEDGE_ITEMS' not found in environment");
    }

    // For KV, we can't efficiently list all items
    // This would require maintaining a separate index list
    // For MVP, we'll return empty array and note that full listing requires D1
    console.warn(
      "KV adapter: listKnowledgeItems with filters not fully implemented. Use getKnowledgeItem with specific IDs or migrate to D1 for full query support."
    );

    return [];
  }
}
