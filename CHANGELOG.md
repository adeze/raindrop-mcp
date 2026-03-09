## [2.4.1](https://github.com/adeze/raindrop-mcp/compare/v2.4.0...v2.4.1) (2026-03-09)

### Bug Fixes

- **tests:** Update unit tests to match new service method signatures ([6509c2c](https://github.com/adeze/raindrop-mcp/commit/6509c2c5ef41675fea1e1d5612d050242582d51e))

# [2.4.0](https://github.com/adeze/raindrop-mcp/compare/v2.3.9...v2.4.0) (2026-03-09)

### Features

- **caching:** Add skipCache support and observability logs ([0fe96a1](https://github.com/adeze/raindrop-mcp/commit/0fe96a11cbbcce497e0e4b8ba3a83398765467ec))
- **caching:** Implement basic in-memory caching for collections and bookmarks ([c65bc5b](https://github.com/adeze/raindrop-mcp/commit/c65bc5b11d71d13f6d0d9badfca44ac5bf583679))
- **caching:** Implement search caching and cache invalidation logic ([24f3f75](https://github.com/adeze/raindrop-mcp/commit/24f3f75f24801a6fb43f6036cf25332e31b30025))
- **cleanup:** Implement duplicate discovery and batching logic with tests ([0ced4f3](https://github.com/adeze/raindrop-mcp/commit/0ced4f3c305d5af0efe3fe4c753764062efc3093))
- **cleanup:** Implement optimized bulk deletion loop with batching ([e569da5](https://github.com/adeze/raindrop-mcp/commit/e569da5f714d07873b9bad6825dd1f0da41ea6f1))
- **search:** Add advanced search filters (date, media, duplicate) ([9bcd99b](https://github.com/adeze/raindrop-mcp/commit/9bcd99b62cd72b95e9677905f8092212dafa04ab))
- **suggestions:** Implement suggest_tags tool using MCP Sampling ([0eab8ee](https://github.com/adeze/raindrop-mcp/commit/0eab8eed81ffd1dca1c368b77fbf6fb30a37e87c))

# Changelog

All notable changes to this project will be documented in this file.

## [2.3.9] - 2026-03-09

### Changed

- **Consolidated CI/CD**: Merged MCPB bundle creation and GitHub Release steps into a single unified `publish` workflow.

## [2.3.8] - 2026-03-09

## [2.3.7] - 2026-03-09

## [2.3.6] - 2026-03-09

## [2.3.5] - 2026-03-09

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
