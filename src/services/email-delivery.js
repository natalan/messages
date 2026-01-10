/**
 * Email delivery service
 * Sends suggested reply drafts and notifications to host
 * Note: Currently uses stub implementation. Email provider integration can be added here in the future.
 */

/**
 * Send email notification to host with suggested reply
 * @param {Object} env - Environment with email configuration
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email (host)
 * @param {string} options.subject - Email subject
 * @param {string} options.draft - Suggested reply draft
 * @param {Object} options.metadata - Additional metadata (property_id, booking_id, etc.)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>} - Delivery result
 */
export async function sendHostNotification(env, options) {
  const { to, subject, draft, metadata } = options;

  if (!to) {
    return { success: false, error: "Recipient email required" };
  }

  // Stub implementation - logs email that would be sent
  // TODO: Integrate with email service (SendGrid, Resend, Mailgun, etc.) for actual delivery
  console.warn("Email delivery (stub):", {
    to,
    subject: `[Suggested Reply] ${subject}`,
    hasDraft: !!draft,
    metadata: {
      property_id: metadata?.property_id || null,
      booking_id: metadata?.booking_id || null,
      guest_name: metadata?.guest_name || null,
      timestamps: metadata?.timestamps || [],
    },
  });

  return {
    success: true,
    messageId: `stub-${Date.now()}`,
  };
}
