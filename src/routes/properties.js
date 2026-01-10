/**
 * Property routes handler
 */

import { KVStorageAdapter } from "../storage/index.js";

const storageAdapter = new KVStorageAdapter();

/**
 * Handle POST /properties/:property_id/context
 * Store property context text for use in reply suggestions
 * @param {Request} req - HTTP request
 * @param {Object} env - Environment variables
 * @param {string} propertyId - Property identifier from URL
 * @returns {Promise<Response>} - HTTP response
 */
export async function handlePropertyContext(req, env, propertyId) {
  const startTime = Date.now();

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }

    const body = await req.json();

    if (!body.context || typeof body.context !== "string") {
      return new Response(JSON.stringify({ error: "Missing or invalid 'context' field" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    await storageAdapter.storePropertyContext(env, propertyId, body.context);

    console.log(`[${new Date().toISOString()}] Property context stored`, {
      property_id: propertyId,
      context_length: body.context.length,
      processingTime: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({
        status: "stored",
        property_id: propertyId,
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error storing property context`, {
      property_id: propertyId,
      error: error.message,
      stack: error.stack,
      processingTime: Date.now() - startTime,
    });

    return new Response(JSON.stringify({ error: "Failed to store property context" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

/**
 * Handle GET /properties/:property_id/knowledge
 * Retrieve knowledge items for a property
 * @param {Request} req - HTTP request
 * @param {Object} env - Environment variables
 * @param {string} propertyId - Property identifier from URL
 * @returns {Promise<Response>} - HTTP response
 */
export async function handlePropertyKnowledge(req, env, propertyId) {
  const startTime = Date.now();

  try {
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : null;

    if (limitParam && (isNaN(limit) || limit < 1)) {
      return new Response(JSON.stringify({ error: "Invalid limit parameter" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const items = await storageAdapter.getPropertyItems(env, propertyId, limit);

    console.log(`[${new Date().toISOString()}] Property knowledge retrieved`, {
      property_id: propertyId,
      item_count: items.length,
      limit,
      processingTime: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({
        property_id: propertyId,
        items,
        count: items.length,
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error retrieving property knowledge`, {
      property_id: propertyId,
      error: error.message,
      stack: error.stack,
      processingTime: Date.now() - startTime,
    });

    return new Response(JSON.stringify({ error: "Failed to retrieve property knowledge" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
