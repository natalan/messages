# Inbound Webhook Contract

This document defines the contract for the email ingest webhook endpoint.

## Endpoint

`POST /webhooks/email`

Requires Bearer token authentication via `Authorization` header.

## Request Headers

- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json` (required)

## Request Body Schema

The request body must be a JSON object with the following structure:

```json
{
  "schema_version": "1.0.0",
  "source": "gmail_webhook",
  "threadId": "thread-12345",
  "property_id": "prop-abc123",
  "booking_id": "book-xyz789",
  "label": "capehost/inbound",
  "messageCount": 3,
  "messages": [
    {
      "id": "msg-001",
      "date": "2024-01-15T10:30:00Z",
      "from": "guest@example.com",
      "to": "host@capehost.ai",
      "cc": "",
      "subject": "Question about check-in",
      "bodyPlain": "Hello, I have a question about check-in time...",
      "bodyHtml": "<p>Hello, I have a question about check-in time...</p>"
    }
  ]
}
```

## Field Specifications

### Required Fields

- **`schema_version`** (string): Schema version of the payload format. Currently `"1.0.0"`. Used for versioning and future migrations.
- **`messages`** (array): Array of email message objects. Must contain at least one message.

### Optional Fields

- **`source`** (string): Source identifier. Examples: `"gmail_webhook"`, `"uplisting_api"`, `"manual_upload"`. Defaults to `"gmail_webhook"` if not provided.
- **`threadId`** (string): External thread identifier. Used for grouping related messages.
- **`property_id`** (string): Property identifier. Used for property-aware processing and context.
- **`booking_id`** (string): Booking identifier. Used for booking-aware processing.
- **`label`** (string): Label or tag for categorization.
- **`messageCount`** (number): Total message count in thread. If not provided, will be inferred from `messages` array length.

## Message Object Schema

Each message in the `messages` array must be an object with:

### Required Fields

- **`id`** (string): Unique message identifier
- **`from`** (string): Sender email address
- **`date`** (string): ISO 8601 formatted date/time string

### Optional Fields

- **`to`** (string): Recipient email address
- **`cc`** (string): CC recipients (comma-separated)
- **`subject`** (string): Email subject line
- **`bodyPlain`** (string): Plain text email body
- **`bodyHtml`** (string): HTML email body

## Response

### Success Response (200 OK)

```json
{
  "status": "received",
  "knowledge_item_id": "1705312345-abc123",
  "has_suggested_reply": true
}
```

Fields:
- **`status`** (string): Always `"received"` for successful ingestion
- **`knowledge_item_id`** (string): Unique identifier for the stored knowledge item (only present if storage succeeded)
- **`has_suggested_reply`** (boolean): Whether a suggested reply was generated

### Error Responses

#### 400 Bad Request

Invalid payload structure:

```json
{
  "error": "Invalid payload",
  "details": "Payload must contain 'schema_version' string field"
}
```

#### 401 Unauthorized

Missing or invalid authentication token:

```
unauthorized
```

#### 500 Internal Server Error

Server error during processing:

```json
{
  "error": "Failed to process request"
}
```

## Processing Flow

1. **Validation**: Payload structure and required fields are validated
2. **Normalization**: Payload is normalized into internal `KnowledgeItem` format
3. **Storage**: Knowledge item is stored with indexes for thread, booking, and property
4. **Suggestion**: If guest message detected, a suggested reply is generated (via LLM if configured)
5. **Delivery**: Suggested reply delivery is logged (email provider integration can be added in the future)

## Schema Versioning

The `schema_version` field enables future evolution of the webhook contract while maintaining backward compatibility. When breaking changes are introduced, a new schema version will be released, and both old and new versions will be supported during a transition period.

Current schema version: `1.0.0`

## Privacy and PII

The API is designed to handle PII securely:
- Email addresses and message bodies are redacted in logs
- Only sanitized data is returned in debug endpoints
- Raw payloads are stored securely but redacted in responses

## Example cURL Request

```bash
curl -X POST https://api.example.com/webhooks/email \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "schema_version": "1.0.0",
    "source": "gmail_webhook",
    "threadId": "thread-123",
    "messages": [
      {
        "id": "msg-1",
        "date": "2024-01-15T10:30:00Z",
        "from": "guest@example.com",
        "to": "host@capehost.ai",
        "subject": "Check-in question",
        "bodyPlain": "Hello, what time is check-in?"
      }
    ]
  }'
```
