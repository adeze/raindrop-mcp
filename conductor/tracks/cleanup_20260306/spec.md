# Specification: Advanced Bookmark Cleanup & SDK Enhancements

## Goal
Enhance the Raindrop MCP server with specialized tools for maintaining a clean and organized bookmark library, while leveraging modern MCP SDK features for a better user experience.

## Scope
### Bookmark Cleanup
- **Library Audit:** Detect broken links and duplicate bookmarks across the entire library.
- **Automated Cleanup:** Provide tools to empty the trash and remove empty collections.
- **Smart Suggestions:** Expose Raindrop AI suggestions for tagging and categorizing bookmarks.

### MCP SDK Enhancements
- **Progress Notifications:** Add progress reporting to long-running tasks like `library_audit`.
- **Elicitation (Experimental):** Implement explicit confirmation for destructive actions like `empty_trash`.
- **Resource Templates:** Formally expose URI templates for bookmarks and collections to the host.

## Tools to Implement
1. `library_audit`: Returns a summary of broken and duplicate bookmarks (with progress reporting).
2. `empty_trash`: Permanently deletes items in the Trash collection (with elicitation confirmation).
3. `remove_empty_collections`: Deletes collections containing no bookmarks.
4. `get_suggestions`: Fetches Raindrop AI suggestions for a given bookmark.

## Technical Details
- Use existing `RaindropService` for API calls.
- Adhere to MCP SDK v1.25+ patterns for progress and elicitation.
- Ensure Zod schemas are updated to support metadata for these features.
