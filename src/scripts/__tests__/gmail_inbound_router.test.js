import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Testable version of the gmail_inbound_router functions
// This mirrors the logic from gmail_inbound_router.js but with injectable dependencies
function createTestableRouter(deps) {
  const { PropertiesService, GmailApp, UrlFetchApp, Logger } = deps;

  const CFG = {
    LABEL_NAME: "capehost/webhook",
    LABEL_FAILED: "capehost/webhook-failed",
    WORKER_URL: "https://api.capehost.ai/webhooks/email",
    INGEST_TOKEN: PropertiesService.getScriptProperties().getProperty("INGEST_TOKEN"),
    MAX_THREADS_PER_RUN: 10,
    MAX_MESSAGES_PER_THREAD: 5,
  };

  if (!CFG.INGEST_TOKEN) {
    throw new Error("Missing INGEST_TOKEN in Script Properties");
  }

  function run() {
    const label = GmailApp.getUserLabelByName(CFG.LABEL_NAME);
    if (!label) {
      Logger.log(`Warning: Label not found: ${CFG.LABEL_NAME}. Skipping execution.`);
      return;
    }

    // Get or create the failed label
    let failedLabel = GmailApp.getUserLabelByName(CFG.LABEL_FAILED);
    if (!failedLabel) {
      failedLabel = GmailApp.createLabel(CFG.LABEL_FAILED);
      Logger.log(`Created label: ${CFG.LABEL_FAILED}`);
    }

    const threads = label.getThreads(0, CFG.MAX_THREADS_PER_RUN);
    Logger.log(`Found ${threads.length} thread(s) with label: ${CFG.LABEL_NAME}`);

    let totalMessagesFound = 0;
    let successfulCount = 0;
    let failedCount = 0;
    const allSubjects = [];
    let batchNumber = 0;

    for (const thread of threads) {
      batchNumber++;
      const messages = thread.getMessages();
      const slice = messages.slice(Math.max(0, messages.length - CFG.MAX_MESSAGES_PER_THREAD));

      totalMessagesFound += slice.length;

      // Collect subject lines for logging
      const subjects = slice.map((m) => m.getSubject());
      allSubjects.push(...subjects);
      Logger.log(
        `Thread ${thread.getId()}: Processing ${slice.length} message(s) - Subjects: ${subjects.join(", ")}`
      );

      const payload = {
        schema_version: "1.0.0",
        source: "gmail_webhook",
        label: CFG.LABEL_NAME,
        threadId: thread.getId(),
        messageCount: slice.length, // Use slice.length to match actual messages sent
        messages: slice.map((m) => ({
          id: m.getId(),
          date: m.getDate().toISOString(),
          from: m.getFrom() || "",
          to: m.getTo() || "",
          cc: m.getCc() || "",
          subject: m.getSubject() || "",
          bodyPlain: m.getPlainBody() || "",
          bodyHtml: m.getBody() || "",
        })),
      };

      const result = postToWorker(payload, {
        batchNumber,
        messageCount: slice.length,
        subjects,
        threadId: thread.getId(),
      });

      if (result.success) {
        Logger.log(
          `Request completed successfully for thread ${thread.getId()}: ${result.message}`
        );
        // Only remove the original label on success
        thread.removeLabel(label);
        successfulCount++;
      } else {
        Logger.log(`Request failed for thread ${thread.getId()}: ${result.error}`);
        // Keep the original label and add failed label for retry queue
        thread.addLabel(failedLabel);
        failedCount++;
      }
    }

    Logger.log(
      `Summary: Processed ${totalMessagesFound} message(s) total. Successful: ${successfulCount}, Failed: ${failedCount}. Subject lines: ${allSubjects.join(" | ")}`
    );
  }

  function postToWorker(payload, metadata = {}) {
    try {
      const res = UrlFetchApp.fetch(CFG.WORKER_URL, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
        headers: {
          Authorization: `Bearer ${CFG.INGEST_TOKEN}`,
        },
      });

      const code = res.getResponseCode();
      if (code < 200 || code >= 300) {
        const text = res.getContentText();
        const errorMsg = `Worker error ${code}: ${text}`;
        Logger.log(`ERROR: ${errorMsg}`);
        return {
          success: false,
          error: errorMsg,
          statusCode: code,
        };
      }

      const batchInfo = metadata.batchNumber ? `Batch #${metadata.batchNumber}` : "";
      const countInfo = metadata.messageCount ? `${metadata.messageCount} message(s)` : "";
      const subjectsInfo =
        metadata.subjects && metadata.subjects.length > 0
          ? `Subjects: ${metadata.subjects.join(", ")}`
          : "";

      const parts = [`Success (HTTP ${code})`, batchInfo, countInfo, subjectsInfo].filter(Boolean);

      return {
        success: true,
        message: parts.join(" | "),
        statusCode: code,
      };
    } catch (error) {
      const errorMsg = `Request exception: ${error.message}`;
      Logger.log(`ERROR: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
        exception: true,
      };
    }
  }

  return { run, postToWorker, CFG };
}

describe("gmail_inbound_router", () => {
  let mocks;
  let script;
  let mockProperties;
  let mockLabel;
  let mockThread;
  let mockMessage;
  let mockResponse;

  beforeEach(() => {
    // Setup PropertiesService mock
    mockProperties = {
      getProperty: vi.fn(() => "test-token-123"),
    };

    // Setup GmailApp mock
    mockLabel = {
      getThreads: vi.fn(() => []),
    };

    // Setup message mock
    mockMessage = {
      getId: vi.fn(() => "msg-123"),
      getDate: vi.fn(() => new Date("2024-01-01T00:00:00Z")),
      getFrom: vi.fn(() => "sender@example.com"),
      getTo: vi.fn(() => "recipient@example.com"),
      getCc: vi.fn(() => "cc@example.com"),
      getSubject: vi.fn(() => "Test Subject"),
      getPlainBody: vi.fn(() => "Plain text body"),
      getBody: vi.fn(() => "<html>HTML body</html>"),
    };

    // Setup thread mock
    mockThread = {
      getId: vi.fn(() => "thread-123"),
      getMessages: vi.fn(() => [mockMessage]),
      removeLabel: vi.fn(),
      addLabel: vi.fn(),
    };

    // Setup response mock
    mockResponse = {
      getResponseCode: vi.fn(() => 200),
      getContentText: vi.fn(() => "OK"),
    };

    mocks = {
      PropertiesService: {
        getScriptProperties: vi.fn(() => mockProperties),
      },
      GmailApp: {
        getUserLabelByName: vi.fn(() => mockLabel),
        createLabel: vi.fn(() => ({
          getName: vi.fn(() => "capehost/webhook-failed"),
        })),
      },
      UrlFetchApp: {
        fetch: vi.fn(() => mockResponse),
      },
      Logger: {
        log: vi.fn(),
      },
    };

    script = createTestableRouter(mocks);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Configuration", () => {
    it("should throw error when INGEST_TOKEN is missing", () => {
      mockProperties.getProperty.mockReturnValue(null);

      expect(() => {
        createTestableRouter(mocks);
      }).toThrow("Missing INGEST_TOKEN in Script Properties");
    });

    it("should load INGEST_TOKEN from Script Properties", () => {
      expect(script.CFG.INGEST_TOKEN).toBe("test-token-123");
      expect(mockProperties.getProperty).toHaveBeenCalledWith("INGEST_TOKEN");
    });

    it("should have correct configuration values", () => {
      expect(script.CFG.LABEL_NAME).toBe("capehost/webhook");
      expect(script.CFG.WORKER_URL).toBe("https://api.capehost.ai/webhooks/email");
      expect(script.CFG.MAX_THREADS_PER_RUN).toBe(10);
      expect(script.CFG.MAX_MESSAGES_PER_THREAD).toBe(5);
    });
  });

  describe("run function", () => {
    it("should return early when label is not found", () => {
      mocks.GmailApp.getUserLabelByName.mockReturnValue(null);

      script.run();

      expect(mocks.GmailApp.getUserLabelByName).toHaveBeenCalledWith("capehost/webhook");
      expect(mocks.Logger.log).toHaveBeenCalledWith(
        `Warning: Label not found: capehost/webhook. Skipping execution.`
      );
      expect(mocks.UrlFetchApp.fetch).not.toHaveBeenCalled();
    });

    it("should process threads with label", () => {
      mockLabel.getThreads.mockReturnValue([mockThread]);

      script.run();

      expect(mockLabel.getThreads).toHaveBeenCalledWith(0, 10);
      expect(mocks.Logger.log).toHaveBeenCalledWith(
        `Found 1 thread(s) with label: capehost/webhook`
      );
    });

    it("should limit threads to MAX_THREADS_PER_RUN", () => {
      const threads = Array(15).fill(mockThread);
      mockLabel.getThreads.mockReturnValue(threads);

      script.run();

      expect(mockLabel.getThreads).toHaveBeenCalledWith(0, 10);
    });

    it("should slice messages to MAX_MESSAGES_PER_THREAD", () => {
      const manyMessages = Array(10).fill(mockMessage);
      mockThread.getMessages.mockReturnValue(manyMessages);
      mockLabel.getThreads.mockReturnValue([mockThread]);

      script.run();

      expect(mockThread.getMessages).toHaveBeenCalled();
      const callArgs = mocks.UrlFetchApp.fetch.mock.calls[0];
      const payload = JSON.parse(callArgs[1].payload);
      expect(payload.messages).toHaveLength(5);
    });

    it("should create payload with correct structure", () => {
      mockLabel.getThreads.mockReturnValue([mockThread]);

      script.run();

      expect(mocks.UrlFetchApp.fetch).toHaveBeenCalled();
      const callArgs = mocks.UrlFetchApp.fetch.mock.calls[0];
      const payload = JSON.parse(callArgs[1].payload);

      expect(payload.schema_version).toBe("1.0.0");
      expect(payload.source).toBe("gmail_webhook");
      expect(payload.label).toBe("capehost/webhook");
      expect(payload.threadId).toBe("thread-123");
      expect(payload.messageCount).toBe(1);
      expect(payload.messages).toHaveLength(1);
      expect(payload.messages[0]).toMatchObject({
        id: "msg-123",
        from: "sender@example.com",
        to: "recipient@example.com",
        cc: "cc@example.com",
        subject: "Test Subject",
        bodyPlain: "Plain text body",
        bodyHtml: "<html>HTML body</html>",
      });
      expect(payload.messages[0].date).toBeDefined();
    });

    it("should remove label only on successful webhook request", () => {
      mockLabel.getThreads.mockReturnValue([mockThread]);
      mockResponse.getResponseCode.mockReturnValue(200);

      script.run();

      expect(mockThread.removeLabel).toHaveBeenCalledWith(mockLabel);
      expect(mockThread.addLabel).not.toHaveBeenCalled();
    });

    it("should keep label and add failed label on webhook failure", () => {
      mockLabel.getThreads.mockReturnValue([mockThread]);
      mockResponse.getResponseCode.mockReturnValue(500);
      mockResponse.getContentText.mockReturnValue("Internal Server Error");
      const mockFailedLabel = { getName: vi.fn(() => "capehost/webhook-failed") };
      mocks.GmailApp.getUserLabelByName.mockImplementation((name) => {
        if (name === "capehost/webhook") return mockLabel;
        if (name === "capehost/webhook-failed") return null;
        return null;
      });
      mocks.GmailApp.createLabel.mockReturnValue(mockFailedLabel);

      script.run();

      expect(mockThread.removeLabel).not.toHaveBeenCalled();
      expect(mockThread.addLabel).toHaveBeenCalledWith(mockFailedLabel);
    });

    it("should log processing information", () => {
      mockLabel.getThreads.mockReturnValue([mockThread]);
      mockResponse.getResponseCode.mockReturnValue(200);

      script.run();

      expect(mocks.Logger.log).toHaveBeenCalledWith(
        `Thread thread-123: Processing 1 message(s) - Subjects: Test Subject`
      );
      expect(mocks.Logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Request completed successfully for thread thread-123")
      );
      expect(mocks.Logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Summary: Processed 1 message(s) total. Successful: 1, Failed: 0")
      );
    });
  });

  describe("postToWorker function", () => {
    it("should send POST request with Bearer token authorization", () => {
      const payload = {
        source: "gmail_webhook",
        messages: [{ id: "msg-123" }],
      };

      script.postToWorker(payload);

      expect(mocks.UrlFetchApp.fetch).toHaveBeenCalledWith(
        "https://api.capehost.ai/webhooks/email",
        expect.objectContaining({
          method: "post",
          contentType: "application/json",
          headers: {
            Authorization: "Bearer test-token-123",
          },
        })
      );
    });

    it("should include payload in request", () => {
      const payload = {
        source: "gmail_webhook",
        messages: [{ id: "msg-123" }],
      };

      script.postToWorker(payload);

      const callArgs = mocks.UrlFetchApp.fetch.mock.calls[0];
      expect(callArgs[1].payload).toBeTruthy();
      expect(JSON.parse(callArgs[1].payload)).toMatchObject(payload);
    });

    it("should return error object on HTTP error response", () => {
      mockResponse.getResponseCode.mockReturnValue(500);
      mockResponse.getContentText.mockReturnValue("Internal Server Error");

      const payload = { source: "gmail_webhook", messages: [] };

      const result = script.postToWorker(payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Worker error 500: Internal Server Error");
      expect(result.statusCode).toBe(500);
      expect(mocks.Logger.log).toHaveBeenCalledWith(
        "ERROR: Worker error 500: Internal Server Error"
      );
    });

    it("should return success object with metadata", () => {
      mockResponse.getResponseCode.mockReturnValue(200);

      const payload = { source: "gmail_webhook", messages: [] };
      const metadata = {
        batchNumber: 1,
        messageCount: 2,
        subjects: ["Subject 1", "Subject 2"],
      };

      const result = script.postToWorker(payload, metadata);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.message).toContain("Success (HTTP 200)");
      expect(result.message).toContain("Batch #1");
      expect(result.message).toContain("2 message(s)");
      expect(result.message).toContain("Subjects: Subject 1, Subject 2");
    });

    it("should handle 4xx status codes as errors", () => {
      mockResponse.getResponseCode.mockReturnValue(401);
      mockResponse.getContentText.mockReturnValue("Unauthorized");

      const payload = { source: "gmail_webhook", messages: [] };

      const result = script.postToWorker(payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Worker error 401: Unauthorized");
      expect(result.statusCode).toBe(401);
    });

    it("should include batch information in success message", () => {
      mockResponse.getResponseCode.mockReturnValue(200);

      const payload = { source: "gmail_webhook", messages: [] };
      const metadata = { batchNumber: 3 };

      const result = script.postToWorker(payload, metadata);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Batch #3");
    });

    it("should handle metadata with only some fields", () => {
      mockResponse.getResponseCode.mockReturnValue(200);

      const payload = { source: "gmail_webhook", messages: [] };
      const metadata = { messageCount: 5 };

      const result = script.postToWorker(payload, metadata);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Success (HTTP 200)");
      expect(result.message).toContain("5 message(s)");
      expect(result.message).not.toContain("Batch");
    });

    it("should handle empty metadata", () => {
      mockResponse.getResponseCode.mockReturnValue(200);

      const payload = { source: "gmail_webhook", messages: [] };

      const result = script.postToWorker(payload);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe("Success (HTTP 200)");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty threads array", () => {
      mockLabel.getThreads.mockReturnValue([]);

      script.run();

      expect(mocks.Logger.log).toHaveBeenCalledWith(
        `Found 0 thread(s) with label: capehost/webhook`
      );
      expect(mocks.Logger.log).toHaveBeenCalledWith(
        `Summary: Processed 0 message(s) total. Successful: 0, Failed: 0. Subject lines: `
      );
      expect(mocks.UrlFetchApp.fetch).not.toHaveBeenCalled();
    });

    it("should handle thread with no messages", () => {
      mockThread.getMessages.mockReturnValue([]);
      mockLabel.getThreads.mockReturnValue([mockThread]);

      script.run();

      const callArgs = mocks.UrlFetchApp.fetch.mock.calls[0];
      const payload = JSON.parse(callArgs[1].payload);
      expect(payload.messages).toHaveLength(0);
    });

    it("should handle messages with missing optional fields", () => {
      const minimalMessage = {
        getId: vi.fn(() => "msg-456"),
        getDate: vi.fn(() => new Date("2024-01-01T00:00:00Z")),
        getFrom: vi.fn(() => ""),
        getTo: vi.fn(() => ""),
        getCc: vi.fn(() => ""),
        getSubject: vi.fn(() => ""),
        getPlainBody: vi.fn(() => ""),
        getBody: vi.fn(() => ""),
      };
      mockThread.getMessages.mockReturnValue([minimalMessage]);
      mockLabel.getThreads.mockReturnValue([mockThread]);

      script.run();

      const callArgs = mocks.UrlFetchApp.fetch.mock.calls[0];
      const payload = JSON.parse(callArgs[1].payload);
      expect(payload.messages[0].id).toBe("msg-456");
      expect(payload.messages[0].from).toBe("");
      expect(payload.messages[0].subject).toBe("");
    });

    it("should handle multiple threads", () => {
      const thread2 = {
        getId: vi.fn(() => "thread-456"),
        getMessages: vi.fn(() => [mockMessage]),
        removeLabel: vi.fn(),
      };
      mockLabel.getThreads.mockReturnValue([mockThread, thread2]);

      script.run();

      expect(mocks.UrlFetchApp.fetch).toHaveBeenCalledTimes(2);
      expect(mockThread.removeLabel).toHaveBeenCalled();
      expect(thread2.removeLabel).toHaveBeenCalled();
      // Both threads should succeed and remove labels
    });

    it("should handle messages slice when fewer than MAX_MESSAGES_PER_THREAD", () => {
      const singleMessage = [mockMessage];
      mockThread.getMessages.mockReturnValue(singleMessage);
      mockLabel.getThreads.mockReturnValue([mockThread]);

      script.run();

      const callArgs = mocks.UrlFetchApp.fetch.mock.calls[0];
      const payload = JSON.parse(callArgs[1].payload);
      expect(payload.messages).toHaveLength(1);
    });
  });
});
