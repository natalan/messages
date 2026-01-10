/**
 * Email provider interface and implementations
 */

/**
 * Email provider interface
 * @interface EmailProvider
 */
export class EmailProvider {
  /**
   * Send an email
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML content
   * @param {string} [options.text] - Plain text content (optional)
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async send(_options) {
    throw new Error("Not implemented");
  }
}

/**
 * Mailgun email provider implementation
 */
export class MailgunProvider extends EmailProvider {
  /**
   * @param {string} apiKey - Mailgun API key
   * @param {string} domain - Mailgun domain
   */
  constructor(apiKey, domain) {
    super();
    this.apiKey = apiKey;
    this.domain = domain;
    this.baseUrl = `https://api.mailgun.net/v3/${domain}`;
  }

  /**
   * Send email via Mailgun API
   * @param {Object} options - Email options
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async send(options) {
    const { to, subject, html, text } = options;

    if (!this.apiKey || !this.domain) {
      return {
        success: false,
        error: "Mailgun API key or domain not configured",
      };
    }

    try {
      const formData = new FormData();
      formData.append("from", `Email Ingest API <noreply@${this.domain}>`);
      formData.append("to", to);
      formData.append("subject", subject);
      if (html) {
        formData.append("html", html);
      }
      if (text) {
        formData.append("text", text);
      }

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`api:${this.apiKey}`)}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Mailgun API error: ${response.status} ${errorText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        messageId: data.id || `mailgun-${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to send email: ${error.message}`,
      };
    }
  }
}

/**
 * SendGrid email provider implementation
 */
export class SendGridProvider extends EmailProvider {
  /**
   * @param {string} apiKey - SendGrid API key
   */
  constructor(apiKey) {
    super();
    this.apiKey = apiKey;
    this.baseUrl = "https://api.sendgrid.com/v3/mail/send";
  }

  /**
   * Send email via SendGrid API
   * @param {Object} options - Email options
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async send(options) {
    const { to, subject, html, text } = options;

    if (!this.apiKey) {
      return {
        success: false,
        error: "SendGrid API key not configured",
      };
    }

    try {
      const payload = {
        personalizations: [
          {
            to: [{ email: to }],
          },
        ],
        from: {
          email: "noreply@capehost.ai",
          name: "Email Ingest API",
        },
        subject,
        content: [],
      };

      if (html) {
        payload.content.push({
          type: "text/html",
          value: html,
        });
      }

      if (text) {
        payload.content.push({
          type: "text/plain",
          value: text,
        });
      }

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `SendGrid API error: ${response.status} ${errorText}`,
        };
      }

      // SendGrid returns 202 Accepted with message ID in X-Message-Id header
      const messageId = response.headers.get("x-message-id") || `sendgrid-${Date.now()}`;

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to send email: ${error.message}`,
      };
    }
  }
}

/**
 * Create email provider based on environment configuration
 * @param {Object} env - Environment variables
 * @returns {EmailProvider} - Configured email provider
 */
export function createEmailProvider(env) {
  // Prefer Mailgun if configured
  if (env.MAILGUN_API_KEY && env.MAILGUN_DOMAIN) {
    return new MailgunProvider(env.MAILGUN_API_KEY, env.MAILGUN_DOMAIN);
  }

  // Fall back to SendGrid if configured
  if (env.SENDGRID_API_KEY) {
    return new SendGridProvider(env.SENDGRID_API_KEY);
  }

  // Return null if no provider configured (will use stub)
  return null;
}
