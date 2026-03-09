# Changelog

All notable changes to this project will be documented in this file.

## [2.3.4] - 2026-03-09

### Added
- **AI Suggestions**: New `get_suggestions` tool providing organizational advice using Raindrop's API and MCP Sampling.
- **Collection Tree**: `get_collection_tree` tool providing a hierarchical view with full breadcrumb paths.
- **Bulk Move**: Added `move` operation to `bulk_edit_raindrops` for efficient library organization.
- **Pagination Support**: Standardized `list_raindrops` and `bookmark_search` with pagination for large libraries.
- **Safety Confirmation**: Destructive tools (`empty_trash`, `cleanup_collections`) now require an explicit `confirm: true` parameter.
- **Code Quality**: ESLint and Prettier configurations established for maintainable development.
- **CI/CD**: Enhanced GitHub Actions workflow with automated linting, type-checking, and cross-transport tests.

### Changed
- **Standardized Naming**: All tools renamed to consistent `snake_case` (e.g., `getRaindrop` -> `get_raindrop`, `listRaindrops` -> `list_raindrops`).
- **Modular Architecture**: Refactored monolithic service into domain-specific tool modules in `src/tools/`.
- **Improved README**: Updated documentation with the new toolset and version details.

## [2.3.3] - 2026-03-08

### Added
- **Library Audit Tool**: New `library_audit` scans for broken links, duplicates, and untagged items.
- **Trash Management**: `empty_trash` tool to permanently clear deleted items.
- **Collection Cleanup**: `cleanup_collections` tool to remove empty folders.
- **Enhanced Diagnostics**: Server diagnostics now include real-time library health metrics.

### Fixed
- **Test Runner**: Resolved recursive process spawning by switching to direct `vitest` execution.
- **Search Filtering**: Fixed mapping of boolean flags to Raindrop search tokens.
- **API Mapping**: Updated `getUserStats` to handle undocumented response changes.

## [2.3.2] - 2026-03-07

### Added
- **MCP Resource Links**: Implemented lightweight `resource` links for bookmark and collection lists.
- **Dynamic Resources**: Support for `mcp://raindrop/{id}` and `mcp://collection/{id}`.
- **SDK Update**: Migrated to official MCP SDK v1.25.3.
- **HTTP Transport**: Support for SSE-based HTTP transport on port 3002.
