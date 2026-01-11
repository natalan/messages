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

    // Generate ID if missing and set it on the item
    const id = item.id || this.generateId();
    const itemToStore = { ...item, id };

    // Set created_at if missing
    if (!itemToStore.created_at) {
      itemToStore.created_at = new Date();
    }

    const key = `knowledge-item:${id}`;

    // Store the full item with ID set
    await env.KNOWLEDGE_ITEMS.put(key, JSON.stringify(itemToStore), {
      metadata: {
        source: itemToStore.source,
        content_type: itemToStore.content_type,
        property_id: itemToStore.property_id,
        booking_id: itemToStore.booking_id,
        external_thread_id: itemToStore.external_thread_id,
        created_at: itemToStore.created_at.toISOString(),
      },
    });

    // Update thread index: thread:<external_thread_id> -> ordered list of knowledge item ids
    if (itemToStore.external_thread_id) {
      const threadKey = `thread:${itemToStore.external_thread_id}`;
      const existingThread = await env.KNOWLEDGE_ITEMS.get(threadKey, "json");
      const threadIds = existingThread || [];
      if (!threadIds.includes(id)) {
        threadIds.push(id);
        // Keep items ordered by creation time (newest last)
        await env.KNOWLEDGE_ITEMS.put(threadKey, JSON.stringify(threadIds), {
          expirationTtl: 31536000, // 1 year
        });
      }
    }

    // Update booking index: booking:<booking_id> -> list of thread ids
    if (itemToStore.booking_id) {
      const bookingKey = `booking:${itemToStore.booking_id}`;
      const existingBooking = await env.KNOWLEDGE_ITEMS.get(bookingKey, "json");
      const bookingThreads = existingBooking || [];
      if (
        itemToStore.external_thread_id &&
        !bookingThreads.includes(itemToStore.external_thread_id)
      ) {
        bookingThreads.push(itemToStore.external_thread_id);
        await env.KNOWLEDGE_ITEMS.put(bookingKey, JSON.stringify(bookingThreads), {
          expirationTtl: 31536000, // 1 year
        });
      }
      // Also maintain item_ids for backwards compatibility
      const bookingItemsKey = `booking:${itemToStore.booking_id}:items`;
      const existingBookingItems = await env.KNOWLEDGE_ITEMS.get(bookingItemsKey, "json");
      const bookingItemIds = existingBookingItems || [];
      if (!bookingItemIds.includes(id)) {
        bookingItemIds.push(id);
        await env.KNOWLEDGE_ITEMS.put(bookingItemsKey, JSON.stringify(bookingItemIds), {
          expirationTtl: 31536000,
        });
      }
    }

    // Update property index: property:<property_id> -> list of item ids
    if (itemToStore.property_id) {
      const propertyKey = `property:${itemToStore.property_id}`;
      const existingProperty = await env.KNOWLEDGE_ITEMS.get(propertyKey, "json");
      const propertyItemIds = existingProperty || [];
      if (!propertyItemIds.includes(id)) {
        propertyItemIds.push(id);
        await env.KNOWLEDGE_ITEMS.put(propertyKey, JSON.stringify(propertyItemIds), {
          expirationTtl: 31536000, // 1 year
        });
      }
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

  /**
   * Get all knowledge items for a thread (ordered by creation time)
   * @param {Object} env - Environment with KV binding
   * @param {string} externalThreadId - External thread identifier
   * @returns {Promise<import("../types/knowledge-item.js").KnowledgeItem[]>} - Array of knowledge items
   */
  async getThreadItems(env, externalThreadId) {
    if (!env.KNOWLEDGE_ITEMS) {
      throw new Error("KV binding 'KNOWLEDGE_ITEMS' not found in environment");
    }

    const threadKey = `thread:${externalThreadId}`;
    const itemIds = await env.KNOWLEDGE_ITEMS.get(threadKey, "json");

    if (!itemIds || !Array.isArray(itemIds)) {
      return [];
    }

    // Fetch all items in parallel
    const items = await Promise.all(itemIds.map((id) => this.getKnowledgeItem(env, id)));

    // Filter out nulls and sort by creation time
    return items
      .filter((item) => item !== null)
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  }

  /**
   * Get all knowledge items for a booking
   * @param {Object} env - Environment with KV binding
   * @param {string} bookingId - Booking identifier
   * @returns {Promise<{threads: string[], items: import("../types/knowledge-item.js").KnowledgeItem[]}>} - Thread IDs and knowledge items
   */
  async getBookingItems(env, bookingId) {
    if (!env.KNOWLEDGE_ITEMS) {
      throw new Error("KV binding 'KNOWLEDGE_ITEMS' not found in environment");
    }

    const bookingKey = `booking:${bookingId}`;
    const threadIds = (await env.KNOWLEDGE_ITEMS.get(bookingKey, "json")) || [];

    const bookingItemsKey = `booking:${bookingId}:items`;
    const itemIds = (await env.KNOWLEDGE_ITEMS.get(bookingItemsKey, "json")) || [];

    // Fetch all items in parallel
    const items = await Promise.all(itemIds.map((id) => this.getKnowledgeItem(env, id)));

    return {
      threads: threadIds,
      items: items.filter((item) => item !== null),
    };
  }

  /**
   * Get knowledge items for a property with optional limit
   * @param {Object} env - Environment with KV binding
   * @param {string} propertyId - Property identifier
   * @param {number} limit - Maximum number of items to return (default: no limit)
   * @returns {Promise<import("../types/knowledge-item.js").KnowledgeItem[]>} - Array of knowledge items
   */
  async getPropertyItems(env, propertyId, limit = null) {
    if (!env.KNOWLEDGE_ITEMS) {
      throw new Error("KV binding 'KNOWLEDGE_ITEMS' not found in environment");
    }

    const propertyKey = `property:${propertyId}`;
    const itemIds = await env.KNOWLEDGE_ITEMS.get(propertyKey, "json");

    if (!itemIds || !Array.isArray(itemIds)) {
      return [];
    }

    // Apply limit if specified
    const idsToFetch = limit ? itemIds.slice(-limit) : itemIds;

    // Fetch items in parallel
    const items = await Promise.all(idsToFetch.map((id) => this.getKnowledgeItem(env, id)));

    // Filter out nulls and sort by creation time (newest first)
    return items
      .filter((item) => item !== null)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  /**
   * Store property context text
   * @param {Object} env - Environment with KV binding
   * @param {string} propertyId - Property identifier
   * @param {string} contextText - Property context text
   * @returns {Promise<void>}
   */
  async storePropertyContext(env, propertyId, contextText) {
    if (!env.KNOWLEDGE_ITEMS) {
      throw new Error("KV binding 'KNOWLEDGE_ITEMS' not found in environment");
    }

    const contextKey = `property:${propertyId}:context`;
    await env.KNOWLEDGE_ITEMS.put(contextKey, contextText, {
      expirationTtl: 31536000, // 1 year
    });
  }

  /**
   * Get property context text
   * @param {Object} env - Environment with KV binding
   * @param {string} propertyId - Property identifier
   * @returns {Promise<string|null>} - Property context text or null
   */
  async getPropertyContext(env, propertyId) {
    if (!env.KNOWLEDGE_ITEMS) {
      throw new Error("KV binding 'KNOWLEDGE_ITEMS' not found in environment");
    }

    const contextKey = `property:${propertyId}:context`;
    return await env.KNOWLEDGE_ITEMS.get(contextKey, "text");
  }
}
