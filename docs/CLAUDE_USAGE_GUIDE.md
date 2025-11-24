# Raindrop MCP - Claude Code Usage Guide

**Last Updated:** 2025-11-21
**For:** Claude Code AI Assistant
**Purpose:** Efficient, error-free use of Raindrop MCP tools

---

## Quick Reference

### Tool Overview

| Tool | Purpose | Success Rate | Notes |
|------|---------|--------------|-------|
| `bookmark_search` | Find bookmarks | ✅ High | Tag search may have issues |
| `bookmark_manage` | Create/update/delete | ✅ High | Requires full object for updates |
| `collection_list` | List all collections | ✅ High | Always works |
| `collection_manage` | Create/update/delete collections | ✅ High | Straightforward |
| `bulk_edit_raindrops` | Batch update bookmarks | ⚠️ **BROKEN** | Auth errors, avoid for now |
| `tag_manage` | Rename/merge/delete tags | ✅ Medium | Works but limited use cases |
| `getRaindrop` | Get single bookmark | ⚠️ Limited | Returns resource link only |
| `listRaindrops` | List by collection | ✅ High | Works well |

---

## Common Operations

### 1. Searching for Bookmarks by Tag

**Use Case:** Find all bookmarks tagged with `@claude`

**Working Method:**
```json
{
  "package_id": "raindrop",
  "tool_id": "raindrop__bookmark_search",
  "args": {
    "tag": "@claude",
    "perPage": 50
  }
}
```

**Parameters:**
- `tag` (string): Single tag to search (use this for exact match)
- `tags` (array): Multiple tags (may have different behavior)
- `perPage`: Max 50 recommended

**Known Issue:** Tag search may return incorrect count (23 results reported vs 3 actual). Always verify results manually if count seems suspicious.

---

### 2. Getting Full Bookmark Details

**Problem:** `getRaindrop` tool only returns a resource link, not full JSON.

**Working Method:**

**Step 1:** Search for the bookmark
```json
{
  "tool_id": "raindrop__bookmark_search",
  "args": {"search": "voice agent", "perPage": 1}
}
```

**Step 2:** Extract ID from result URI: `mcp://raindrop/1440624182`

**Step 3:** Use readResource on the MCP service (if available) OR use listRaindrops with the collection ID

**Alternative (Better):** Use Raindrop API directly via curl:
```bash
curl -H "Authorization: Bearer $RAINDROP_ACCESS_TOKEN" \
  "https://api.raindrop.io/rest/v1/raindrop/1440624182"
```

---

### 3. Updating a Bookmark (Adding Tags, Changing Description)

**Critical:** Bookmark updates require **ALL** of these fields:
- `id` (bookmark ID)
- `url` (full URL, even if unchanged)
- `title` (full title, even if unchanged)
- Plus any fields you want to change (`tags`, `description`, etc.)

**Workflow:**

**Step 1:** Get current bookmark details first
```json
{
  "tool_id": "raindrop__listRaindrops",
  "args": {"collectionId": "-1", "limit": 50}
}
```

**Step 2:** Update with full details
```json
{
  "tool_id": "raindrop__bookmark_manage",
  "args": {
    "operation": "update",
    "id": 1443253309,
    "url": "https://www.insta360.com/product/insta360-x4-air",
    "title": "Insta360 X4 Air - Impossibly Light 8K 360 Camera",
    "tags": ["@claude", "processed", "tech", "camera"],
    "description": "Your updated description here..."
  }
}
```

**Why This is Hard:**
- MCP doesn't return full bookmark objects easily
- Need to preserve existing url/title when just changing tags
- Easy to lose data if not careful

---

### 4. Creating a New Bookmark

**Working Method:**
```json
{
  "tool_id": "raindrop__bookmark_manage",
  "args": {
    "operation": "create",
    "url": "https://example.com",
    "title": "Example Bookmark",
    "tags": ["@claude", "example"],
    "description": "Optional description",
    "collectionId": -1
  }
}
```

**Collections:**
- `-1` = "Unsorted" (default collection)
- Specific ID for named collections (get via `collection_list`)

---

### 5. Bulk Operations (⚠️ AVOID FOR NOW)

**Tool:** `bulk_edit_raindrops`

**Status:** **BROKEN** - Returns authorization errors

