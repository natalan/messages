/**
 * CONFIG
 */
const CFG = {
  LABEL_NAME: "capehost/inbound",
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

  const threads = label.getThreads(0, CFG.MAX_THREADS_PER_RUN);
  Logger.log(`Found ${threads.length} thread(s) with label: ${CFG.LABEL_NAME}`);

  let totalMessagesFound = 0;
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
      source: "gmail",
      label: CFG.LABEL_NAME,
      threadId: thread.getId(),
      messageCount: messages.length,
      messages: slice.map((m) => ({
        id: m.getId(),
        date: m.getDate().toISOString(),
        from: m.getFrom(),
        to: m.getTo(),
        cc: m.getCc(),
        subject: m.getSubject(),
        // Plain text body is easiest for MVP.
        bodyPlain: m.getPlainBody(),
        // If you want HTML later:
        bodyHtml: m.getBody(),
      })),
    };

    const status = postToWorker(payload, {
      batchNumber,
      messageCount: slice.length,
      subjects,
      threadId: thread.getId(),
    });
    Logger.log(`Request completed for thread ${thread.getId()}: ${status}`);

    // MVP behavior: remove label so we don’t re-process the same thread forever.
    // Alternative later: store last seen message id per thread.
    thread.removeLabel(label);
  }

  Logger.log(
    `Summary: Processed ${totalMessagesFound} message(s) total. Subject lines: ${allSubjects.join(" | ")}`
  );
}

function postToWorker(payload, metadata = {}) {
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
    throw new Error(errorMsg);
  }

  const batchInfo = metadata.batchNumber ? `Batch #${metadata.batchNumber}` : "";
  const countInfo = metadata.messageCount ? `${metadata.messageCount} message(s)` : "";
  const subjectsInfo =
    metadata.subjects && metadata.subjects.length > 0
      ? `Subjects: ${metadata.subjects.join(", ")}`
      : "";

  const parts = [`Success (HTTP ${code})`, batchInfo, countInfo, subjectsInfo].filter(Boolean);

  return parts.join(" | ");
}
