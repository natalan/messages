/**
 * Normalization service
 * Extracts latest guest message and full thread history from raw payload
 */

import { SCHEMA_VERSION, SOURCE_TYPES, CONTENT_TYPES, INGEST_METHODS } from "../types/schema.js";
import { getNormalizerForMessage, detectPlatform } from "./normalizers/index.js";

/**
 * Check if message contains a guest question (vs just confirmation/thanks)
 * @param {string} guestMessage - Extracted guest message text
 * @param {string} _subject - Email subject (unused for now, reserved for future use)
 * @returns {boolean} - True if message contains a question
 */
function hasGuestQuestion(guestMessage, _subject) {
  if (!guestMessage) {
    return false;
  }

  const messageLower = guestMessage.toLowerCase();

  // Question indicators
  const questionWords = [
    "?",
    "how",
    "what",
    "when",
    "where",
    "why",
    "can",
    "could",
    "would",
    "should",
    "is",
    "are",
    "do",
    "does",
    "will",
  ];
  const hasQuestionMark = messageLower.includes("?");
  const hasQuestionWord = questionWords.some((word) => messageLower.includes(word));

  // Simple confirmations/thanks that are NOT questions
  const confirmationPatterns = [
    /^(thank you|thanks|thankyou)$/i,
    /^(ok|okay|sounds good)$/i,
    /^(confirmed|confirmation)$/i,
    /^(perfect|great|excellent)$/i,
  ];

  const isJustConfirmation = confirmationPatterns.some((pattern) =>
    pattern.test(guestMessage.trim())
  );

  // If it's just a confirmation, it's not a question
  if (isJustConfirmation) {
    return false;
  }

  // Check for question marks or question words (with some context)
  if (hasQuestionMark) {
    return true;
  }

  // Check for question words that indicate actual questions (not just casual use)
  if (hasQuestionWord && messageLower.length > 20) {
    // Longer messages with question words are more likely to be actual questions
    return true;
  }

  return false;
}

/**
 * Extract the latest guest message from thread
 * Uses platform normalizers to extract guest messages from platform emails
 * @param {import("../types/knowledge-item.js").EmailMessage[]} messages - Array of messages
 * @returns {import("../types/knowledge-item.js").EmailMessage|null} - Latest guest message or null
 */
export function extractLatestGuestMessage(messages) {
  if (!messages || messages.length === 0) {
    return null;
  }

  // Sort messages by date (newest first)
  const sortedMessages = [...messages].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB - dateA; // Descending order
  });

  // Check each message (newest first)
  for (const message of sortedMessages) {
    // Get the appropriate normalizer for this message
    const normalizer = getNormalizerForMessage(message);
    if (!normalizer) {
      // No normalizer matched (e.g., host-to-host emails) - skip
      continue;
    }

    // Use the normalizer to extract the guest message
    const guestMessage = normalizer.extractGuestMessage(message);
    if (guestMessage) {
      return guestMessage;
    }
  }

  // No guest message found
  return null;
}

/**
 * Build full thread text from messages
 * @param {import("../types/knowledge-item.js").EmailMessage[]} messages - Array of messages
 * @returns {string} - Full thread text
 */
export function buildFullThreadText(messages) {
  if (!messages || messages.length === 0) {
    return "";
  }

  // Sort messages by date (oldest first) for chronological thread
  const sortedMessages = [...messages].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA - dateB; // Ascending order
  });

  return sortedMessages
    .map((msg, index) => {
      const header = `--- Message ${index + 1} ---
From: ${msg.from}
To: ${msg.to}
Date: ${msg.date}
Subject: ${msg.subject}

`;
      const body = msg.bodyPlain || msg.bodyHtml || "";
      return header + body;
    })
    .join("\n\n");
}

/**
 * Normalize webhook payload into knowledge item structure
 * @param {import("../types/knowledge-item.js").WebhookPayload} payload - Raw webhook payload
 * @param {string} source - Source type (default: gmail_webhook)
 * @param {string|null} property_id - Property identifier (optional, will use payload.property_id if not provided)
 * @param {string|null} booking_id - Booking identifier (optional, will use payload.booking_id if not provided)
 * @returns {import("../types/knowledge-item.js").KnowledgeItem} - Normalized knowledge item
 */
export function normalizeWebhookPayload(
  payload,
  source = SOURCE_TYPES.GMAIL_WEBHOOK,
  property_id = null,
  booking_id = null
) {
  const messages = payload.messages || [];
  const latestGuestMessage = extractLatestGuestMessage(messages);
  const fullThreadText = buildFullThreadText(messages);

  // Extract timestamps
  const timestamps = messages.map((m) => m.date || m.id);

  // Get first message for metadata
  const firstMessage = messages[0] || {};
  const lastMessage = messages[messages.length - 1] || {};

  // Use last message subject (most recent)
  const subject = lastMessage.subject || firstMessage.subject || "No Subject";

  // Determine from/to based on latest message
  const from = lastMessage.from || firstMessage.from || "";
  const to = lastMessage.to || firstMessage.to || "";

  // Detect platform from latest message
  const platform = detectPlatform(from);

  // Extract platform thread ID using the appropriate normalizer
  let platformThreadId = null;
  if (platform && lastMessage.bodyPlain) {
    const normalizer = getNormalizerForMessage(lastMessage);
    if (normalizer) {
      platformThreadId = normalizer.extractPlatformThreadId(lastMessage.bodyPlain, subject);
    }
  }

  // Extract property ID from platform email if not provided in payload
  // This allows normalizers to extract platform-specific property identifiers
  let extractedPropertyId = null;
  if (platform && lastMessage.bodyPlain) {
    const normalizer = getNormalizerForMessage(lastMessage);
    if (normalizer && typeof normalizer.extractPropertyId === "function") {
      extractedPropertyId = normalizer.extractPropertyId(lastMessage.bodyPlain, subject);
    }
  }

  // Check if there's a guest question
  const guestMessageText = latestGuestMessage?.bodyPlain || null;
  const hasQuestion = hasGuestQuestion(guestMessageText, subject);

  const normalized = {
    latest_guest_message: latestGuestMessage
      ? {
          id: latestGuestMessage.id,
          date: latestGuestMessage.date,
          from: latestGuestMessage.from,
          subject: latestGuestMessage.subject,
          bodyPlain: latestGuestMessage.bodyPlain,
        }
      : null,
    full_thread_text: fullThreadText,
    message_count: messages.length,
    subject,
    from,
    to,
    timestamps,
    has_guest_question: hasQuestion,
  };

  // Use schema_version from payload, fall back to current SCHEMA_VERSION
  const schemaVersion = payload.schema_version || SCHEMA_VERSION;

  // Extract property_id and booking_id from payload if not provided as parameters
  // Use extracted property ID from normalizer if payload doesn't provide it
  const finalPropertyId = property_id || payload.property_id || extractedPropertyId || null;
  const finalBookingId = booking_id || payload.booking_id || null;

  // Use source from payload if available, otherwise use parameter
  const finalSource = payload.source || source;

  return {
    id: null, // Will be generated by storage adapter
    schema_version: schemaVersion,
    created_at: new Date(),
    source: finalSource,
    ingest_method: INGEST_METHODS.WEBHOOK,
    content_type: CONTENT_TYPES.EMAIL_MESSAGE,
    property_id: finalPropertyId,
    booking_id: finalBookingId,
    external_thread_id: payload.threadId || null,
    platform: platform || null,
    platform_thread_id: platformThreadId || null,
    raw_payload: payload,
    normalized,
  };
}
