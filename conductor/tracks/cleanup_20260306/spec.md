# Specification: Advanced Bookmark Cleanup & Full SDK Conformance

## Goal
Enhance the Raindrop MCP server with maintenance tools while achieving full conformance with the latest Model Context Protocol (MCP) specification.

## Scope
### Bookmark Cleanup
- **Library Audit:** Detect broken links and duplicate bookmarks.
- **Automated Cleanup:** Tools for trash and empty collection removal.
- **Smart Suggestions:** AI-powered organization suggestions.

### MCP SDK Conformance
- **Progress Notifications:** Reporting during long-running audits or batch edits.
- **Elicitation:** Explicit confirmation for destructive actions.
- **Resource Templates:** Formal registration of `mcp://raindrop/{id}` and `mcp://collection/{id}`.
- **Sampling:** Allowing the server to ask the AI for decisions (used in suggestions).
- **Pagination:** Implementing the native MCP pagination pattern for all listing tools to support large libraries.

## Tools to Implement
1. `library_audit`: Audit with progress reporting.
2. `empty_trash`: Trash removal with elicitation.
3. `remove_empty_collections`: Collection cleanup.
4. `get_suggestions`: Suggestions enhanced with AI Sampling.

## Technical Details
- Adhere to MCP SDK v1.25+ patterns.
- Implement `listResourceTemplates` and update `listResources`.
- Update tool handlers to support `cursor` based pagination.
