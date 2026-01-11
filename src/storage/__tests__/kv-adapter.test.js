import { describe, it, expect, vi, beforeEach } from "vitest";
import { KVStorageAdapter } from "../kv-adapter.js";
import { SCHEMA_VERSION, SOURCE_TYPES, CONTENT_TYPES, INGEST_METHODS } from "../../types/schema.js";

describe("KVStorageAdapter", () => {
  let adapter;
  let mockEnv;
  let mockKV;

  beforeEach(() => {
    adapter = new KVStorageAdapter();
    mockKV = {
      put: vi.fn(),
      get: vi.fn(),
    };
    mockEnv = {
      KNOWLEDGE_ITEMS: mockKV,
    };
  });

  describe("generateId", () => {
    it("should generate unique IDs", () => {
      const id1 = adapter.generateId();
      const id2 = adapter.generateId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^\d+-[\da-z]+$/);
    });

    it("should include timestamp in ID", () => {
      const beforeTime = Date.now();
      const id = adapter.generateId();
      const afterTime = Date.now();

      const timestamp = parseInt(id.split("-")[0]);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe("storeKnowledgeItem", () => {
    const mockItem = {
      id: null,
      schema_version: SCHEMA_VERSION,
      created_at: new Date("2024-01-01T10:00:00Z"),
      source: SOURCE_TYPES.GMAIL_WEBHOOK,
      ingest_method: INGEST_METHODS.WEBHOOK,
      content_type: CONTENT_TYPES.EMAIL_MESSAGE,
      property_id: "prop-123",
      booking_id: "book-456",
      external_thread_id: "thread-789",
      raw_payload: { test: "data" },
      normalized: {
        latest_guest_message: { id: "msg-1" },
        full_thread_text: "Thread text",
        message_count: 1,
      },
    };

    it("should throw error when KV binding not found", async () => {
      const envWithoutKV = {};

      await expect(adapter.storeKnowledgeItem(envWithoutKV, mockItem)).rejects.toThrow(
        "KV binding 'KNOWLEDGE_ITEMS' not found in environment"
      );
    });

    it("should generate ID when item has no id", async () => {
      const itemWithoutId = { ...mockItem, id: null };
      mockKV.put.mockResolvedValue();

      const result = await adapter.storeKnowledgeItem(mockEnv, itemWithoutId);

      expect(result).toBeDefined();
      expect(result).toMatch(/^\d+-[\da-z]+$/);
      expect(mockKV.put).toHaveBeenCalled();
    });

    it("should use existing ID when item has id", async () => {
      const itemWithId = { ...mockItem, id: "custom-id-123" };
      mockKV.put.mockResolvedValue();

      const result = await adapter.storeKnowledgeItem(mockEnv, itemWithId);

      expect(result).toBe("custom-id-123");
      expect(mockKV.put).toHaveBeenCalledWith(
        "knowledge-item:custom-id-123",
        expect.any(String),
        expect.any(Object)
      );
    });

    it("should store item with correct key format", async () => {
      mockKV.put.mockResolvedValue();

      await adapter.storeKnowledgeItem(mockEnv, mockItem);

      expect(mockKV.put).toHaveBeenCalledWith(
        expect.stringMatching(/^knowledge-item:.+$/),
        expect.any(String),
        expect.any(Object)
      );
    });

    it("should stringify item when storing", async () => {
      mockKV.put.mockResolvedValue();

      const result = await adapter.storeKnowledgeItem(mockEnv, mockItem);

      // Verify the stored item has the ID set
      const putCalls = mockKV.put.mock.calls;
      const mainCall = putCalls.find((call) => call[0].startsWith("knowledge-item:"));
      const storedItem = JSON.parse(mainCall[1]);
      expect(storedItem.id).toBe(result);
      expect(storedItem.id).toBe(mainCall[0].replace("knowledge-item:", ""));
    });

    it("should store metadata correctly", async () => {
      mockKV.put.mockResolvedValue();

      await adapter.storeKnowledgeItem(mockEnv, mockItem);

      const putCalls = mockKV.put.mock.calls;
      const mainCall = putCalls.find((call) => call[0].startsWith("knowledge-item:"));

      expect(mainCall[2]).toEqual({
        metadata: {
          source: SOURCE_TYPES.GMAIL_WEBHOOK,
          content_type: CONTENT_TYPES.EMAIL_MESSAGE,
          property_id: "prop-123",
          booking_id: "book-456",
          external_thread_id: "thread-789",
          created_at: "2024-01-01T10:00:00.000Z",
        },
      });
    });

    it("should create property index when property_id exists", async () => {
      mockKV.put.mockResolvedValue();
      mockKV.get.mockResolvedValue(null); // No existing index

      await adapter.storeKnowledgeItem(mockEnv, mockItem);

      // Should create property index as ordered list
      expect(mockKV.put).toHaveBeenCalledWith(
        "property:prop-123",
        expect.stringMatching(/^\[.+\]$/), // JSON array string
        { expirationTtl: 31536000 }
      );
    });

    it("should create booking index when booking_id exists", async () => {
      mockKV.put.mockResolvedValue();
      mockKV.get.mockResolvedValue(null); // No existing index

      await adapter.storeKnowledgeItem(mockEnv, mockItem);

      // Should create booking index for thread IDs
      expect(mockKV.put).toHaveBeenCalledWith(
        "booking:book-456",
        expect.stringMatching(/^\[.+\]$/), // JSON array string with thread ID
        { expirationTtl: 31536000 }
      );
      // Should also create booking items index
      expect(mockKV.put).toHaveBeenCalledWith(
        "booking:book-456:items",
        expect.stringMatching(/^\[.+\]$/), // JSON array string with item ID
        { expirationTtl: 31536000 }
      );
    });

    it("should create thread index when external_thread_id exists", async () => {
      mockKV.put.mockResolvedValue();
      mockKV.get.mockResolvedValue(null); // No existing thread index

      await adapter.storeKnowledgeItem(mockEnv, mockItem);

      // Should create thread index as ordered list
      expect(mockKV.put).toHaveBeenCalledWith(
        "thread:thread-789",
        expect.stringMatching(/^\[.+\]$/), // JSON array string
        { expirationTtl: 31536000 }
      );
    });

    it("should not create property index when property_id is null", async () => {
      const itemWithoutProperty = { ...mockItem, property_id: null };
      mockKV.put.mockResolvedValue();
      mockKV.get.mockResolvedValue(null);

      await adapter.storeKnowledgeItem(mockEnv, itemWithoutProperty);

      const propertyIndexCalls = mockKV.put.mock.calls.filter((call) =>
        call[0].startsWith("property:")
      );
      expect(propertyIndexCalls).toHaveLength(0);
    });

    it("should not create booking index when booking_id is null", async () => {
      const itemWithoutBooking = { ...mockItem, booking_id: null };
      mockKV.put.mockResolvedValue();
      mockKV.get.mockResolvedValue(null);

      await adapter.storeKnowledgeItem(mockEnv, itemWithoutBooking);

      const bookingIndexCalls = mockKV.put.mock.calls.filter((call) =>
        call[0].startsWith("booking:")
      );
      expect(bookingIndexCalls).toHaveLength(0);
    });

    it("should not create thread index when external_thread_id is null", async () => {
      const itemWithoutThread = { ...mockItem, external_thread_id: null };
      mockKV.put.mockResolvedValue();
      mockKV.get.mockResolvedValue(null);

      await adapter.storeKnowledgeItem(mockEnv, itemWithoutThread);

      const threadIndexCalls = mockKV.put.mock.calls.filter((call) =>
        call[0].startsWith("thread:")
      );
      expect(threadIndexCalls).toHaveLength(0);
    });
  });

  describe("getKnowledgeItem", () => {
    const mockItem = {
      id: "item-123",
      schema_version: SCHEMA_VERSION,
      created_at: "2024-01-01T10:00:00.000Z",
      source: SOURCE_TYPES.GMAIL_WEBHOOK,
      normalized: { message_count: 1 },
    };

    it("should throw error when KV binding not found", async () => {
      const envWithoutKV = {};

      await expect(adapter.getKnowledgeItem(envWithoutKV, "item-123")).rejects.toThrow(
        "KV binding 'KNOWLEDGE_ITEMS' not found in environment"
      );
    });

    it("should return null when item not found", async () => {
      mockKV.get.mockResolvedValue(null);

      const result = await adapter.getKnowledgeItem(mockEnv, "item-123");

      expect(result).toBeNull();
      expect(mockKV.get).toHaveBeenCalledWith("knowledge-item:item-123", "json");
    });

    it("should return item with converted created_at Date", async () => {
      mockKV.get.mockResolvedValue(mockItem);

      const result = await adapter.getKnowledgeItem(mockEnv, "item-123");

      expect(result).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.created_at.toISOString()).toBe("2024-01-01T10:00:00.000Z");
      expect(result.id).toBe("item-123");
      expect(result.schema_version).toBe(SCHEMA_VERSION);
    });

    it("should use correct key format when retrieving", async () => {
      mockKV.get.mockResolvedValue(null);

      await adapter.getKnowledgeItem(mockEnv, "item-123");

      expect(mockKV.get).toHaveBeenCalledWith("knowledge-item:item-123", "json");
    });

    it("should preserve all item fields", async () => {
      const fullItem = {
        ...mockItem,
        property_id: "prop-123",
        booking_id: "book-456",
        raw_payload: { test: "data" },
      };
      mockKV.get.mockResolvedValue(fullItem);

      const result = await adapter.getKnowledgeItem(mockEnv, "item-123");

      expect(result.property_id).toBe("prop-123");
      expect(result.booking_id).toBe("book-456");
      expect(result.raw_payload).toEqual({ test: "data" });
      expect(result.created_at).toBeInstanceOf(Date);
    });
  });

  describe("listKnowledgeItems", () => {
    it("should throw error when KV binding not found", async () => {
      const envWithoutKV = {};

      await expect(adapter.listKnowledgeItems(envWithoutKV)).rejects.toThrow(
        "KV binding 'KNOWLEDGE_ITEMS' not found in environment"
      );
    });

    it("should return empty array (KV limitation)", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await adapter.listKnowledgeItems(mockEnv);

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("KV adapter: listKnowledgeItems with filters not fully implemented")
      );

      consoleWarnSpy.mockRestore();
    });

    it("should accept filters parameter (though not used)", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const filters = { property_id: "prop-123", source: SOURCE_TYPES.GMAIL_WEBHOOK };
      const result = await adapter.listKnowledgeItems(mockEnv, filters);

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it("should return empty array with empty filters", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await adapter.listKnowledgeItems(mockEnv, {});

      expect(result).toEqual([]);

      consoleWarnSpy.mockRestore();
    });
  });
});
