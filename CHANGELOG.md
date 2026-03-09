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
