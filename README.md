# Email Ingest API

A Cloudflare Worker project for ingesting emails from booking channels (Airbnb, VRBO, direct) and generating suggested reply drafts for hosts. The system is property-aware and booking-aware, processing email threads through a complete pipeline: Ingest → Normalize → Store → Suggest → Deliver.

## Getting Started

### Prerequisites

- Node.js (v22 or higher)
- npm or yarn
- A Cloudflare account

### Installation

1. Install dependencies:
```bash
npm install
```

2. Authenticate with Wrangler (if not already authenticated):
```bash
npx wrangler login
```

### Development

1. Create a `.dev.vars` file for local environment variables:
```toml
INGEST_TOKEN=your-development-token-here
HOST_EMAIL=host@example.com
```

2. Create a KV namespace for storage (if using KV):
```bash
# Create production namespace
wrangler kv:namespace create "KNOWLEDGE_ITEMS"

# Create preview namespace for development
wrangler kv:namespace create "KNOWLEDGE_ITEMS" --preview

# Update wrangler.toml with the returned namespace IDs
```

3. Run the development server:
```bash
npm run dev
```

The worker will be available at `http://localhost:8787`

4. Run tests:
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

5. Run linting and formatting:
```bash
# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Deployment

Deploy your worker to Cloudflare:
```bash
npm run deploy
```

## Architecture

### Core Flow (MVP)

1. **Ingest** - POST `/webhooks/email` receives webhook POSTs with email thread data
2. **Normalize** - Extracts latest guest message and builds full thread history
3. **Store** - Persists raw payload and normalized content as a "knowledge item"
4. **Suggest** - Generates suggested reply draft using thread and property context
5. **Deliver** - Sends suggested reply notification to host email

### Project Structure

```
.
├── src/
│   ├── index.js                    # Main worker entry point and routing
│   ├── types/                      # Type definitions and schema versioning
│   │   ├── schema.js              # Schema versioning constants and enums
│   │   ├── knowledge-item.js      # Knowledge item type definitions
│   │   └── index.js
│   ├── storage/                    # Storage adapter interface and implementations
│   │   ├── adapter.js             # Storage adapter interface
│   │   ├── kv-adapter.js          # Cloudflare KV implementation
│   │   └── index.js
│   ├── services/                   # Business logic services
│   │   ├── normalize.js           # Email normalization (extract guest message, build thread)
│   │   ├── validation.js          # Request validation and PII sanitization
│   │   ├── suggest-reply.js       # Reply suggestion service (OpenAI LLM or stub)
│   │   ├── llm-provider.js        # LLM provider interface and OpenAI implementation
│   │   ├── email-delivery.js      # Email delivery service (stub implementation)
│   │   ├── index.js
│   │   └── __tests__/             # Service unit tests
│   ├── routes/                     # Route handlers
│   │   ├── webhooks.js            # Webhook route handlers
│   │   ├── properties.js          # Property context and knowledge endpoints
│   │   ├── threads.js             # Thread retrieval endpoints
│   │   └── bookings.js            # Booking retrieval endpoints
│   ├── utils/                      # Utility functions
│   │   ├── auth.js                # Authentication utilities
│   │   └── __tests__/             # Utility tests
│   ├── scripts/                    # External scripts (Google Apps Script)
│   │   ├── gmail_inbound_router.js  # Gmail to Worker webhook script
│   │   └── __tests__/
│   └── __tests__/                  # Integration tests
├── .github/                        # GitHub templates and workflows
├── vitest.config.mjs               # Vitest configuration
├── wrangler.toml                   # Wrangler configuration with KV bindings
├── package.json                    # Dependencies and scripts
└── README.md                       # This file
```

## API Endpoints

### Public Endpoints

- `GET /health` - Health check endpoint (no authentication required)

### Protected Endpoints (Require Bearer Token)

- `POST /webhooks/email` - Receive email webhooks with thread data
- `POST /properties/:property_id/context` - Store property context text
- `GET /properties/:property_id/knowledge?limit=N` - Retrieve property knowledge items
- `GET /threads/:external_thread_id` - Retrieve all knowledge items for a thread
- `GET /bookings/:booking_id` - Retrieve threads and items for a booking

### POST /webhooks/email

Receives email thread data via webhook and processes it through the complete pipeline.

**Request:**
```json
{
  "schema_version": "1.0.0",
  "source": "gmail_webhook",
  "threadId": "thread-123",
  "property_id": "prop-abc123",
  "booking_id": "book-xyz789",
  "messageCount": 2,
  "messages": [
    {
      "id": "msg-1",
      "date": "2024-01-01T10:00:00Z",
      "from": "guest@example.com",
      "to": "host@capehost.ai",
      "cc": "",
      "subject": "Question about booking",
      "bodyPlain": "Message text",
      "bodyHtml": "<p>Message text</p>"
    }
  ]
}
```

**Response:**
```json
{
  "status": "received",
  "knowledge_item_id": "1234567890-abc123",
  "has_suggested_reply": true
}
```

**Note:** The `schema_version` field is required. See `docs/WEBHOOK_CONTRACT.md` for complete webhook contract documentation.

### POST /properties/:property_id/context

Store property context text for use in reply suggestions.

**Request Body:**
```json
{
  "context": "This is a beautiful beachfront property with 3 bedrooms..."
}
```

**Response:**
```json
{
  "status": "stored",
  "property_id": "prop-123"
}
```

### GET /properties/:property_id/knowledge

Retrieve knowledge items for a property.

**Query Parameters:**
- `limit` (optional) - Maximum number of items to return

**Response:**
```json
{
  "property_id": "prop-123",
  "items": [...],
  "count": 5
}
```

**Note:** All GET endpoints sanitize responses to redact PII (emails, raw payloads).

### GET /threads/:external_thread_id

Retrieve all knowledge items for a thread, ordered chronologically.

**Response:**
```json
{
  "external_thread_id": "thread-123",
  "items": [...],
  "count": 3
}
```

### GET /bookings/:booking_id

Retrieve all threads and knowledge items associated with a booking.

**Response:**
```json
{
  "booking_id": "book-456",
  "threads": ["thread-123", "thread-124"],
  "items": [...],
  "item_count": 5,
  "thread_count": 2
}
```

## Environment Variables

Set the following in your Cloudflare Workers dashboard or `.dev.vars` for local development:

### Required
- `INGEST_TOKEN` - Bearer token for authenticating webhook requests (required)

### Optional
- `INGEST_TOKEN_OLD` - Old bearer token for token rotation support (optional)
- `HOST_EMAIL` - Host email address for receiving suggested replies (optional, defaults to `host@capehost.ai`)
- `OPENAI_API_KEY` - OpenAI API key for LLM-powered reply suggestions (optional, uses stub if not configured)
- `OPENAI_MODEL` - OpenAI model to use (optional, defaults to `gpt-4o-mini`)

### Cloudflare KV Namespace

The system uses Cloudflare KV for storing knowledge items. Create a KV namespace and bind it in `wrangler.toml`:

```bash
# Create production namespace
wrangler kv:namespace create "KNOWLEDGE_ITEMS"

