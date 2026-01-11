/**
 * Platform normalizers registry and factory
 */

import { AirbnbNormalizer } from "./airbnb.js";
import { VrboNormalizer } from "./vrbo.js";
import { DirectNormalizer } from "./direct.js";

/**
 * Registry of platform normalizers
 * Order matters - platform normalizers are checked before direct normalizer
 */
const NORMALIZERS = [
  new AirbnbNormalizer(),
  new VrboNormalizer(),
  new DirectNormalizer(), // Fallback for non-platform emails
];

/**
 * Get the appropriate normalizer for a message
 * @param {import("../../types/knowledge-item.js").EmailMessage} message - Email message
 * @returns {import("./base.js").PlatformNormalizer|null} - Matching normalizer or null
 */
export function getNormalizerForMessage(message) {
  if (!message || !message.from) {
    return null;
  }

  // Check all normalizers (including direct normalizer)
  // Direct normalizer will handle non-host, non-platform emails
  for (const normalizer of NORMALIZERS) {
    if (normalizer.isFromPlatform(message)) {
      return normalizer;
    }
  }

  // No normalizer matched (e.g., host-to-host emails)
  return null;
}

/**
 * Get normalizer by platform identifier
 * @param {string} platform - Platform identifier (airbnb, vrbo, direct)
 * @returns {import("./base.js").PlatformNormalizer|null} - Matching normalizer or null
 */
export function getNormalizerByPlatform(platform) {
  if (!platform) {
    return null;
  }

  return NORMALIZERS.find((normalizer) => normalizer.getPlatform() === platform) || null;
}

/**
 * Detect platform from email sender
 * @param {string} fromEmail - Email sender address
 * @returns {string|null} - Platform identifier or null
 */
export function detectPlatform(fromEmail) {
  if (!fromEmail) {
    return null;
  }

  // Create a dummy message to use normalizer detection
  const dummyMessage = { from: fromEmail };
  const normalizer = getNormalizerForMessage(dummyMessage);
  return normalizer ? normalizer.getPlatform() : null;
}
