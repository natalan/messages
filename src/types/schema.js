/**
 * Schema versioning constants
 */
export const SCHEMA_VERSION = "1.0.0";

/**
 * Supported ingestion sources
 */
export const SOURCE_TYPES = {
  GMAIL_WEBHOOK: "gmail_webhook",
  UPLISTING_API: "uplisting_api",
  MANUAL_UPLOAD: "manual_upload",
};

/**
 * Supported content types
 */
export const CONTENT_TYPES = {
  EMAIL_MESSAGE: "email_message",
  DOCUMENT: "document",
  IMAGE: "image",
  NOTE: "note",
};

/**
 * Supported ingest methods
 */
export const INGEST_METHODS = {
  WEBHOOK: "webhook",
  API_SYNC: "api_sync",
  MANUAL_UPLOAD: "manual_upload",
};
