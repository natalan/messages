/**
 * Knowledge Item type definitions
 */

/**
 * @typedef {Object} KnowledgeItem
 * @property {string} id - Unique identifier
 * @property {string} schema_version - Schema version
 * @property {Date} created_at - Creation timestamp
 * @property {string} source - Source type (gmail_webhook, uplisting_api, etc.)
 * @property {string} ingest_method - Ingest method (webhook, api_sync, manual_upload)
 * @property {string} content_type - Content type (email_message, document, image, note)
 * @property {string|null} property_id - Property identifier (nullable)
 * @property {string|null} booking_id - Booking identifier (nullable)
 * @property {string|null} external_thread_id - External thread identifier (nullable)
 * @property {string|null} platform - Platform identifier (airbnb, vrbo, booking.com, direct, etc.) (nullable)
 * @property {string|null} platform_thread_id - Platform-specific thread ID (nullable, e.g., Airbnb thread number)
 * @property {Object} raw_payload - Raw payload data (JSON/blob)
 * @property {NormalizedContent} normalized - Normalized content
 */

/**
 * @typedef {Object} NormalizedContent
 * @property {Object|null} latest_guest_message - Latest guest message object
 * @property {string} full_thread_text - Full thread text content
 * @property {number} message_count - Number of messages in thread
 * @property {string} subject - Email subject
 * @property {string} from - Sender email address
 * @property {string} to - Recipient email address
 * @property {string[]} timestamps - Array of message timestamps
 * @property {boolean} has_guest_question - Whether the message contains a guest question requiring a reply
 */

/**
 * @typedef {Object} WebhookPayload
 * @property {string} schema_version - Schema version (required, e.g. "1.0.0")
 * @property {string} source - Source type (optional, default: "gmail_webhook")
 * @property {string} [label] - Label/identifier (optional)
 * @property {string} [threadId] - External thread identifier (optional)
 * @property {number} [messageCount] - Total message count (optional, inferred from messages array)
 * @property {string} [property_id] - Property identifier (optional)
 * @property {string} [booking_id] - Booking identifier (optional)
 * @property {EmailMessage[]} messages - Array of email messages (required, must contain at least one)
 */

/**
 * @typedef {Object} EmailMessage
 * @property {string} id - Message identifier
 * @property {string} date - ISO date string
 * @property {string} from - Sender email
 * @property {string} to - Recipient email
 * @property {string} cc - CC recipients
 * @property {string} subject - Message subject
 * @property {string} bodyPlain - Plain text body
 * @property {string} bodyHtml - HTML body
 */

/**
 * @typedef {Object} PropertyContext
 * @property {string} property_id - Property identifier
 * @property {string} property_name - Property name
 * @property {Object} metadata - Additional property metadata
 */
