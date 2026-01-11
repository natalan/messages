## Overview

Your task is to create a new branch from main, commit all changes, push to origin, and create a Pull Request on GitHub with a generated title and description. Use the current diff to generate the PR content.

## Steps to execute:

1. **Generate PR title and description** using the current diff (from working directory)
2. **Create branch name** from the PR title (slugified, e.g., "Add feature X" → "add-feature-x")
3. **Create new branch** from main: `git checkout -b <branch-name>`
4. **Commit all changes**: `git add -A && git commit -m "<commit message>"` (use PR title as commit message)
5. **Push branch** to origin: `git push -u origin <branch-name>`
6. **Create PR** using GitHub CLI: `gh pr create --title "<PR title>" --body "<PR description>"`

## Formatting and generation rules:

- Use the `<COMPLETE_PR_TEMPLATE/>` to format PR descriptions.
  - when generating the PR description only use the diff from the current working directory (uncommitted changes) to make any comments or descriptions.
  - **Description section**: Write in paragraph form, concise and easy to read. Usually 1 or 2 paragraphs. Provide high-level overview of what the PR does and why.
  - **Changes Made section**: Write in bullet form, simple and easy to understand, but technical enough for those who will review. Group related changes together. List biggest/most important changes first, smaller/less important changes last. Be concise - avoid listing every single file change; group similar changes.

## Branch naming:

- Convert PR title to branch name by:
  - Lowercasing
  - Replacing spaces with hyphens
  - Removing special characters
  - Keeping it under 63 characters
  - Example: "Add schema version validation" → "add-schema-version-validation"

## Execution:

After generating the PR title and description:

1. Check current branch - if not on main, switch to main first
2. Create branch from main
3. Stage all changes (`git add -A`)
4. Commit with PR title as commit message
5. Push branch to origin
6. Use `gh pr create` with `--title` and `--body` flags to create the PR
7. Output the PR URL to the user

## Output Format:

After creating the PR, output:
- A clickable link to the PR using markdown format: `[PR Title](PR_URL)`
- Confirmation that the branch was created, committed, and pushed
- The PR URL in plain text for reference
- The PR title for reference

**Important**: The PR link should be formatted as a markdown link so it can be clicked directly in the chat interface.

<COMPLETE_PR_TEMPLATE>

## Description

This PR updates the address screen during sign up to show Colorado-specific content and adds phone number collection for Colorado users, using Jotai for state management. This is an interim solution until we migrate all users to collect their phone number.

## Changes Made

- Added `hasPhoneInputAtom` Jotai atom to manage phone input visibility
- Updated `AddressScreen` copy for Colorado users:
  - Updated title to "Where can we reach you?"
  - Updated subtitle to include phone number requirement messaging
- Moved Colorado state check within `AddressScreen` to reuse `hasPhoneInputAtom` for consistency

  </COMPLETE_PR_TEMPLATE>