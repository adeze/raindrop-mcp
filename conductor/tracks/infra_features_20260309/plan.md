# Implementation Plan: CI/CD Infrastructure and Feature Enhancements

## Phase 1: CI/CD Pipeline and Quality Automation

- [x] Task: Install and configure `semantic-release` and its required plugins (git, github, changelog). [checkpoint: 883bc96]
- [x] Task: Create or update `.github/workflows/ci.yml` to run lint, format check, type-check, and tests on PRs and pushes. [checkpoint: 883bc96]
- [x] Task: Configure Husky pre-commit hooks to automate local linting and formatting. [checkpoint: 883bc96]
- [x] Task: Conductor - User Manual Verification 'Phase 1: CI/CD Pipeline and Quality Automation' (Protocol in workflow.md) [checkpoint: 883bc96]

## Phase 2: Advanced Search Filter Implementation

- [x] Task: Research Raindrop.io API advanced search syntax for date ranges, domains, and types in `raindrop-complete.yaml`. [checkpoint: 05a5927]
- [x] Task: Update `BookmarkSearchInputSchema` in `src/tools/bookmarks.ts` to include the new filter parameters. [checkpoint: 883bc96]
- [x] Task: Write failing tests for the new search filters (date, domain, type, duplicate). [checkpoint: 883bc96]
- [x] Task: Implement the filter mapping logic in the `bookmark_search` tool to pass the tests. [checkpoint: 883bc96]
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Advanced Search Filter Implementation' (Protocol in workflow.md)

## Phase 3: AI-Powered Auto-tagging (Sampling)

- [ ] Task: Research MCP Sampling `createMessage` patterns within the server's `ToolHandlerContext`.
- [ ] Task: Define and register the `suggest_tags` tool in a new `src/tools/suggestions.ts` file.
- [ ] Task: Write failing tests for the `suggest_tags` tool, mocking the MCP `createMessage` call.
- [ ] Task: Implement the prompt construction and sampling logic to provide relevant tag suggestions.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: AI-Powered Auto-tagging (Sampling)' (Protocol in workflow.md)
