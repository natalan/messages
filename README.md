# Cloudflare Worker

A simple Cloudflare Worker project built with JavaScript.

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

Run the development server:
```bash
npm run dev
```

The worker will be available at `http://localhost:8787`

### Deployment

Deploy your worker to Cloudflare:
```bash
npm run deploy
```

## Project Structure

```
.
├── src/
│   └── index.js      # Main worker code
├── wrangler.toml     # Wrangler configuration
├── package.json      # Dependencies and scripts
└── README.md         # This file
```

## Routes

- `/` - Returns a simple text greeting
- `/json` - Returns a JSON response with message, timestamp, and URL

## Learn More

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

