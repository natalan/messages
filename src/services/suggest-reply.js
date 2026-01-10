/**
 * Reply suggestion service
 * Generates suggested reply drafts based on thread and property context
 */

import { createLLMProvider } from "./llm-provider.js";
import { KVStorageAdapter } from "../storage/index.js";

const storageAdapter = new KVStorageAdapter();

/**
 * Generate a suggested reply draft
 * @param {Object} thread - Thread data (normalized content)
 * @param {Object|null} propertyContext - Property context (optional)
 * @param {Object|null} env - Environment variables (optional, for LLM provider)
 * @returns {Promise<{draft: string, confidence: number}>} - Suggested reply draft and confidence score
 */
export async function suggestReply(thread, propertyContext = null, env = null) {
  const latestGuestMessage = thread.latest_guest_message;

  if (!latestGuestMessage) {
    return {
      draft: "Thank you for your message. We'll get back to you soon.",
      confidence: 0.5,
    };
  }

  // Try to use LLM provider if configured
  if (env) {
    const llmProvider = createLLMProvider(env);
    if (llmProvider) {
      try {
        // Fetch property context from storage if property_id is available
        let propertyContextText = null;
        if (propertyContext?.property_id && env) {
          try {
            propertyContextText = await storageAdapter.getPropertyContext(
              env,
              propertyContext.property_id
            );
          } catch (error) {
            console.warn("Failed to fetch property context:", error.message);
          }
        }

        // Build prompt for LLM
        let prompt =
          "Generate a professional, friendly email reply for a property host responding to a guest inquiry.\n\n";

        if (propertyContextText) {
          prompt += `Property context:\n${propertyContextText}\n\n`;
        }

        if (propertyContext?.property_name) {
          prompt += `Property name: ${propertyContext.property_name}\n\n`;
        }

        prompt += `Email thread history:\n${thread.full_thread_text}\n\n`;
        prompt += `Latest guest message:\nFrom: ${latestGuestMessage.from}\nSubject: ${latestGuestMessage.subject}\n\n${latestGuestMessage.bodyPlain}\n\n`;
        prompt +=
          "Generate a concise, helpful reply to the guest. Be warm, professional, and address any questions or concerns they may have.";

        const result = await llmProvider.generateReply(prompt);

        console.log(`[${new Date().toISOString()}] LLM-generated reply`, {
          provider: llmProvider.constructor.name,
          confidence: result.confidence,
        });

        return result;
      } catch (llmError) {
        console.error(`[${new Date().toISOString()}] LLM provider error, falling back to stub`, {
          error: llmError.message,
        });
        // Fall through to stub implementation
      }
    }
  }

  // Fallback to stub implementation if no LLM provider or if LLM fails
  const guestMessageLower = (latestGuestMessage.bodyPlain || "").toLowerCase();
  let draft = "";

  if (guestMessageLower.includes("check-in") || guestMessageLower.includes("arrival")) {
    draft =
      "Thank you for reaching out about your check-in. We're looking forward to hosting you. Please let us know if you have any questions about your stay.";
  } else if (guestMessageLower.includes("check-out") || guestMessageLower.includes("departure")) {
    draft =
      "Thank you for your message regarding check-out. We hope you enjoyed your stay! If you need anything before your departure, please don't hesitate to ask.";
  } else if (guestMessageLower.includes("question") || guestMessageLower.includes("?")) {
    draft =
      "Thank you for your question. We're here to help and will get back to you with more information shortly.";
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
