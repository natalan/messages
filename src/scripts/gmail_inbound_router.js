/**
 * CONFIG
 */
const CFG = {
  LABEL_NAME: "capehost/inbound",
  WORKER_URL: "https://api.capehost.ai/inbound/email",
  // Put a random secret here. Also add the same secret in your Cloudflare Worker env.
  SHARED_SECRET: "REPLACE_WITH_LONG_RANDOM_SECRET",
  // Safety
  MAX_THREADS_PER_RUN: 10,
  MAX_MESSAGES_PER_THREAD: 5,
};

function run() {
  const label = GmailApp.getUserLabelByName(CFG.LABEL_NAME);
  if (!label) throw new Error(`Label not found: ${CFG.LABEL_NAME}`);

  const threads = label.getThreads(0, CFG.MAX_THREADS_PER_RUN);

  for (const thread of threads) {
    const messages = thread.getMessages();
    const slice = messages.slice(Math.max(0, messages.length - CFG.MAX_MESSAGES_PER_THREAD));

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
        // bodyHtml: m.getBody(),
      })),
    };

    postToWorker(payload);

    // MVP behavior: remove label so we don’t re-process the same thread forever.
    // Alternative later: store last seen message id per thread.
    thread.removeLabel(label);
  }
}

function postToWorker(payload) {
  const res = UrlFetchApp.fetch(CFG.WORKER_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    headers: {
      "X-Capehost-Secret": CFG.SHARED_SECRET,
    },
  });

  const code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    const text = res.getContentText();
    throw new Error(`Worker error ${code}: ${text}`);
  }
}
