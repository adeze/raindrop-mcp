# Specification: Advanced Bookmark Cleanup Tools

## Goal
Enhance the Raindrop MCP server with specialized tools for maintaining a clean and organized bookmark library.

## Scope
- **Library Audit:** Detect broken links and duplicate bookmarks across the entire library.
- **Automated Cleanup:** Provide tools to empty the trash and remove empty collections.
- **Smart Suggestions:** Expose Raindrop AI suggestions for tagging and categorizing bookmarks.

## Tools to Implement
1. `library_audit`: Returns a summary of broken and duplicate bookmarks.
2. `empty_trash`: Permanently deletes items in the Trash collection.
3. `remove_empty_collections`: Deletes collections containing no bookmarks.
4. `get_suggestions`: Fetches Raindrop AI suggestions for a given bookmark.

## Technical Details
- Use existing `RaindropService` for API calls.
- Define new tools in `src/tools/` (e.g., `cleanup.ts` or extensions to `bookmarks.ts` and `collections.ts`).
- Adhere to Zod schema validation for all inputs/outputs.
