/**
 * Base platform normalizer interface
 * All platform normalizers must implement this interface
 */

/**
 * @typedef {Object} ExtractedGuestInfo
 * @property {string|null} guestName - Extracted guest name
 * @property {string|null} guestMessage - Extracted guest message text
 */

/**
 * Platform normalizer base class
 * @abstract
 */
export class PlatformNormalizer {
  /**
   * Get the platform identifier this normalizer handles
   * @returns {string} - Platform identifier (airbnb, vrbo, direct, etc.)
   */
  getPlatform() {
    throw new Error("Not implemented");
  }

  /**
   * Check if an email is from this platform
   * @param {import("../../types/knowledge-item.js").EmailMessage} message - Email message
   * @returns {boolean} - True if message is from this platform
   */
  isFromPlatform(message) {
    throw new Error("Not implemented");
  }

  /**
   * Extract guest message from platform email body
   * @param {import("../../types/knowledge-item.js").EmailMessage} message - Email message
   * @returns {import("../../types/knowledge-item.js").EmailMessage|null} - Extracted guest message or null
   */
  extractGuestMessage(message) {
    throw new Error("Not implemented");
  }

  /**
   * Extract platform-specific thread ID from email
   * @param {string} bodyPlain - Plain text body
   * @param {string} subject - Email subject
   * @returns {string|null} - Platform thread ID or null
   */
  extractPlatformThreadId(bodyPlain, subject) {
    throw new Error("Not implemented");
  }
}
