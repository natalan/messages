# GitHub Workflows

This directory contains GitHub Actions workflows for CI/CD and pull request validation.

## Workflows

### `pr.yml` - Pull Request Checks

**Triggers:** Pull requests targeting `main` branch

**Runs on:**
- PR opened
- PR synchronized (new commits pushed)
- PR reopened
- PR marked as ready for review

**Checks:**
1. **Code Quality Checks** - ESLint and Prettier validation
2. **Test Suite** - All unit and integration tests must pass
3. **Build Verification** - Type checking and build validation
4. **PR Status Check** - Summary check that depends on all above checks

**Concurrency:** Cancels in-progress runs when new commits are pushed to the same PR

### `ci.yml` - Continuous Integration

**Triggers:** 
- Pushes to `main` branch
- Manual workflow dispatch

**Checks:**
1. Lint and format checks
2. Test suite
3. Optional deploy preview (if configured with Cloudflare secrets)

### `lint.yml` - Linting Workflow

**Triggers:** Pushes and pull requests targeting `main`

**Checks:**
- ESLint validation
- Prettier formatting check

## Required Status Checks

The following checks should be configured as required in GitHub branch protection:

- `code-quality` - Code Quality Checks
- `test` - Test Suite
- `build` - Build Verification (optional but recommended)

## GitHub Secrets

For full functionality, configure these secrets in your repository:

- `CLOUDFLARE_API_TOKEN` - For deploy previews (optional)
- `CLOUDFLARE_ACCOUNT_ID` - For deploy previews (optional)
- `INGEST_TOKEN` - For tests that require authentication (optional, defaults to test token)

## Local Testing

To verify workflows locally before pushing:

```bash
# Run all checks locally
npm run lint
npm run format:check
npm test

# Type checking
npm run type-check
```

See `.github/BRANCH_PROTECTION.md` for branch protection configuration guide.
