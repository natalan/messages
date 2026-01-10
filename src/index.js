/**
 * Email Ingest API - Cloudflare Worker
 *
 * API endpoints:
 * - GET  /health - Health check (public)
 * - POST /webhooks/email - Receive email webhooks (protected)
 */

import { isAuthorized } from "./utils/auth.js";
import { handleWebhookEmail } from "./routes/webhooks.js";

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

    console.warn(`[${new Date().toISOString()}] Route not found`, {
      method: req.method,
      pathname: url.pathname,
    });
    return new Response("not found", { status: 404 });
  },
};
