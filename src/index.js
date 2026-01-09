/**
 * Email Ingest API - Cloudflare Worker
 *
 * API endpoints:
 * - GET  /health - Health check (public)
 * - POST /webhooks/email - Receive email webhooks (protected)
 */

import { isAuthorized } from "./utils/auth.js";

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const startTime = Date.now();

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

    if (url.pathname === "/webhooks/email" && req.method === "POST") {
      try {
        const payload = await req.json();
        const messageCount = payload.messages?.length || 0;

        console.log(`[${new Date().toISOString()}] Inbound email received`, {
          source: payload.source || "unknown",
          threadId: payload.threadId,
          messageCount,
          label: payload.label,
          processingTime: Date.now() - startTime,
        });

        if (messageCount > 0) {
          console.log(`[${new Date().toISOString()}] Message details`, {
            messageIds: payload.messages.map((m) => m.id),
            subjects: payload.messages.map((m) => m.subject),
          });
        }

        return new Response(JSON.stringify({ status: "received" }), {
          headers: { "content-type": "application/json" },
        });
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error processing inbound email`, {
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

    console.warn(`[${new Date().toISOString()}] Route not found`, {
      method: req.method,
      pathname: url.pathname,
    });
    return new Response("not found", { status: 404 });
  },
};
