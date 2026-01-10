/**
 * Thread routes handler
 */

import { KVStorageAdapter } from "../storage/index.js";
import { sanitizeForLogging } from "../services/validation.js";

const storageAdapter = new KVStorageAdapter();

/**
 * Handle GET /threads/:external_thread_id
 * Retrieve all knowledge items for a thread
 * @param {Request} req - HTTP request
 * @param {Object} env - Environment variables
 * @param {string} externalThreadId - External thread identifier from URL
 * @returns {Promise<Response>} - HTTP response
 */
export async function handleThread(req, env, externalThreadId) {
  const startTime = Date.now();

  try {
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }

    const items = await storageAdapter.getThreadItems(env, externalThreadId);

    // Sanitize items for response (redact PII)
    const sanitizedItems = items.map((item) => {
      const sanitized = { ...item };
      // Keep structure but sanitize sensitive fields in normalized content
      if (sanitized.normalized) {
        sanitized.normalized = sanitizeForLogging(sanitized.normalized);
      }
      // Redact raw_payload entirely
      if (sanitized.raw_payload) {
        sanitized.raw_payload = "[REDACTED]";
      }
      return sanitized;
    });

    console.log(`[${new Date().toISOString()}] Thread retrieved`, {
      external_thread_id: externalThreadId,
      item_count: items.length,
      processingTime: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({
        external_thread_id: externalThreadId,
        items: sanitizedItems,
        count: sanitizedItems.length,
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error retrieving thread`, {
      external_thread_id: externalThreadId,
      error: error.message,
      stack: error.stack,
      processingTime: Date.now() - startTime,
    });

    return new Response(JSON.stringify({ error: "Failed to retrieve thread" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
