import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendHostNotification } from "../email-delivery.js";

describe("email-delivery service", () => {
  let consoleWarnSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  describe("sendHostNotification", () => {
    it("should return success with messageId when valid options provided", async () => {
      const env = {};
      const options = {
        to: "host@capehost.ai",
        subject: "Guest question",
        draft: "Suggested reply draft",
        metadata: {},
      };

      const result = await sendHostNotification(env, options);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.messageId).toMatch(/^stub-\d+$/);
      expect(result.error).toBeUndefined();
    });

    it("should format subject with [Suggested Reply] prefix", async () => {
      const env = {};
      const options = {
        to: "host@capehost.ai",
        subject: "Guest question",
        draft: "Draft",
        metadata: {},
      };

      await sendHostNotification(env, options);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Email delivery (stub):",
        expect.objectContaining({
          subject: "[Suggested Reply] Guest question",
        })
      );
    });

    it("should log email details with metadata", async () => {
      const env = {};
      const options = {
        to: "host@capehost.ai",
        subject: "Test subject",
        draft: "Test draft",
        metadata: {
          property_id: "prop-123",
          booking_id: "book-456",
          guest_name: "John Doe",
          timestamps: ["2024-01-01T10:00:00Z"],
        },
      };

      await sendHostNotification(env, options);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Email delivery (stub):",
        expect.objectContaining({
          to: "host@capehost.ai",
          hasDraft: true,
          metadata: {
            property_id: "prop-123",
            booking_id: "book-456",
            guest_name: "John Doe",
            timestamps: ["2024-01-01T10:00:00Z"],
          },
        })
      );
    });

    it("should handle null metadata values", async () => {
      const env = {};
      const options = {
        to: "host@capehost.ai",
        subject: "Test",
        draft: "Draft",
        metadata: {
          property_id: null,
          booking_id: null,
          guest_name: null,
          timestamps: [],
        },
      };

      const result = await sendHostNotification(env, options);

      expect(result.success).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Email delivery (stub):",
        expect.objectContaining({
          metadata: expect.objectContaining({
            property_id: null,
            booking_id: null,
            guest_name: null,
            timestamps: [],
          }),
        })
      );
    });

    it("should handle undefined metadata fields", async () => {
      const env = {};
      const options = {
        to: "host@capehost.ai",
        subject: "Test",
        draft: "Draft",
        metadata: {},
      };

      await sendHostNotification(env, options);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Email delivery (stub):",
        expect.objectContaining({
          metadata: expect.objectContaining({
            property_id: null,
            booking_id: null,
            guest_name: null,
            timestamps: [],
          }),
        })
      );
    });

    it("should return error when to field is missing", async () => {
      const env = {};
      const options = {
        subject: "Test subject",
        draft: "Test draft",
        metadata: {},
      };

      const result = await sendHostNotification(env, options);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Recipient email required");
      expect(result.messageId).toBeUndefined();
    });

    it("should return error when to field is empty string", async () => {
      const env = {};
      const options = {
        to: "",
        subject: "Test subject",
        draft: "Test draft",
        metadata: {},
      };

      const result = await sendHostNotification(env, options);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Recipient email required");
    });

    it("should handle missing draft", async () => {
      const env = {};
      const options = {
        to: "host@capehost.ai",
        subject: "Test subject",
        metadata: {},
      };

      const result = await sendHostNotification(env, options);

      expect(result.success).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Email delivery (stub):",
        expect.objectContaining({
          hasDraft: false,
        })
      );
    });

    it("should generate unique messageId for each call", async () => {
      const env = {};
      const options = {
        to: "host@capehost.ai",
        subject: "Test",
        draft: "Draft",
        metadata: {},
      };

      const result1 = await sendHostNotification(env, options);
      // Add small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));
      const result2 = await sendHostNotification(env, options);

      expect(result1.messageId).not.toBe(result2.messageId);
    });

    it("should handle empty metadata timestamps array", async () => {
      const env = {};
      const options = {
        to: "host@capehost.ai",
        subject: "Test",
        draft: "Draft",
        metadata: {
          timestamps: [],
        },
      };

      await sendHostNotification(env, options);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Email delivery (stub):",
        expect.objectContaining({
          metadata: expect.objectContaining({
            timestamps: [],
          }),
        })
      );
    });

    it("should handle multiple timestamps in metadata", async () => {
      const env = {};
      const options = {
        to: "host@capehost.ai",
        subject: "Test",
        draft: "Draft",
        metadata: {
          timestamps: ["2024-01-01T10:00:00Z", "2024-01-01T11:00:00Z", "2024-01-01T12:00:00Z"],
        },
      };

      await sendHostNotification(env, options);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Email delivery (stub):",
        expect.objectContaining({
          metadata: expect.objectContaining({
            timestamps: ["2024-01-01T10:00:00Z", "2024-01-01T11:00:00Z", "2024-01-01T12:00:00Z"],
          }),
        })
      );
    });
  });
});
