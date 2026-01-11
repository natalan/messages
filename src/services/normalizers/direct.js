/**
 * Direct email normalizer (for non-platform emails)
 */

import { PlatformNormalizer } from "./base.js";

/**
 * Host domains - emails from these domains are not considered guest messages
 */
const HOST_DOMAINS = ["capehost.ai", "capehost.com"];

export class DirectNormalizer extends PlatformNormalizer {
  getPlatform() {
    return "direct";
  }

  isFromPlatform(message) {
    // Direct normalizer handles messages that are NOT from platforms
    // This is a fallback - platform normalizers are checked first
    if (!message.from) {
      return false;
    }

    // Check if it's from a host domain (not a guest)
    const fromEmail = message.from.toLowerCase();
    const isFromHost = HOST_DOMAINS.some((domain) => fromEmail.includes(`@${domain}`));

    // Direct normalizer handles non-host, non-platform emails
    return !isFromHost;
  }

  extractGuestMessage(message) {
    // For direct emails, the message itself is the guest message
    // (as long as it's not from a host domain, which is checked in isFromPlatform)
    if (!message.from || !message.bodyPlain) {
      return null;
    }

    // Return the message as-is
    return message;
  }

  extractPlatformThreadId(_bodyPlain, _subject) {
    // Direct emails don't have platform thread IDs
    return null;
  }
}
