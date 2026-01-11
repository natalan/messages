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

    const { guestName, guestMessage } = extractGuestMessageFromBody(message.bodyPlain, message.subject);
    if (!guestMessage || guestMessage.trim().length === 0) {
      return null;
    }

    // Return a synthetic message object with extracted guest info
    return {
      id: message.id,
      date: message.date,
      from: guestName ? `${guestName} (via ${message.from})` : `Guest (via ${message.from})`,
      to: message.to,
      subject: message.subject,
      bodyPlain: guestMessage,
      bodyHtml: message.bodyHtml, // Keep original HTML
    };
  }

  extractPlatformThreadId(bodyPlain, subject) {
    // Try subject first: "Vrbo #4353572"
    if (subject) {
      const vrboMatch = subject.match(/Vrbo #(\d+)/);
      if (vrboMatch && vrboMatch[1]) {
        return vrboMatch[1];
      }
    }

    // Could also extract from body URLs if needed
    // For now, subject extraction is sufficient
    return null;
  }
}