**Errors Seen:**
```
"Unexpected token 'U', \"Unauthorized\" is not valid JSON"
"Input validation error: collectionId is required"
```

**Workaround:** Use individual `bookmark_manage` updates in sequence instead.

---

## Debugging & Troubleshooting

### Issue: Tag Search Returns Wrong Count

**Symptom:** MCP reports 23 bookmarks with `@claude` tag, but Raindrop UI shows only 3

**Cause:** Unknown - possibly:
- Partial/substring matching (searching for "claude" matches "@claude", "claude-test", etc.)
- Caching issues
- API sync delay

**Verification:**
1. Search for bookmarks: `{"tag": "@claude"}`
2. Note the count returned
3. Check Raindrop UI manually
4. If mismatch > 5 bookmarks, investigate further

**Debug Script:** (See `scripts/debug-tag-search.ts`)

---

### Issue: "Bad Request" from API

**Symptom:** Direct curl to `/raindrop/{id}` returns "Bad Request"

**Cause:** Endpoint format or authentication issue

**Solutions:**
1. Verify token is set: `echo $RAINDROP_ACCESS_TOKEN`
2. Use correct endpoint: `/rest/v1/raindrop/{id}` (not `/raindrop/{id}`)
3. Check if bookmark ID exists in your account

---

### Issue: Bookmark Update Loses Data

**Symptom:** After update, title/URL disappears or changes unexpectedly

**Cause:** Partial update not supported - API requires full object

**Prevention:**
1. Always fetch current bookmark details first
2. Merge your changes with existing data
3. Submit complete object with all fields

---

## Best Practices for Claude

### 1. Always Verify Tag Searches
When searching by tag, manually verify the count makes sense:
```
Found 23 bookmarks  ← Suspicious if user says they only tagged 3
```

### 2. Preserve Existing Data
Before updating any bookmark:
1. Fetch current state
2. Merge changes
3. Submit full object

### 3. Avoid Bulk Operations
Until `bulk_edit_raindrops` is fixed, use sequential individual updates.

### 4. Handle Errors Gracefully
Common errors:
- "Unauthorized" → Check token, verify endpoint
- "Required field missing" → Ensure url/title included for updates
- "Bookmark not found" → Verify ID exists

### 5. Use Resource Links Efficiently
When search returns `mcp://raindrop/{id}` links:
- Extract ID from URI path
- Use `listRaindrops` to get full details if in known collection
- Fall back to direct API call if needed

---

## API → MCP Tool Mapping

| Raindrop API Endpoint | MCP Tool | Notes |
|-----------------------|----------|-------|
| `GET /raindrops/0` | `bookmark_search` | Search all bookmarks |
| `GET /raindrops/{collectionId}` | `listRaindrops` | List by collection |
| `GET /raindrop/{id}` | `getRaindrop` ⚠️ | Limited - returns link only |
| `POST /raindrop` | `bookmark_manage` (create) | Full object required |
| `PUT /raindrop/{id}` | `bookmark_manage` (update) | Full object required |
| `DELETE /raindrop/{id}` | `bookmark_manage` (delete) | Works well |
| `PUT /raindrops/{collectionId}` | `bulk_edit_raindrops` ⚠️ | BROKEN |
| `GET /collections` | `collection_list` | Works perfectly |
| `POST /collection` | `collection_manage` (create) | Works well |
| `PUT /collection/{id}` | `collection_manage` (update) | Works well |
| `DELETE /collection/{id}` | `collection_manage` (delete) | Works well |

---

## Examples: End-to-End Workflows

### Workflow: Process @claude Tagged Bookmarks

**Goal:** Find bookmarks tagged `@claude`, analyze content, add TLDR and additional tags

**Step 1: Search**
```json
{
  "tool_id": "raindrop__bookmark_search",
  "args": {"tag": "@claude", "perPage": 50}
}
```

**Step 2: For each bookmark:**
1. Note the title, description, and URI
2. Extract bookmark ID from URI: `mcp://raindrop/1443253309`
3. If URL is accessible, fetch content with WebFetch
4. If URL is blocked (403), use WebSearch for info
5. Create TLDR analysis

