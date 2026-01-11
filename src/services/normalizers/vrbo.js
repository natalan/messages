/**
 * VRBO platform normalizer
 */

import { PlatformNormalizer } from "./base.js";

/**
 * VRBO email domains
 */
const VRBO_DOMAINS = ["vrbo.com", "homeaway.com", "messages.homeaway.com"];

/**
 * Extract guest name and message from VRBO email body
 * @param {string} bodyPlain - Plain text body
 * @param {string} subject - Email subject (optional, used to extract guest name)
 * @returns {{guestName: string|null, guestMessage: string|null}} - Extracted guest info
 */
function extractGuestMessageFromBody(bodyPlain, subject) {
  if (!bodyPlain) {
    return { guestName: null, guestMessage: null };
  }

  // VRBO message format:
  // Header: "Vrbo: [Guest Name] has replied to your message"
  // Two newlines
  // Guest message text
  // Footer starts with "-------" or "We're here to help"
  // Example: "Vrbo: Alaina Capasso has replied to your message\n\nHi! I was wondering if I can change dates\n\n\n-------We're here to help..."

  let guestName = null;
  let guestMessage = null;

  // Try to extract guest name from subject first
  // Pattern: "Reservation from [Name]:" or similar
  if (subject) {
    const subjectMatch = subject.match(/Reservation from ([^:]+):/);
    if (subjectMatch && subjectMatch[1]) {
      guestName = subjectMatch[1].trim();
    }
  }

  // Extract from body header line
  const lines = bodyPlain.split("\n");
  const headerPattern = /Vrbo:\s*(.+?)\s+has replied/i;

  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    const match = line.match(headerPattern);
    if (match && match[1]) {
      if (!guestName) {
        guestName = match[1].trim();
      }
      // Message starts after header line and two newlines
      // Find the message start (skip empty lines after header)
      let messageStartIdx = i + 1;
      while (messageStartIdx < lines.length && lines[messageStartIdx].trim() === "") {
        messageStartIdx++;
      }

      // Collect message lines until footer
      const messageLines = [];
      for (let j = messageStartIdx; j < lines.length; j++) {
        const msgLine = lines[j].trim();

        // Stop at footer markers
        if (
          msgLine.startsWith("-------") ||
          msgLine.includes("We're here to help") ||
          msgLine.includes("Help Centre") ||
          msgLine.includes("©") ||
          msgLine.includes("Terms & conditions") ||
          msgLine.includes("Contact Us") ||
          msgLine.includes("Privacy")
        ) {
          break;
        }

        // Skip empty lines
        if (msgLine) {
          messageLines.push(msgLine);
        }
      }

      if (messageLines.length > 0) {
        guestMessage = messageLines.join(" ").trim();
      }

      break;
    }
  }

  return { guestName, guestMessage };
}

/**
 * Extract email address from "Name <email@domain.com>" or "email@domain.com" format
 * @param {string} fromField - From field value
 * @returns {string} - Email address
 */
function extractEmailAddress(fromField) {
  if (!fromField) {
    return "";
  }

  // Match email in angle brackets: "Name <email@domain.com>"
  const match = fromField.match(/<([^>]+)>/);
  if (match && match[1]) {
    return match[1].trim();
  }

  // If no angle brackets, assume the whole field is the email
  return fromField.trim();
}

export class VrboNormalizer extends PlatformNormalizer {
  getPlatform() {
    return "vrbo";
  }

  isFromPlatform(message) {
    if (!message.from) {
      return false;
    }

    const fromEmail = message.from.toLowerCase();
    return VRBO_DOMAINS.some((domain) => fromEmail.includes(domain));
  }

  extractGuestMessage(message) {
    if (!message.bodyPlain) {
      return null;
    }

    const { guestName, guestMessage } = extractGuestMessageFromBody(
      message.bodyPlain,
      message.subject
    );
    if (!guestMessage || guestMessage.trim().length === 0) {
      return null;
    }

    // Extract email address from message.from to avoid duplicate names
    // message.from is typically "Name <email@domain.com>" format
    const emailAddress = extractEmailAddress(message.from);

    // Return a synthetic message object with extracted guest info
    return {
      id: message.id,
      date: message.date,
      from: guestName ? `${guestName} (via ${emailAddress})` : `Guest (via ${emailAddress})`,
      to: message.to,
      subject: message.subject,
      bodyPlain: guestMessage,
      bodyHtml: message.bodyHtml, // Keep original HTML
    };
  }

  extractPlatformThreadId(_bodyPlain, _subject) {
    // VRBO doesn't have a separate thread ID in emails
    // The "Vrbo #4353572" in the subject is the property ID, not a thread ID
    // Thread grouping is handled by external_thread_id (Gmail thread ID)
    return null;
  }

  /**
   * Extract VRBO property ID from email
   * Pattern: "Vrbo #4353572" in subject
   * @param {string} bodyPlain - Plain text body (unused, reserved for future)
   * @param {string} subject - Email subject
   * @returns {string|null} - VRBO property ID or null
   */
  extractPropertyId(_bodyPlain, subject) {
    if (!subject) {
      return null;
    }

    // Extract from subject: "Reservation from [Name]: [Dates] - Vrbo #4353572"
    const vrboMatch = subject.match(/Vrbo #(\d+)/);
    if (vrboMatch && vrboMatch[1]) {
      return vrboMatch[1];
    }

    return null;
  }
}
