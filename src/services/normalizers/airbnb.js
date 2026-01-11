/**
 * Airbnb platform normalizer
 */

import { PlatformNormalizer } from "./base.js";

/**
 * Airbnb email domains
 */
const AIRBNB_DOMAINS = ["airbnb.com", "airbnbmail.com"];

/**
 * Extract guest name and message from Airbnb email body
 * @param {string} bodyPlain - Plain text body
 * @returns {{guestName: string|null, guestMessage: string|null}} - Extracted guest info
 */
function extractGuestMessageFromBody(bodyPlain) {
  if (!bodyPlain) {
    return { guestName: null, guestMessage: null };
  }

  // Airbnb message format:
  // Guest name appears before the message text
  // Pattern: NAME\n\n   [Role]\n   \n   [Message text]
  // Example: "ALISON\n   \n   Booker\n   \n   Thank you!"

  const lines = bodyPlain.split("\n");
  let guestName = null;
  let guestMessage = null;
  let inMessageBlock = false;
  const messageLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and tracking codes
    if (!line || line.startsWith("%") || line.startsWith("http")) {
      continue;
    }

    // Look for uppercase name (likely guest name)
    if (!guestName && line === line.toUpperCase() && line.length > 1 && line.length < 50) {
      // Check if next line is a role (Booker, Guest, etc.)
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : "";
      if (nextLine === "Booker" || nextLine === "Guest" || nextLine === "") {
        guestName = line;
        inMessageBlock = true;
        continue;
      }
    }

    // Collect message lines after finding the guest name
    if (inMessageBlock) {
      // Stop at common email footer markers
      if (
        line.includes("Reply") ||
        line.includes("You can also respond") ||
        line.includes("RESERVATION FOR") ||
        line.includes("Check-in") ||
        line.includes("GUESTS")
      ) {
        break;
      }

      // Skip role labels
      if (line === "Booker" || line === "Guest") {
        continue;
      }

      // Collect meaningful message lines
      if (line && !line.match(/^[A-Z\s]+$/)) {
        // Not all caps (likely actual message text)
        messageLines.push(line);
      }
    }
  }

  // Join message lines
  if (messageLines.length > 0) {
    guestMessage = messageLines.join(" ").trim();
  }

  return { guestName, guestMessage };
}

export class AirbnbNormalizer extends PlatformNormalizer {
  getPlatform() {
    return "airbnb";
  }

  isFromPlatform(message) {
    if (!message.from) {
      return false;
    }

    const fromEmail = message.from.toLowerCase();
    return AIRBNB_DOMAINS.some((domain) => fromEmail.includes(domain));
  }

  extractGuestMessage(message) {
    if (!message.bodyPlain) {
      return null;
    }

    const { guestName, guestMessage } = extractGuestMessageFromBody(message.bodyPlain);
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

  extractPlatformThreadId(bodyPlain, _subject) {
    if (!bodyPlain) {
      return null;
    }

    // Airbnb thread URLs: /hosting/thread/2397383785
    const match = bodyPlain.match(/\/hosting\/thread\/(\d+)/);
    if (match && match[1]) {
      return match[1];
    }

    return null;
  }
}
