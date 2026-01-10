import { describe, it, expect, vi, beforeEach } from "vitest";
import { suggestReply } from "../suggest-reply.js";

describe("suggest-reply service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("suggestReply", () => {
    it("should return default reply when no guest message", async () => {
      const thread = {
        latest_guest_message: null,
        full_thread_text: "Some thread text",
        message_count: 1,
      };

      const result = await suggestReply(thread);

      expect(result.draft).toBe("Thank you for your message. We'll get back to you soon.");
      expect(result.confidence).toBe(0.5);
    });

    it("should generate check-in related reply", async () => {
      const thread = {
        latest_guest_message: {
          id: "msg-1",
          from: "guest@example.com",
          bodyPlain: "I have a question about check-in",
          subject: "Check-in question",
        },
        full_thread_text: "Thread text",
        message_count: 1,
      };

      const result = await suggestReply(thread);

      expect(result.draft).toContain("Hello,");
      expect(result.draft).toContain("check-in");
      expect(result.draft).toContain("hosting you");
      expect(result.confidence).toBe(0.6);
    });

    it("should generate check-in reply for 'arrival' keyword", async () => {
      const thread = {
        latest_guest_message: {
          id: "msg-1",
          from: "guest@example.com",
          bodyPlain: "I need to know about my arrival time",
          subject: "Arrival time",
        },
        full_thread_text: "Thread text",
        message_count: 1,
      };

      const result = await suggestReply(thread);

      expect(result.draft).toContain("check-in");
      expect(result.confidence).toBe(0.6);
    });

    it("should generate check-out related reply", async () => {
      const thread = {
        latest_guest_message: {
          id: "msg-1",
          from: "guest@example.com",
          bodyPlain: "I have a question about check-out",
          subject: "Check-out question",
        },
        full_thread_text: "Thread text",
        message_count: 1,
      };

      const result = await suggestReply(thread);

      expect(result.draft).toContain("Hello,");
      expect(result.draft).toContain("check-out");
      expect(result.draft).toContain("enjoyed your stay");
      expect(result.confidence).toBe(0.6);
    });

    it("should generate check-out reply for 'departure' keyword", async () => {
      const thread = {
        latest_guest_message: {
          id: "msg-1",
          from: "guest@example.com",
          bodyPlain: "I need information about my departure time",
          subject: "Departure time",
        },
        full_thread_text: "Thread text",
        message_count: 1,
      };

      const result = await suggestReply(thread);

      expect(result.draft).toContain("check-out");
      expect(result.confidence).toBe(0.6);
    });

    it("should generate question-related reply", async () => {
      const thread = {
        latest_guest_message: {
          id: "msg-1",
          from: "guest@example.com",
          bodyPlain: "I have a question about the property",
          subject: "Question",
        },
        full_thread_text: "Thread text",
        message_count: 1,
      };

      const result = await suggestReply(thread);

      expect(result.draft).toContain("Hello,");
      expect(result.draft).toContain("question");
      expect(result.draft).toContain("get back to you");
      expect(result.confidence).toBe(0.6);
    });

    it("should generate question reply for messages with question mark", async () => {
      const thread = {
        latest_guest_message: {
          id: "msg-1",
          from: "guest@example.com",
          bodyPlain: "Where is the nearest grocery store?",
          subject: "Location",
        },
        full_thread_text: "Thread text",
        message_count: 1,
      };

      const result = await suggestReply(thread);

      expect(result.draft).toContain("question");
      expect(result.confidence).toBe(0.6);
    });

    it("should generate generic reply for other messages", async () => {
      const thread = {
        latest_guest_message: {
          id: "msg-1",
          from: "guest@example.com",
          bodyPlain: "Thanks for the great stay!",
          subject: "Thank you",
        },
        full_thread_text: "Thread text",
        message_count: 1,
      };

      const result = await suggestReply(thread);

      expect(result.draft).toContain("Hello,");
      expect(result.draft).toContain("received it");
      expect(result.draft).toContain("respond soon");
      expect(result.confidence).toBe(0.6);
    });

    it("should add property-specific greeting when property context provided", async () => {
      const thread = {
        latest_guest_message: {
          id: "msg-1",
          from: "guest@example.com",
          bodyPlain: "I have a question",
          subject: "Question",
        },
        full_thread_text: "Thread text",
        message_count: 1,
      };

      const propertyContext = {
        property_id: "prop-123",
        property_name: "Beach House Paradise",
        metadata: {},
      };

      const result = await suggestReply(thread, propertyContext);

      expect(result.draft).toContain("Beach House Paradise");
      expect(result.draft).toContain("Thank you for reaching out about");
      expect(result.confidence).toBe(0.6);
    });

    it("should use default greeting when property context has no property_name", async () => {
      const thread = {
        latest_guest_message: {
          id: "msg-1",
          from: "guest@example.com",
          bodyPlain: "I have a question",
          subject: "Question",
        },
        full_thread_text: "Thread text",
        message_count: 1,
      };

      const propertyContext = {
        property_id: "prop-123",
        metadata: {},
      };

      const result = await suggestReply(thread, propertyContext);

      expect(result.draft).toContain("Hello,");
      expect(result.draft).not.toContain("Thank you for reaching out about");
      expect(result.confidence).toBe(0.6);
    });

    it("should handle case-insensitive keyword matching", async () => {
      const thread = {
        latest_guest_message: {
          id: "msg-1",
          from: "guest@example.com",
          bodyPlain: "CHECK-IN procedure?",
          subject: "CHECK-IN",
        },
        full_thread_text: "Thread text",
        message_count: 1,
      };

      const result = await suggestReply(thread);

      expect(result.draft).toContain("check-in");
      expect(result.confidence).toBe(0.6);
    });

    it("should handle empty bodyPlain gracefully", async () => {
      const thread = {
        latest_guest_message: {
          id: "msg-1",
          from: "guest@example.com",
          bodyPlain: "",
          subject: "Empty message",
        },
        full_thread_text: "Thread text",
        message_count: 1,
      };

      const result = await suggestReply(thread);

      expect(result.draft).toContain("Hello,");
      expect(result.draft).toContain("received it");
      expect(result.confidence).toBe(0.6);
    });

    it("should handle null bodyPlain gracefully", async () => {
      const thread = {
        latest_guest_message: {
          id: "msg-1",
          from: "guest@example.com",
          bodyPlain: null,
          subject: "Null message",
        },
        full_thread_text: "Thread text",
        message_count: 1,
      };

      const result = await suggestReply(thread);

      expect(result.draft).toContain("Hello,");
      expect(result.draft).toContain("received it");
      expect(result.confidence).toBe(0.6);
    });

    it("should handle undefined bodyPlain gracefully", async () => {
      const thread = {
        latest_guest_message: {
          id: "msg-1",
          from: "guest@example.com",
          subject: "Undefined message",
        },
        full_thread_text: "Thread text",
        message_count: 1,
      };

      const result = await suggestReply(thread);

      expect(result.draft).toContain("Hello,");
      expect(result.draft).toContain("received it");
      expect(result.confidence).toBe(0.6);
    });

    it("should prioritize check-in over check-out when both keywords present", async () => {
      const thread = {
        latest_guest_message: {
          id: "msg-1",
          from: "guest@example.com",
          bodyPlain: "Questions about check-in and check-out",
          subject: "Both questions",
        },
        full_thread_text: "Thread text",
        message_count: 1,
      };

      const result = await suggestReply(thread);

      // Should match check-in first (first condition in if-else chain)
      expect(result.draft).toContain("check-in");
      expect(result.draft).not.toContain("check-out");
      expect(result.confidence).toBe(0.6);
    });
  });
});
