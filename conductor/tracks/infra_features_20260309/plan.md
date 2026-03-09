# Implementation Plan: CI/CD Infrastructure and Feature Enhancements

## Phase 1: CI/CD Pipeline and Quality Automation
- [ ] Task: Install and configure `semantic-release` and its required plugins (git, github, changelog).
- [ ] Task: Create or update `.github/workflows/ci.yml` to run lint, format check, type-check, and tests on PRs and pushes.
- [ ] Task: Configure Husky pre-commit hooks to automate local linting and formatting.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: CI/CD Pipeline and Quality Automation' (Protocol in workflow.md)

## Phase 2: Advanced Search Filter Implementation
- [ ] Task: Research Raindrop.io API advanced search syntax for date ranges, domains, and types in `raindrop-complete.yaml`.
- [ ] Task: Update `BookmarkSearchInputSchema` in `src/tools/bookmarks.ts` to include the new filter parameters.
- [ ] Task: Write failing tests for the new search filters (date, domain, type, duplicate).
- [ ] Task: Implement the filter mapping logic in the `bookmark_search` tool to pass the tests.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Advanced Search Filter Implementation' (Protocol in workflow.md)

## Phase 3: AI-Powered Auto-tagging (Sampling)
- [ ] Task: Research MCP Sampling `createMessage` patterns within the server's `ToolHandlerContext`.
- [ ] Task: Define and register the `suggest_tags` tool in a new `src/tools/suggestions.ts` file.
- [ ] Task: Write failing tests for the `suggest_tags` tool, mocking the MCP `createMessage` call.
- [ ] Task: Implement the prompt construction and sampling logic to provide relevant tag suggestions.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: AI-Powered Auto-tagging (Sampling)' (Protocol in workflow.md)
