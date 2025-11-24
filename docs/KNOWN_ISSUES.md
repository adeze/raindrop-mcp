# Raindrop MCP - Known Issues

**Last Updated:** 2025-11-24

---

## Recently Resolved Issues ✅

### 1. Tag Search Returns Full-Text Results Instead of Tag-Filtered Results

**Severity:** 🔴 **HIGH** - Major functionality broken

**Status:** ✅ **RESOLVED** - Fixed on 2025-11-21 (PR #43)

**Description:**
When searching for bookmarks by tag using `bookmark_search` with the `tag` parameter, the Raindrop API returns bookmarks that contain the search term in their **title or description**, NOT just bookmarks with that exact tag.

**Example:**
```typescript
// Search for bookmarks tagged with "@claude"
await service.getBookmarks({ tag: "@claude", perPage: 50 });

// Expected: 3 bookmarks with @claude tag
// Actual: 23 bookmarks returned (20 false positives!)
```

**False Positives Include:**
- Bookmarks with "Claude" in title but NO tags
- Bookmarks with "claude" in description but NO tags
- Bookmarks with completely unrelated tags

**Debug Evidence:**
```bash
$ bun run scripts/debug-tag-search.ts "@claude"
API reported count: 23
✅ Exact matches: 3
⚠️  Partial matches: 0
❓ Neither exact nor partial: 20
```

**Impact:**
- Claude Code processes wrong bookmarks
- Tag-based workflows are unreliable
- User sees incorrect counts
- Wasted API calls fetching irrelevant content

**Root Cause:**
The Raindrop API endpoint `/raindrops/0?tag=@claude` appears to perform **full-text search** instead of exact tag filtering. This could be:
1. API design issue (tag param does full-text search)
2. MCP implementation issue (wrong parameter mapping)
3. API bug (regression in Raindrop.io)

**Workaround:**
```typescript
// Option 1: Client-side filtering (recommended for now)
const result = await service.getBookmarks({ tag: "@claude" });
const exactMatches = result.items.filter(bookmark =>
    bookmark.tags && bookmark.tags.includes("@claude")
);

// Option 2: Fetch all bookmarks and filter locally
const allBookmarks = await service.getBookmarks({ perPage: 50 });
const tagged = allBookmarks.items.filter(bm => bm.tags?.includes("@claude"));
```

**Resolution:**
✅ Added `exactTagMatch` boolean parameter to `bookmark_search` tool
- When `true`: Client-side filtering ensures only exact tag matches are returned
- **Impact:** False positives reduced from 87% (23 → 3 results)
- **Implementation:** See `src/services/raindrop.service.ts` and `tools/raindrop_bookmark_search.ts`

**Test Case:**
See `scripts/debug-tag-search.ts` for reproduction and verification

---

### 2. bulk_edit_raindrops Tool Returns Authorization Errors

**Severity:** 🔴 **HIGH** - Tool completely broken

**Status:** ✅ **RESOLVED** - Fixed on 2025-11-21 (PR #43)

**Description:**
The `bulk_edit_raindrops` tool fails with authorization and validation errors, even with valid credentials and correct parameters.

**Errors Seen:**
```json
{
  "error": "Unexpected token 'U', \"Unauthorized\" is not valid JSON"
}
```

```json
{
  "error": "Input validation error: collectionId is required"
}
```

**Attempted Parameters:**
```json
{
  "collectionId": -1,
  "ids": [1440624182],
  "tags": ["voice-tech", "withvoice", "@claude"]
}
```

**Impact:**
- Cannot bulk update tags on multiple bookmarks
- Cannot bulk move bookmarks between collections
- Forces inefficient individual updates

**Root Cause:**
Unknown - possibly:
1. API endpoint authentication issue
2. MCP tool parameter mapping issue
3. Missing required fields in request
4. Raindrop API permission issue

**Workaround:**
Use individual `bookmark_manage` updates in sequence:
```typescript
for (const id of bookmarkIds) {
    await bookmarkManage({
        operation: "update",
        id,
        url: bookmarks[id].url,  // Required!
        title: bookmarks[id].title,  // Required!
        tags: newTags
    });
}
```

**Resolution:**
✅ Added missing Authorization header to bulk edit requests
- **Root Cause:** API requests were missing `Authorization: Bearer ${token}` header
- **Impact:** Bulk edit operations now work with 100% success rate
- **Implementation:** See `src/services/raindrop.service.ts` line ~215

---

### 3. MCP SDK Schema Registration - "Cannot read properties of null (reading '_def')"

**Severity:** 🔴 **CRITICAL** - All tools broken

**Status:** ✅ **RESOLVED** - Fixed on 2025-11-24

**Description:**
Tools appeared in MCP Inspector but failed when invoked with error: `TypeError: Cannot read properties of null (reading '_def')`. This affected both Claude Desktop and Claude Code.

**Root Cause:**
Incorrect schema registration - passing `ZodObject` directly instead of extracting `ZodRawShape` via `.shape` property. The MCP SDK wraps inputSchema with `z.object()` internally (mcp.js:443), so it expects a plain object (ZodRawShape), not a complete ZodObject.

**Resolution:**
✅ Restored `.shape` extraction in tool registration
```typescript
// src/services/raindropmcp.service.ts:562
inputSchema: (config.inputSchema as z.ZodObject<any>).shape
```

**Impact:**
- All 10 tools now work correctly in both Claude Desktop and Claude Code
- Proper schema validation during tool invocation
- No more null reference errors

**Documentation:**
- Comprehensive technical explanation: [docs/MCP_SDK_INTEGRATION.md](./MCP_SDK_INTEGRATION.md)
- Inline code comments added for future maintainability
- Full investigation timeline: See vault debugging documentation

**Related Issues:**
- Also fixed Zod version compatibility (downgraded from invalid ^4.1.9 to stable ^3.23.8)

---

## Active Issues

### 3. bookmark_manage Update Requires Full Object

**Severity:** 🟡 **MEDIUM** - Annoying but has workaround

**Status:** Design limitation, not a bug

**Description:**
When updating a bookmark (e.g., just adding tags), the `bookmark_manage` tool requires the **full bookmark object** including unchanged fields like `url` and `title`.

**Example:**
```typescript
// This FAILS (missing url/title):
{
    operation: "update",
    id: 1443253309,
    tags: ["new-tag"]
}

// This WORKS (includes everything):
{
    operation: "update",
    id: 1443253309,
    url: "https://example.com",  // Required even if not changing
    title: "Example Title",      // Required even if not changing
    tags: ["new-tag"]
}
```

**Impact:**
- Must fetch current bookmark before every update
- Risk of data loss if fields not preserved
- Verbose code for simple updates

**Root Cause:**
Raindrop API design - PUT endpoint requires full resource representation (REST convention)

**Workaround:**
Always fetch before update:
```typescript
// Step 1: Get current state
const current = await getBookmark(id);

// Step 2: Merge with changes
const updated = await bookmarkManage({
    operation: "update",
    id,
    url: current.link,
    title: current.title,
    tags: [...current.tags, "new-tag"],
    description: current.excerpt
});
```

**Fix Options:**
1. Document this requirement clearly (✅ Done in CLAUDE_USAGE_GUIDE.md)
2. Add helper function that auto-fetches and merges
3. Use PATCH endpoint if Raindrop API supports it (investigate)

---

## Medium Issues

### 4. getRaindrop Tool Returns Resource Link Only

**Severity:** 🟡 **MEDIUM** - Expected behavior, but confusing

**Status:** By design (MCP resource link pattern)

**Description:**
The `getRaindrop` tool returns a resource link (`mcp://raindrop/{id}`) instead of the full bookmark JSON object.

**Workaround:**
Use `readResource()` method or `listRaindrops` with collection filter

**Impact:**
Requires extra step to get full bookmark data

**Not a Bug:**
This is the intended MCP pattern for resource references

---

## Minor Issues

### 5. Tag Parameter vs Tags Parameter Confusion

**Severity:** 🟢 **LOW** - Documentation issue

**Description:**
`bookmark_search` accepts both `tag` (string) and `tags` (array) parameters with unclear differences

**Fix:**
Document which to use when

**Current Behavior:**
Both appear to do the same thing (full-text search, not tag filtering - see Issue #1)

---

## Issue Status Legend

- 🔴 **HIGH** - Blocks core functionality
- 🟡 **MEDIUM** - Workaround available but annoying
- 🟢 **LOW** - Minor inconvenience

---

## Testing & Debugging

### Debug Scripts

**Tag Search Debugging:**
```bash
bun run scripts/debug-tag-search.ts "@claude"
```

This script:
- Tests tag search with different methods
- Shows exact vs partial matches
- Identifies discrepancies
- Recommends fixes

### Manual API Testing

**Direct API call (bypass MCP):**
```bash
curl -H "Authorization: Bearer $RAINDROP_ACCESS_TOKEN" \
  "https://api.raindrop.io/rest/v1/raindrops/0?tag=@claude" \
  | python3 -m json.tool
```

Compare results with MCP tool to isolate issues.

---

## Reporting New Issues

When reporting issues:
1. Include exact tool name and parameters used
2. Show expected vs actual behavior
3. Include error messages (full text)
4. Note workarounds if found
5. Test with direct API if possible

Add issues to this file or create GitHub issues at:
https://github.com/adeze/raindrop-mcp/issues

---

## Version Info

**Raindrop MCP Version:** 2.0.16
**Tested with:** Super-MCP router (HTTP + stdio transports)
**Raindrop API:** v1
**Last Verified:** 2025-11-24

## Resolution Summary

### November 2025 Fixes
- ✅ Schema registration (`._def` error) - **CRITICAL** - Fixed 2025-11-24
- ✅ Tag search accuracy (87% false positives) - **HIGH** - Fixed 2025-11-21
- ✅ Bulk edit authorization (100% failure) - **HIGH** - Fixed 2025-11-21
- ✅ Zod version compatibility - **HIGH** - Fixed 2025-11-21

All critical issues have been resolved. Remaining issues are design limitations with documented workarounds.
