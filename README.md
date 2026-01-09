# Email Ingest API

A Cloudflare Worker project for handling inbound email webhooks with authentication.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
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
```

2. Run the development server:
```bash
npm run dev
```

The worker will be available at `http://localhost:8787`

3. Run tests:
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

4. Run linting and formatting:
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

## Project Structure

```
.
├── src/
│   ├── index.js           # Main worker entry point and routing
│   ├── utils/
│   │   ├── auth.js        # Authentication utilities
│   │   └── __tests__/     # Unit tests for utilities
│   ├── __tests__/         # Integration tests
│   └── scripts/           # Scripts and tooling
├── .github/               # GitHub templates and workflows
├── vitest.config.mjs      # Vitest configuration
├── wrangler.toml          # Wrangler configuration
├── package.json           # Dependencies and scripts
└── README.md              # This file
```

## API Endpoints

- `GET /health` - Health check endpoint (public, no authentication required)
- `POST /inbound-email` - Receive inbound email webhooks (requires Bearer token authentication)

## Environment Variables

Set the following in your Cloudflare Workers dashboard or `.dev.vars` for local development:

- `INGEST_TOKEN` - Bearer token for authenticating requests

**Note:** Never commit `.dev.vars` or any secrets to the repository.

## Testing

This project uses [Vitest](https://vitest.dev/) with [@cloudflare/vitest-pool-workers](https://developers.cloudflare.com/workers/testing/vitest-integration/) for testing Cloudflare Workers in the Workers runtime environment.

Tests are located in:
- `src/__tests__/` - Integration tests for the worker
- `src/utils/__tests__/` - Unit tests for utility functions

The test setup runs tests in the actual Cloudflare Workers runtime, ensuring your code works correctly in the production environment.

## Code Quality

This project uses ESLint and Prettier for code quality and formatting:

- **ESLint**: Linting and code style enforcement
- **Prettier**: Code formatting
- **EditorConfig**: Editor configuration for consistent coding styles
- **Vitest**: Unit and integration testing framework

See `.cursorrules` for AI coding assistant guidelines.

## Learn More

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Vitest Documentation](https://vitest.dev/)
- [Cloudflare Workers Testing Guide](https://developers.cloudflare.com/workers/testing/)

