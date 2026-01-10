/**
 * Email Ingest API - Cloudflare Worker
 *
 * API endpoints:
 * - GET  /health - Health check (public)
 * - POST /webhooks/email - Receive email webhooks (protected)
 * - POST /properties/:property_id/context - Store property context (protected)
 * - GET  /properties/:property_id/knowledge - Get property knowledge items (protected)
 * - GET  /threads/:external_thread_id - Get thread items (protected)
 * - GET  /bookings/:booking_id - Get booking items (protected)
 */

import { isAuthorized } from "./utils/auth.js";
import { handleWebhookEmail } from "./routes/webhooks.js";
import { handlePropertyContext, handlePropertyKnowledge } from "./routes/properties.js";
import { handleThread } from "./routes/threads.js";
import { handleBooking } from "./routes/bookings.js";

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    console.log(`[${new Date().toISOString()}] ${req.method} ${url.pathname}`, {
      method: req.method,
      pathname: url.pathname,
      origin: req.headers.get("origin"),
      userAgent: req.headers.get("user-agent"),
    });

    // Public endpoint
    if (url.pathname === "/health") {
      console.log(`[${new Date().toISOString()}] Health check - OK`);
      return new Response("ok");
    }

    // Protect everything else
    if (!isAuthorized(req, env)) {
      console.warn(`[${new Date().toISOString()}] Unauthorized request`, {
        method: req.method,
        pathname: url.pathname,
        ip: req.headers.get("cf-connecting-ip"),
      });
      return new Response("unauthorized", { status: 401 });
    }

    // Webhook routes
    if (url.pathname === "/webhooks/email" && req.method === "POST") {
      return handleWebhookEmail(req, env);
    }

    // Property routes
    const propertyContextMatch = url.pathname.match(/^\/properties\/([^/]+)\/context$/);
    if (propertyContextMatch) {
      return handlePropertyContext(req, env, propertyContextMatch[1]);
    }

    const propertyKnowledgeMatch = url.pathname.match(/^\/properties\/([^/]+)\/knowledge$/);
    if (propertyKnowledgeMatch) {
      return handlePropertyKnowledge(req, env, propertyKnowledgeMatch[1]);
    }

    // Thread routes
    const threadMatch = url.pathname.match(/^\/threads\/(.+)$/);
    if (threadMatch) {
      return handleThread(req, env, threadMatch[1]);
    }

    // Booking routes
    const bookingMatch = url.pathname.match(/^\/bookings\/(.+)$/);
    if (bookingMatch) {
      return handleBooking(req, env, bookingMatch[1]);
    }

    console.warn(`[${new Date().toISOString()}] Route not found`, {
      method: req.method,
      pathname: url.pathname,
    });
    return new Response("not found", { status: 404 });
  },
};
