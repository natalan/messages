/**
 * CONFIG
 */
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
        // Plain text body is easiest for MVP.
        bodyPlain: m.getPlainBody() || "",
        // If you want HTML later:
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
      Logger.log(`Request completed successfully for thread ${thread.getId()}: ${result.message}`);
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