**Step 3: Update with analysis**
```json
{
  "tool_id": "raindrop__bookmark_manage",
  "args": {
    "operation": "update",
    "id": 1443253309,
    "url": "[original URL]",
    "title": "[original title]",
    "tags": ["@claude", "processed", "additional", "tags"],
    "description": "📹 TLDR: [Your analysis]\n\n[Structured breakdown]\n\n🏷️ Processed by Claude"
  }
}
```

**Step 4: Verify**
- Search again to confirm tags updated
- Spot-check a few bookmarks in Raindrop UI

---

### Workflow: Organize New Bookmarks

**Goal:** User saves bookmarks to "Unsorted", Claude processes and files them

**Step 1: List unsorted bookmarks**
```json
{
  "tool_id": "raindrop__listRaindrops",
  "args": {"collectionId": "-1", "limit": 50}
}
```

**Step 2: Analyze each bookmark**
- Fetch content if possible
- Determine category (business, personal, tech, etc.)
- Assess relevance (high-value, reference, low-priority)

**Step 3: Move to appropriate collection**
```json
{
  "tool_id": "raindrop__bookmark_manage",
  "args": {
    "operation": "update",
    "id": 12345,
    "url": "[original URL]",
    "title": "[original title]",
    "collectionId": 63457717,  // WithVoice collection
    "tags": ["business", "high-value", "processed"]
  }
}
```

---

## Known Bugs & Workarounds

### Bug 1: Tag Search Count Mismatch
**Status:** Under investigation
**Workaround:** Manually verify in Raindrop UI

### Bug 2: bulk_edit_raindrops Authorization Errors
**Status:** Broken
**Workaround:** Use individual updates

### Bug 3: getRaindrop Returns Limited Data
**Status:** By design (MCP resource link pattern)
**Workaround:** Use `listRaindrops` or direct API

---

## When to Use Direct API vs MCP

### Use MCP When:
- Creating/updating/deleting individual bookmarks
- Listing collections
- Basic tag/collection management
- Standard CRUD operations

### Use Direct API When:
- Debugging issues
- Need full bookmark JSON immediately
- Bulk operations required (until MCP fixed)
- MCP tool returns unexpected results

**Example Direct API Call:**
```bash
curl -s -H "Authorization: Bearer $RAINDROP_ACCESS_TOKEN" \
  "https://api.raindrop.io/rest/v1/raindrops/-1?tag=@claude" \
  | python3 -m json.tool
```

---

## Quick Checklist for Common Tasks

**Creating a bookmark:**
- [ ] Have URL, title ready
- [ ] Know target collectionId (-1 for Unsorted)
- [ ] Optional: tags array, description

**Updating a bookmark:**
- [ ] Know bookmark ID
- [ ] Have original URL (don't change unless intended)
- [ ] Have original title (don't change unless intended)
- [ ] New tags/description ready

**Searching bookmarks:**
- [ ] Know if searching by tag (exact) or full-text
- [ ] Set reasonable perPage limit (≤50)
- [ ] Verify results count matches expectations

**Bulk processing:**
- [ ] ⚠️ DON'T use bulk_edit_raindrops yet
- [ ] Use sequential individual updates instead
- [ ] Add delays if processing many bookmarks

---

## Future Improvements

### Phase 2 (Planned):
1. Fix tag search exact vs partial matching
2. Fix bulk_edit_raindrops authorization
3. Add better error context in responses
4. Create debug mode with full request/response logging

### Phase 3 (Future):
1. Add MCP Inspector integration
2. Comprehensive test suite for tag operations
3. Validation layer before API calls
4. Helper functions for common workflows

---

## Getting Help

**If you encounter issues:**
1. Check this guide first
2. Verify your operation matches the examples
3. Check "Known Bugs & Workarounds" section
4. Try the direct API equivalent to isolate issue
5. Document the error for future investigation

**Debugging commands:**
```bash
# Verify token
echo $RAINDROP_ACCESS_TOKEN

# List all bookmarks
curl -H "Authorization: Bearer $RAINDROP_ACCESS_TOKEN" \
  "https://api.raindrop.io/rest/v1/raindrops/0" | python3 -m json.tool | head -100

# Get specific bookmark
curl -H "Authorization: Bearer $RAINDROP_ACCESS_TOKEN" \
  "https://api.raindrop.io/rest/v1/raindrop/1443253309" | python3 -m json.tool
```

---

**End of Guide**
