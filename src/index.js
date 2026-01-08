/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787 to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */


function isAuthorized(req, env) {
    const auth = req.headers.get("authorization");
    if (!auth) return false;
  
    const [type, token] = auth.split(" ");
    if (type !== "Bearer") return false;
  
    return token === env.INGEST_TOKEN;
  }
  
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
  
      if (url.pathname === "/inbound-email" && req.method === "POST") {
        const payload = await req.json();
        console.log("inbound email payload", payload);
  
        return new Response(
          JSON.stringify({ status: "received" }),
          { headers: { "content-type": "application/json" } }
        );
      }
  
      return new Response("not found", { status: 404 });
    },
  };

