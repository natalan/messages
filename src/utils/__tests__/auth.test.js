import { describe, it, expect } from "vitest";
import { isAuthorized } from "../auth.js";

describe("isAuthorized", () => {
  const mockEnv = {
    INGEST_TOKEN: "test-secret-token-123",
  };

  it("should return true for valid Bearer token", () => {
    const req = new Request("https://example.com/api", {
      headers: {
        authorization: "Bearer test-secret-token-123",
      },
    });

    expect(isAuthorized(req, mockEnv)).toBe(true);
  });

  it("should return false for invalid token", () => {
    const req = new Request("https://example.com/api", {
      headers: {
        authorization: "Bearer wrong-token",
      },
    });

    expect(isAuthorized(req, mockEnv)).toBe(false);
  });

  it("should return false for missing authorization header", () => {
    const req = new Request("https://example.com/api");

    expect(isAuthorized(req, mockEnv)).toBe(false);
  });

  it("should return false for non-Bearer auth type", () => {
    const req = new Request("https://example.com/api", {
      headers: {
        authorization: "Basic dGVzdDp0ZXN0",
      },
    });

    expect(isAuthorized(req, mockEnv)).toBe(false);
  });

  it("should return false for malformed authorization header", () => {
    const req = new Request("https://example.com/api", {
      headers: {
        authorization: "InvalidFormat",
      },
    });

    expect(isAuthorized(req, mockEnv)).toBe(false);
  });

  it("should handle missing INGEST_TOKEN in env", () => {
    const req = new Request("https://example.com/api", {
      headers: {
        authorization: "Bearer test-secret-token-123",
      },
    });

    const emptyEnv = {};

    expect(isAuthorized(req, emptyEnv)).toBe(false);
  });
});
