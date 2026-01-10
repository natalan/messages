/**
 * Email delivery service
 * Sends suggested reply drafts and notifications to host
 */

import { createEmailProvider } from "./email-provider.js";

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

  // Try to use real email provider if configured
  const emailProvider = createEmailProvider(env);

  if (emailProvider) {
    // Use real email provider (Mailgun or SendGrid)
    try {
      const emailSubject = `[Suggested Reply] ${subject}`;
      const htmlContent = generateEmailTemplate(draft, metadata);

      const result = await emailProvider.send({
        to: env.HOST_EMAIL || to,
        subject: emailSubject,
        html: htmlContent,
        text: draft, // Plain text fallback
      });

      if (result.success) {
        console.log(`[${new Date().toISOString()}] Email sent via provider`, {
          provider: emailProvider.constructor.name,
          messageId: result.messageId,
          to: env.HOST_EMAIL || to,
        });
      }

      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Email provider error`, {
        error: error.message,
        stack: error.stack,
      });
      return {
        success: false,
        error: `Email provider error: ${error.message}`,
      };
    }
  }

  // Fallback to stub if no provider configured
  console.warn("Email delivery (stub): No email provider configured", {
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
