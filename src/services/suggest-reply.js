/**
 * Reply suggestion service
 * Generates suggested reply drafts based on thread and property context
 */

/**
 * Generate a suggested reply draft
 * @param {Object} thread - Thread data (normalized content)
 * @param {Object|null} propertyContext - Property context (optional)
 * @returns {Promise<{draft: string, confidence: number}>} - Suggested reply draft and confidence score
 */
export async function suggestReply(thread, propertyContext = null) {
  // MVP: Return a placeholder/mock reply
  // TODO: Integrate with AI service (OpenAI, Anthropic, etc.) for actual reply generation

  const latestGuestMessage = thread.latest_guest_message;

  if (!latestGuestMessage) {
    return {
      draft: "Thank you for your message. We'll get back to you soon.",
      confidence: 0.5,
    };
  }

  // Simple placeholder logic based on message content
  const guestMessageLower = (latestGuestMessage.bodyPlain || "").toLowerCase();
  let draft = "";

  if (guestMessageLower.includes("check-in") || guestMessageLower.includes("arrival")) {
    draft = "Thank you for reaching out about your check-in. We're looking forward to hosting you. Please let us know if you have any questions about your stay.";
  } else if (guestMessageLower.includes("check-out") || guestMessageLower.includes("departure")) {
    draft = "Thank you for your message regarding check-out. We hope you enjoyed your stay! If you need anything before your departure, please don't hesitate to ask.";
  } else if (guestMessageLower.includes("question") || guestMessageLower.includes("?")) {
    draft = "Thank you for your question. We're here to help and will get back to you with more information shortly.";
  } else {
    draft = "Thank you for your message. We've received it and will respond soon.";
  }

  // Add property-specific greeting if available
  if (propertyContext?.property_name) {
    draft = `Hello,\n\nThank you for reaching out about ${propertyContext.property_name}.\n\n${draft}`;
  } else {
    draft = `Hello,\n\n${draft}`;
  }

  return {
    draft,
    confidence: 0.6, // Low confidence for placeholder
  };
}
