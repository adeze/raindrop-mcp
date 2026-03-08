# Specification: Advanced Bookmark Cleanup & Full SDK Conformance

## Goal
Enhance the Raindrop MCP server with maintenance tools while achieving full conformance and refining all partially implemented Model Context Protocol (MCP) features.

## Scope
### Bookmark Cleanup & Refinements
- **Library Audit:** Detect broken links and duplicate bookmarks (Complete).
- **Automated Cleanup:** Tools for trash and empty collection removal.
- **Smart Suggestions:** AI-powered organization suggestions.
- **Diagnostics Refinement:** Enhance diagnostics with account-wide health stats (total bookmarks, broken links count, duplicate count).
- **Progress Refinement:** Extend progress reporting to all bulk/heavy operations (e.g., `bulk_edit`).

### MCP SDK Conformance
- **Progress Notifications:** Reporting during long-running tasks.
- **Elicitation:** Explicit confirmation for destructive actions.
- **Resource Templates:** Formal registration of `mcp://raindrop/{id}` and `mcp://collection/{id}`.
- **Sampling:** Allowing the server to ask the AI for decisions (used in suggestions).
- **Pagination:** Implementing the native MCP pagination pattern for all listing tools.
- **Roots:** Implement the `roots` capability to support local filesystem context for import/export.

## Tools to Implement/Enhance
1. `library_audit`: Audit with progress reporting.
2. `empty_trash`: Trash removal with elicitation.
3. `remove_empty_collections`: Collection cleanup.
4. `get_suggestions`: Suggestions enhanced with AI Sampling.
5. `diagnostics`: Enhanced with account health stats.
6. `bulk_edit_raindrops`: Enhanced with progress reporting.

## Technical Details
- Adhere to MCP SDK v1.25+ patterns.
- Implement `listResourceTemplates` and update `listResources`.
- Update tool handlers to support `cursor` based pagination.
