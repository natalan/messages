# Contributing to Email Ingest API

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/messages.git`
3. Install dependencies: `npm install`
4. Create a new branch: `git checkout -b feature/your-feature-name`

## Development

### Running Locally

```bash
npm run dev
```

This will start the development server at `http://localhost:8787`.

### Testing Locally

```bash
# Run linter
npm run lint

# Format code
npm run format

# Check formatting
npm run format:check
```

### Environment Variables

Create a `.dev.vars` file in the root directory for local development:

```toml
INGEST_TOKEN=your-dev-token-here
```

**Never commit `.dev.vars` to the repository.**

## Code Style

- Follow ESLint and Prettier configurations
- Use 2-space indentation
- Write descriptive commit messages
- Add JSDoc comments for exported functions
- Keep functions small and focused

## Pull Request Process

1. Ensure all tests pass and linting passes
2. Update documentation if needed
3. Add your changes to the CHANGELOG.md (if applicable)
4. Submit a pull request with a clear description of changes
5. Wait for code review and address any feedback

## Commit Messages

Follow conventional commits format:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code refactoring
- `test:` for test additions/changes
- `chore:` for maintenance tasks

Example: `feat: add email parsing utility`

## Questions?

Feel free to open an issue for any questions or concerns.
