/**
 * Webhook routes handler
 */

import { validateWebhookPayload, sanitizeForLogging } from "../services/validation.js";
import { normalizeWebhookPayload } from "../services/normalize.js";
import { KVStorageAdapter } from "../storage/index.js";
import { suggestReply } from "../services/suggest-reply.js";
import { sendHostNotification } from "../services/email-delivery.js";
import { SOURCE_TYPES } from "../types/schema.js";

const storageAdapter = new KVStorageAdapter();

/**
 * Handle POST /webhooks/email
 * @param {Request} req - HTTP request
 * @param {Object} env - Environment variables
 * @returns {Promise<Response>} - HTTP response
 */
export async function handleWebhookEmail(req, env) {
  const startTime = Date.now();

  try {
    // Parse and validate payload
    const payload = await req.json();

    // Validate payload structure
    const validation = validateWebhookPayload(payload);
    if (!validation.valid) {
      console.warn(`[${new Date().toISOString()}] Invalid webhook payload`, {
        error: validation.error,
        processingTime: Date.now() - startTime,
      });
      return new Response(JSON.stringify({ error: "Invalid payload", details: validation.error }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // Log incoming webhook (sanitized)
    const sanitizedPayload = sanitizeForLogging(payload);
    console.log(`[${new Date().toISOString()}] Inbound email webhook received`, {
      source: payload.source || SOURCE_TYPES.GMAIL_WEBHOOK,
      threadId: payload.threadId,
      messageCount: payload.messages?.length || 0,
      processingTime: Date.now() - startTime,
      payload: sanitizedPayload,
    });

    // Extract property_id and booking_id from payload (if available)
    // These might come from label parsing or metadata in future
    const property_id = payload.property_id || null;
    const booking_id = payload.booking_id || null;
    const source = payload.source || SOURCE_TYPES.GMAIL_WEBHOOK;

    // Step 1: Normalize payload into knowledge item
    const knowledgeItem = normalizeWebhookPayload(payload, source, property_id, booking_id);

    // Step 2: Store knowledge item
    let storedId;
    try {
      storedId = await storageAdapter.storeKnowledgeItem(env, knowledgeItem);
      knowledgeItem.id = storedId;

      console.log(`[${new Date().toISOString()}] Knowledge item stored`, {
        id: storedId,
        source: knowledgeItem.source,
        property_id: knowledgeItem.property_id,
        booking_id: knowledgeItem.booking_id,
        processingTime: Date.now() - startTime,
      });
    } catch (storageError) {
      console.error(`[${new Date().toISOString()}] Failed to store knowledge item`, {
        error: storageError.message,
        stack: storageError.stack,
        processingTime: Date.now() - startTime,
      });
      // Continue processing even if storage fails (degraded mode)
    }

    // Step 3: Generate suggested reply (if we have a guest message)
    let suggestedReply = null;
    if (knowledgeItem.normalized.latest_guest_message) {
      try {
        const propertyContext = property_id
          ? { property_id, property_name: null, metadata: {} }
          : null;

        suggestedReply = await suggestReply(knowledgeItem.normalized, propertyContext);

        console.log(`[${new Date().toISOString()}] Suggested reply generated`, {
          knowledgeItemId: storedId,
          hasDraft: !!suggestedReply.draft,
          confidence: suggestedReply.confidence,
          processingTime: Date.now() - startTime,
        });
      } catch (suggestError) {
        console.error(`[${new Date().toISOString()}] Failed to generate suggested reply`, {
          error: suggestError.message,
          stack: suggestError.stack,
          processingTime: Date.now() - startTime,
        });
        // Continue even if suggestion fails
      }
    }

    // Step 4: Send notification to host
    if (suggestedReply) {
      try {
        const hostEmail = env.HOST_EMAIL || "host@capehost.ai";
        const latestMessage = knowledgeItem.normalized.latest_guest_message;

        const deliveryResult = await sendHostNotification(env, {
          to: hostEmail,
          subject: knowledgeItem.normalized.subject,
          draft: suggestedReply.draft,
          metadata: {
            property_id: knowledgeItem.property_id,
            booking_id: knowledgeItem.booking_id,
            guest_name: latestMessage?.from || null,
            timestamps: knowledgeItem.normalized.timestamps,
            thread_id: knowledgeItem.external_thread_id,
            knowledge_item_id: storedId,
          },
        });

        if (deliveryResult.success) {
          console.log(`[${new Date().toISOString()}] Host notification sent`, {
            messageId: deliveryResult.messageId,
            to: hostEmail,
            processingTime: Date.now() - startTime,
          });
        } else {
          console.error(`[${new Date().toISOString()}] Failed to send host notification`, {
            error: deliveryResult.error,
            processingTime: Date.now() - startTime,
          });
        }
      } catch (deliveryError) {
        console.error(`[${new Date().toISOString()}] Error sending host notification`, {
          error: deliveryError.message,
          stack: deliveryError.stack,
          processingTime: Date.now() - startTime,
        });
        // Don't fail the webhook if delivery fails
      }
    }

    // Return success response
    const responseBody = {
      status: "received",
      has_suggested_reply: !!suggestedReply,
    };

    // Only include knowledge_item_id if storage succeeded
    if (storedId) {
      responseBody.knowledge_item_id = storedId;
    }

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error processing webhook`, {
      error: error.message,
      stack: error.stack,
      processingTime: Date.now() - startTime,
    });

    return new Response(JSON.stringify({ error: "Failed to process request" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