# Create preview namespace for development
wrangler kv:namespace create "KNOWLEDGE_ITEMS" --preview
```

Then update `wrangler.toml` with the namespace IDs:
```toml
[[kv_namespaces]]
binding = "KNOWLEDGE_ITEMS"
id = "your-namespace-id"
```

**Note:** Never commit `.dev.vars` or any secrets to the repository.

## Data Model

Knowledge items are stored with the following structure:

```javascript
{
  id: "unique-id",
  schema_version: "1.0.0",
  created_at: Date,
  source: "gmail_webhook" | "uplisting_api" | "manual_upload",
  ingest_method: "webhook" | "api_sync" | "manual_upload",
  content_type: "email_message" | "document" | "image" | "note",
  property_id: string | null,
  booking_id: string | null,
  external_thread_id: string | null,
  raw_payload: Object,
  normalized: {
    latest_guest_message: Object | null,
    full_thread_text: string,
    message_count: number,
    subject: string,
    from: string,
    to: string,
    timestamps: string[]
  }
}
```

## Testing

This project uses [Vitest](https://vitest.dev/) with [@cloudflare/vitest-pool-workers](https://developers.cloudflare.com/workers/testing/vitest-integration/) for testing Cloudflare Workers in the Workers runtime environment.

Tests are located in:
- `src/__tests__/` - Integration tests for the worker routes
- `src/services/__tests__/` - Unit tests for service logic (normalization, validation)
- `src/utils/__tests__/` - Unit tests for utility functions
- `src/scripts/__tests__/` - Unit tests for Gmail router script

**Test Coverage:**
- 131 tests passing
- Comprehensive normalization logic tests (18 tests)
- Webhook validation and authentication tests (including schema_version requirement)
- Storage adapter tests (KV indexes, property context, thread/booking retrieval)
- Email delivery and LLM provider tests
- Edge cases and error handling

The test setup runs tests in the actual Cloudflare Workers runtime, ensuring your code works correctly in the production environment.

## Security

- **Authentication**: All protected endpoints require Bearer token authentication (supports token rotation via `INGEST_TOKEN_OLD`)
- **Request Validation**: Structured payload validation with schema versioning (`schema_version` required)
- **PII Protection**: Sensitive data (email addresses, message bodies, raw payloads) is sanitized in logs and API responses
- **Structured Logging**: Comprehensive logging with timestamps and metadata (PII redacted)
- **Indexed Storage**: Knowledge items stored with thread/booking/property indexes for efficient retrieval while maintaining data isolation

## Code Quality

This project uses ESLint and Prettier for code quality and formatting:

- **ESLint**: Linting and code style enforcement (allowing console.log for Cloudflare Workers)
- **Prettier**: Code formatting
- **EditorConfig**: Editor configuration for consistent coding styles
- **Vitest**: Unit and integration testing framework
- **Modular Architecture**: Clear separation of concerns (types, storage, services, routes)

See `.cursorrules` for AI coding assistant guidelines.

## Features

- ✅ **Webhook Contract**: Versioned webhook schema with `schema_version` requirement
- ✅ **KV Indexes**: Thread, booking, and property indexes for efficient knowledge item retrieval
- ✅ **Property Context**: Store property-specific context text for enhanced reply suggestions
- ✅ **Debugging Endpoints**: Retrieve knowledge items by thread, booking, or property
- ✅ **OpenAI Integration**: LLM-powered reply suggestions (configurable via `OPENAI_API_KEY`)
- ✅ **Token Rotation**: Support for seamless token rotation via `INGEST_TOKEN_OLD`

## Future Enhancements

- **Email Service**: Integrate with email service provider (SendGrid, Resend, Mailgun, etc.) for actual email delivery (currently stub implementation)
- **D1 Database**: Migrate from KV to D1 for better query support and analytics
- **Property Database**: Enhance property-aware features with full property database integration
- **Booking Integration**: Connect with booking platforms (Airbnb, VRBO) APIs for automatic booking_id extraction
- **Manual Upload**: Support PDF/image/text uploads via API for additional knowledge sources
- **Vector DB**: Add embeddings and semantic search capabilities for better context retrieval

## Google Apps Script Integration

The `src/scripts/gmail_inbound_router.js` script is designed to run in Google Apps Script to forward labeled Gmail threads to the worker webhook endpoint.

**Setup:**
1. Copy the script to Google Apps Script editor
2. Set `INGEST_TOKEN` in Script Properties: `PropertiesService.getScriptProperties().setProperty("INGEST_TOKEN", "your-token")`
3. Create a Gmail label: `capehost/inbound`
4. Set up a time-driven trigger to run the script periodically

**Configuration:**
- `LABEL_NAME`: Gmail label to monitor (default: `capehost/inbound`)
- `WORKER_URL`: Worker webhook endpoint URL
- `MAX_THREADS_PER_RUN`: Maximum threads to process per run (default: 10)
- `MAX_MESSAGES_PER_THREAD`: Maximum messages per thread to include (default: 5)

## Documentation

- **Webhook Contract**: See `docs/WEBHOOK_CONTRACT.md` for complete webhook API documentation
- **Contributing**: See `.github/CONTRIBUTING.md` for contribution guidelines
- **Branch Protection**: See `.github/BRANCH_PROTECTION.md` for CI/CD setup

## Learn More

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare KV Documentation](https://developers.cloudflare.com/kv/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Vitest Documentation](https://vitest.dev/)
- [Cloudflare Workers Testing Guide](https://developers.cloudflare.com/workers/testing/)

