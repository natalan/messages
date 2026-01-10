/**
 * Request validation utilities
 */

/**
 * Validate webhook payload structure
 * @param {any} payload - Payload to validate
 * @returns {{valid: boolean, error?: string}} - Validation result
 */
export function validateWebhookPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Payload must be an object" };
  }

  if (!payload.messages || !Array.isArray(payload.messages)) {
    return { valid: false, error: "Payload must contain 'messages' array" };
  }

  if (payload.messages.length === 0) {
    return { valid: false, error: "Payload must contain at least one message" };
  }

  // Validate each message has required fields
  for (let i = 0; i < payload.messages.length; i++) {
    const msg = payload.messages[i];
    if (!msg.id) {
      return { valid: false, error: `Message ${i} missing required field: id` };
    }
    if (!msg.from) {
      return { valid: false, error: `Message ${i} missing required field: from` };
    }
    if (!msg.date) {
      return { valid: false, error: `Message ${i} missing required field: date` };
    }
  }

  return { valid: true };
}

/**
 * Sanitize log data to avoid logging PII in plaintext
 * @param {any} data - Data to sanitize
 * @returns {any} - Sanitized data
 */
export function sanitizeForLogging(data) {
  if (!data || typeof data !== "object") {
    return data;
  }

  const sensitiveFields = ["from", "to", "cc", "bodyPlain", "bodyHtml", "raw_payload"];
  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      if (typeof sanitized[field] === "string") {
        // Redact email addresses but keep domain
        sanitized[field] = sanitized[field].replace(/[\w.-]+@/g, "***@");
      } else if (typeof sanitized[field] === "object") {
        sanitized[field] = "[REDACTED]";
      }
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (sanitized[key] && typeof sanitized[key] === "object" && !Array.isArray(sanitized[key])) {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }

  return sanitized;
}
