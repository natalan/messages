import { describe, it, expect } from "vitest";
import {
  extractLatestGuestMessage,
  buildFullThreadText,
  normalizeWebhookPayload,
} from "../normalize.js";
import { SOURCE_TYPES, CONTENT_TYPES, INGEST_METHODS } from "../../types/schema.js";

describe("normalize service", () => {
  describe("extractLatestGuestMessage", () => {
    it("should return null for empty messages array", () => {
      const result = extractLatestGuestMessage([]);
      expect(result).toBeNull();
    });

    it("should return null for null/undefined messages", () => {
      expect(extractLatestGuestMessage(null)).toBeNull();
      expect(extractLatestGuestMessage(undefined)).toBeNull();
    });

    it("should extract latest guest message from thread", () => {
      const messages = [
        {
          id: "msg-1",
          date: "2024-01-01T10:00:00Z",
          from: "host@capehost.ai",
          to: "guest@example.com",
          subject: "Welcome",
          bodyPlain: "Welcome to our property",
        },
        {
          id: "msg-2",
          date: "2024-01-01T11:00:00Z",
          from: "guest@example.com",
          to: "host@capehost.ai",
          subject: "Re: Welcome",
          bodyPlain: "Thank you!",
        },
        {
          id: "msg-3",
          date: "2024-01-01T12:00:00Z",
          from: "host@capehost.ai",
          to: "guest@example.com",
          subject: "Re: Welcome",
          bodyPlain: "You're welcome",
        },
      ];

      const result = extractLatestGuestMessage(messages);
      expect(result).not.toBeNull();
      expect(result.id).toBe("msg-2");
      expect(result.from).toBe("guest@example.com");
    });

    it("should return null if no guest messages found", () => {
      const messages = [
        {
          id: "msg-1",
          date: "2024-01-01T10:00:00Z",
          from: "host@capehost.ai",
          to: "host2@capehost.ai",
          subject: "Internal",
          bodyPlain: "Internal message",
        },
      ];

      const result = extractLatestGuestMessage(messages);
      expect(result).toBeNull();
    });

    it("should handle messages sorted by date (newest first)", () => {
      const messages = [
        {
          id: "msg-1",
          date: "2024-01-01T10:00:00Z",
          from: "guest@example.com",
          bodyPlain: "First guest message",
        },
        {
          id: "msg-2",
          date: "2024-01-01T11:00:00Z",
          from: "guest@example.com",
          bodyPlain: "Latest guest message",
        },
      ];

      const result = extractLatestGuestMessage(messages);
      expect(result.id).toBe("msg-2");
      expect(result.bodyPlain).toBe("Latest guest message");
    });
  });

  describe("buildFullThreadText", () => {
    it("should return empty string for empty messages", () => {
      expect(buildFullThreadText([])).toBe("");
      expect(buildFullThreadText(null)).toBe("");
      expect(buildFullThreadText(undefined)).toBe("");
    });

    it("should build thread text in chronological order", () => {
      const messages = [
        {
          id: "msg-1",
          date: "2024-01-01T10:00:00Z",
          from: "host@capehost.ai",
          to: "guest@example.com",
          subject: "Welcome",
          bodyPlain: "Welcome message",
        },
        {
          id: "msg-2",
          date: "2024-01-01T11:00:00Z",
          from: "guest@example.com",
          to: "host@capehost.ai",
          subject: "Re: Welcome",
          bodyPlain: "Thank you",
        },
      ];

      const result = buildFullThreadText(messages);
      expect(result).toContain("Message 1");
      expect(result).toContain("Message 2");
      expect(result).toContain("Welcome message");
      expect(result).toContain("Thank you");
      expect(result.indexOf("Welcome message")).toBeLessThan(result.indexOf("Thank you"));
    });

    it("should use bodyPlain over bodyHtml when available", () => {
      const messages = [
        {
          id: "msg-1",
          date: "2024-01-01T10:00:00Z",
          from: "host@capehost.ai",
          to: "guest@example.com",
          subject: "Test",
          bodyPlain: "Plain text",
          bodyHtml: "<p>HTML text</p>",
        },
      ];

      const result = buildFullThreadText(messages);
      expect(result).toContain("Plain text");
      expect(result).not.toContain("HTML text");
    });

    it("should handle missing body gracefully", () => {
      const messages = [
        {
          id: "msg-1",
          date: "2024-01-01T10:00:00Z",
          from: "host@capehost.ai",
          to: "guest@example.com",
          subject: "Test",
        },
      ];

      const result = buildFullThreadText(messages);
      expect(result).toContain("Message 1");
      expect(result).toContain("Test");
    });
  });

  describe("normalizeWebhookPayload", () => {
    const mockPayload = {
      schema_version: "1.0.0",
      source: "gmail",
      label: "capehost/inbound",
      threadId: "thread-123",
      messageCount: 2,
      messages: [
        {
          id: "msg-1",
          date: "2024-01-01T10:00:00Z",
          from: "host@capehost.ai",
          to: "guest@example.com",
          cc: "",
          subject: "Welcome",
          bodyPlain: "Welcome message",
          bodyHtml: "<p>Welcome message</p>",
        },
        {
          id: "msg-2",
          date: "2024-01-01T11:00:00Z",
          from: "guest@example.com",
          to: "host@capehost.ai",
          cc: "",
          subject: "Re: Welcome",
          bodyPlain: "Thank you",
          bodyHtml: "<p>Thank you</p>",
        },
      ],
    };

    it("should normalize payload with default values", () => {
      const result = normalizeWebhookPayload(mockPayload);

      expect(result.schema_version).toBe("1.0.0");
      expect(result.source).toBe("gmail"); // Uses source from payload
      expect(result.ingest_method).toBe(INGEST_METHODS.WEBHOOK);
      expect(result.content_type).toBe(CONTENT_TYPES.EMAIL_MESSAGE);
      expect(result.external_thread_id).toBe("thread-123");
      expect(result.raw_payload).toEqual(mockPayload);
      expect(result.normalized).toBeDefined();
    });

    it("should extract latest guest message correctly", () => {
      const result = normalizeWebhookPayload(mockPayload);

      expect(result.normalized.latest_guest_message).not.toBeNull();
      expect(result.normalized.latest_guest_message.id).toBe("msg-2");
      expect(result.normalized.latest_guest_message.from).toBe("guest@example.com");
    });

    it("should build full thread text", () => {
      const result = normalizeWebhookPayload(mockPayload);

      expect(result.normalized.full_thread_text).toContain("Welcome message");
      expect(result.normalized.full_thread_text).toContain("Thank you");
    });

    it("should extract message count", () => {
      const result = normalizeWebhookPayload(mockPayload);

      expect(result.normalized.message_count).toBe(2);
    });

    it("should extract subject from latest message", () => {
      const result = normalizeWebhookPayload(mockPayload);

      expect(result.normalized.subject).toBe("Re: Welcome");
    });

    it("should extract timestamps", () => {
      const result = normalizeWebhookPayload(mockPayload);

      expect(result.normalized.timestamps).toHaveLength(2);
      expect(result.normalized.timestamps).toContain("2024-01-01T10:00:00Z");
      expect(result.normalized.timestamps).toContain("2024-01-01T11:00:00Z");
    });

    it("should accept property_id and booking_id", () => {
      const result = normalizeWebhookPayload(
        mockPayload,
        SOURCE_TYPES.GMAIL_WEBHOOK,
        "prop-123",
        "book-456"
      );

      expect(result.property_id).toBe("prop-123");
      expect(result.booking_id).toBe("book-456");
    });

    it("should handle payload with no guest messages", () => {
      const hostOnlyPayload = {
        ...mockPayload,
        messages: [
          {
            id: "msg-1",
            date: "2024-01-01T10:00:00Z",
            from: "host@capehost.ai",
            to: "host2@capehost.ai",
            subject: "Internal",
            bodyPlain: "Internal message",
          },
        ],
      };

      const result = normalizeWebhookPayload(hostOnlyPayload);

      expect(result.normalized.latest_guest_message).toBeNull();
      expect(result.normalized.message_count).toBe(1);
    });

    it("should use first message metadata when last message missing fields", () => {
      const partialPayload = {
        ...mockPayload,
        messages: [
          {
            id: "msg-1",
            date: "2024-01-01T10:00:00Z",
            from: "host@capehost.ai",
            to: "guest@example.com",
            subject: "Welcome",
            bodyPlain: "Welcome",
          },
          {
            id: "msg-2",
            date: "2024-01-01T11:00:00Z",
            // Missing from, to, subject
            bodyPlain: "Reply",
          },
        ],
      };

      const result = normalizeWebhookPayload(partialPayload);

      expect(result.normalized.subject).toBe("Welcome");
      expect(result.normalized.from).toBeDefined();
      expect(result.normalized.to).toBeDefined();
    });
  });
});
