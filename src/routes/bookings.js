/**
 * Booking routes handler
 */

import { KVStorageAdapter } from "../storage/index.js";
import { sanitizeForLogging } from "../services/validation.js";

const storageAdapter = new KVStorageAdapter();

/**
 * Handle GET /bookings/:booking_id
 * Retrieve all knowledge items and threads for a booking
 * @param {Request} req - HTTP request
 * @param {Object} env - Environment variables
 * @param {string} bookingId - Booking identifier from URL
 * @returns {Promise<Response>} - HTTP response
 */
export async function handleBooking(req, env, bookingId) {
  const startTime = Date.now();

  try {
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }

    const bookingData = await storageAdapter.getBookingItems(env, bookingId);

    // Sanitize items for response (redact PII)
    const sanitizedItems = bookingData.items.map((item) => {
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

    console.log(`[${new Date().toISOString()}] Booking retrieved`, {
      booking_id: bookingId,
      thread_count: bookingData.threads.length,
      item_count: bookingData.items.length,
      processingTime: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({
        booking_id: bookingId,
        threads: bookingData.threads,
        items: sanitizedItems,
        item_count: sanitizedItems.length,
        thread_count: bookingData.threads.length,
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error retrieving booking`, {
      booking_id: bookingId,
      error: error.message,
      stack: error.stack,
      processingTime: Date.now() - startTime,
    });

    return new Response(JSON.stringify({ error: "Failed to retrieve booking" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
