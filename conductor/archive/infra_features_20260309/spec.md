# Specification: CI/CD Infrastructure and Feature Enhancements

## Overview

This track focuses on strengthening the development infrastructure via CI/CD automation and expanding the server's feature set with advanced search capabilities and AI-powered auto-tagging using MCP Sampling.

## Functional Requirements

### 1. CI/CD Infrastructure

- **GitHub Actions**: Implement a robust workflow that runs `lint`, `format` (check), `type-check`, and `test` on every pull request and push to `master`.
- **Semantic Release**: Integrate `semantic-release` to automate versioning, changelog generation, and GitHub releases based on commit messages.
- **Husky Hooks**: Configure `pre-commit` hooks to run linting and formatting locally before commits.

### 2. Advanced Search Filters

- **Enhanced `bookmark_search`**:
  - Support date range filtering (created/updated).
  - Add domain/host-specific filtering.
  - Support content type filtering (article, image, video, etc.).
  - Explicitly support the `duplicate:true` parameter for finding duplicates.

### 3. AI-Powered Auto-tagging (Sampling)

- **New Tool `suggest_tags`**:
  - Implement a tool that uses MCP Sampling (`createMessage`) to send bookmark metadata (title, URL, description) to the LLM.
  - The LLM will return a list of suggested tags based on the content.
  - Leverage the `mcpServer` instance in the tool handler.

## Non-Functional Requirements

- **Reliability**: Ensure the CI pipeline is stable and fails appropriately on quality regressions.
- **Consistency**: Maintain the established `snake_case` naming and Zod validation patterns.
- **Efficiency**: Sampling payloads should be concise to manage token costs.

## Acceptance Criteria

- [ ] GitHub Actions workflow successfully runs all quality checks on PRs.
- [ ] Releases are automatically generated with correct semantic versioning.
- [ ] `bookmark_search` correctly filters by date, domain, and type.
- [ ] `suggest_tags` tool successfully leverages MCP Sampling to provide relevant tag suggestions.

## Out of Scope

- Fully automated tag application without user review.
- Migration of existing legacy tests to the new CI format (focus is on new/main suite).
