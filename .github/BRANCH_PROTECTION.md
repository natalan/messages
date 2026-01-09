# Branch Protection Guidelines

This document outlines the branch protection rules recommended for this repository.

## Main Branch Protection

To ensure code quality and prevent direct pushes to the main branch, configure the following branch protection rules in GitHub:

### Required Status Checks

The following checks should be required to pass before merging:

- ✅ **Code Quality Checks** (`code-quality`)
  - ESLint validation
  - Prettier formatting check

- ✅ **Test Suite** (`test`)
  - All unit tests must pass
  - All integration tests must pass

- ✅ **Build Verification** (`build`)
  - Type checking (if applicable)
  - Build validation

### Protection Rules

1. **Require pull request reviews before merging**
   - At least 1 approval from code owners
   - Dismiss stale reviews when new commits are pushed

2. **Require status checks to pass before merging**
   - Require branches to be up to date before merging

3. **Require conversation resolution before merging**
   - All PR comments must be resolved

4. **Do not allow bypassing the above settings**
   - Even administrators should follow these rules

5. **Include administrators**
   - Apply rules to all users including administrators

## How to Configure

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Branches**
3. Click **Add rule** or edit the existing rule for `main`
4. Enable the options above
5. Add the required status checks listed above

## Workflow Status

The following workflows run on pull requests:

- `Pull Request Checks` - Runs on PR open/update
- `CI` - Runs on push to main (can be manually triggered)

## Required GitHub Secrets

For the workflows to function properly, ensure these secrets are set (if using deploy preview):

- `CLOUDFLARE_API_TOKEN` - Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID
- `INGEST_TOKEN` - Optional, for tests that require authentication
