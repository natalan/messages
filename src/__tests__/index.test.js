import { describe, it, expect, beforeEach } from "vitest";
import worker from "../index.js";

describe("Email Ingest API Worker", () => {
  let env;

  beforeEach(() => {
    env = {
      INGEST_TOKEN: "test-secret-token-123",
    };
  });

  describe("GET /health", () => {
    it("should return 'ok' without authentication", async () => {
      const req = new Request("https://example.com/health");
      const response = await worker.fetch(req, env);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(text).toBe("ok");
    });

    it("should be accessible from any origin", async () => {
      const req = new Request("https://example.com/health", {
        headers: {
          origin: "https://malicious-site.com",
        },
      });
      const response = await worker.fetch(req, env);

      expect(response.status).toBe(200);
    });
  });

  describe("POST /inbound-email", () => {
    it("should require authentication", async () => {
      const req = new Request("https://example.com/inbound/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ test: "data" }),
      });

      const response = await worker.fetch(req, env);
      const text = await response.text();

      expect(response.status).toBe(401);
      expect(text).toBe("unauthorized");
    });

    it("should accept valid authenticated request", async () => {
      const payload = {
        source: "gmail",
        messages: [{ id: "123", subject: "Test" }],
      };

      const req = new Request("https://example.com/inbound/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer test-secret-token-123",
        },
        body: JSON.stringify(payload),
      });

      const response = await worker.fetch(req, env);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.status).toBe("received");
    });

    it("should only accept POST method", async () => {
      const req = new Request("https://example.com/inbound/email", {
        method: "GET",
        headers: {
          authorization: "Bearer test-secret-token-123",
        },
      });

      const response = await worker.fetch(req, env);

      expect(response.status).toBe(404);
    });
  });

  describe("404 handling", () => {
    it("should return 404 for unknown routes", async () => {
      const req = new Request("https://example.com/unknown-route", {
        headers: {
          authorization: "Bearer test-secret-token-123",
        },
      });

      const response = await worker.fetch(req, env);
      const text = await response.text();

      expect(response.status).toBe(404);
      expect(text).toBe("not found");
    });

    it("should return 404 for root path", async () => {
      const req = new Request("https://example.com/", {
        headers: {
          authorization: "Bearer test-secret-token-123",
        },
      });

      const response = await worker.fetch(req, env);

      expect(response.status).toBe(404);
    });
  });
});
