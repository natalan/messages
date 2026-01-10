/**
 * Email delivery service
 * Sends suggested reply drafts and notifications to host
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
  // MVP: Stub implementation
  // TODO: Integrate with email service (SendGrid, Resend, etc.)

  const { to, subject, draft, metadata } = options;

  if (!to) {
    return { success: false, error: "Recipient email required" };
  }

  // For MVP, we'll just log the email that would be sent
  // In production, this would use an email service API
  console.log("Email delivery (stub):", {
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

  // In production, this would be:
  // const emailService = new EmailService(env.EMAIL_API_KEY);
  // const result = await emailService.send({
  //   to: env.HOST_EMAIL || to,
  //   subject: `[Suggested Reply] ${subject}`,
  //   html: generateEmailTemplate(draft, metadata),
  // });

  return {
    success: true,
    messageId: `stub-${Date.now()}`,
  };
}

/**
 * Generate email template HTML (for future use)
 * @param {string} draft - Suggested reply draft
 * @param {Object} metadata - Metadata
 * @returns {string} - HTML email template
 */
// eslint-disable-next-line no-unused-vars
function generateEmailTemplate(draft, metadata) {
  // Placeholder template - would be expanded in production
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Suggested Reply for Guest Message</h2>
      ${metadata.property_id ? `<p><strong>Property:</strong> ${metadata.property_id}</p>` : ""}
      ${metadata.booking_id ? `<p><strong>Booking:</strong> ${metadata.booking_id}</p>` : ""}
      ${metadata.guest_name ? `<p><strong>Guest:</strong> ${metadata.guest_name}</p>` : ""}
      <hr>
      <h3>Suggested Reply:</h3>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">
${draft}
      </div>
    </div>
  `;
}
