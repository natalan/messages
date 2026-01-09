/**
 * Email Ingest API - Cloudflare Worker
 *
 * API endpoints:
 * - GET  /health - Health check (public)
 * - POST /inbound/email - Receive inbound email webhooks (protected)
 */

import { isAuthorized } from "./utils/auth.js";

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    // Public endpoint
    if (url.pathname === "/health") {
      return new Response("ok");
    }

    // Protect everything else
    if (!isAuthorized(req, env)) {
      return new Response("unauthorized", { status: 401 });
    }

    if (url.pathname === "/inbound/email" && req.method === "POST") {
      const payload = await req.json();
      console.log("inbound email payload", payload);

      return new Response(JSON.stringify({ status: "received" }), {
        headers: { "content-type": "application/json" },
      });
    }

    return new Response("not found", { status: 404 });
  },
};
