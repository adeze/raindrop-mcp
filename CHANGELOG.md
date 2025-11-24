# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive technical documentation system
  - `docs/MCP_SDK_INTEGRATION.md` - Deep-dive on schema registration patterns
  - `docs/TROUBLESHOOTING.md` - Common errors and diagnostic procedures
  - `docs/KNOWN_ISSUES.md` - Issue tracking with resolution status
- Inline code comments explaining schema registration requirements
- "Recent Fixes & Improvements" section in README.md

### Fixed
- **CRITICAL:** Schema registration causing `._def` null reference errors
  - Root cause: Passing ZodObject instead of ZodRawShape to MCP SDK
  - Solution: Restored `.shape` extraction to get plain object SDK expects
  - Impact: All 10 tools now work correctly in both Claude Desktop and Claude Code
- **HIGH:** Tag search accuracy (87% false positive rate)
  - Added `exactTagMatch` parameter for client-side filtering
  - Impact: 23 results → 3 results (exact matches only)
- **HIGH:** Bulk edit authorization (100% failure rate)
  - Added missing Authorization header to bulk edit requests
  - Impact: Bulk operations now fully functional
- **HIGH:** Zod version compatibility
  - Downgraded from invalid `^4.1.9` to stable `^3.23.8`
  - Eliminated schema validation errors at startup

### Changed
- Updated documentation structure for better maintainability
- Enhanced PR descriptions for easier upstream review

### Removed
- Temporary PR description files (moved content to GitHub)
- Session milestone documentation (no longer needed)

## [2.0.16] - 2025-11-24

### Summary
This release resolves all critical issues that were blocking core functionality. All 10 tools are now fully operational in both Claude Desktop and Claude Code when used with Super-MCP router.

### Technical Details

#### Schema Registration Fix
The MCP SDK wraps inputSchema with `z.object()` internally (mcp.js:443), expecting ZodRawShape (plain object), not ZodObject. Using `.shape` property extracts the plain object:

```typescript
// Before (broken):
inputSchema: config.inputSchema

// After (working):
inputSchema: (config.inputSchema as z.ZodObject<any>).shape
```

**Evidence:**
- MCP SDK source: `@modelcontextprotocol/sdk/dist/cjs/server/mcp.js:443`
- Zod documentation: `.shape` returns ZodRawShape from ZodObject
- Testing: All tools execute successfully with proper validation

#### Tag Search Fix
Raindrop API returns full-text search results even when filtering by tag. Added client-side filtering with `exactTagMatch` parameter to ensure only bookmarks with exact tag matches are returned.

**Before:** 23 results (3 correct + 20 false positives) = 87% error rate
**After:** 3 results (3 correct + 0 false positives) = 0% error rate

#### Bulk Edit Fix
Bulk edit endpoint was missing Authorization header. Simple fix with major impact:

```typescript
headers: {
    'Authorization': `Bearer ${this.token}`,
    'Content-Type': 'application/json'
}
```

### Testing
- ✅ All 10 tools tested via MCP Inspector
- ✅ Verified in Claude Desktop (stdio transport)
- ✅ Verified in Claude Code (HTTP transport via Super-MCP)
- ✅ All 8 Super-MCP managed servers healthy

### Documentation
- Complete investigation timeline preserved in vault
- Technical explanation with SDK source code references
- Troubleshooting guide for future developers
- Inline code comments for maintainability

### Dependencies
- Zod: `^4.1.9` → `^3.23.8` (downgrade to stable version)

### Breaking Changes
None. All changes are fixes and enhancements.

### Migration Guide
If upgrading from previous versions:
1. Update dependencies: `bun install`
2. Rebuild: `bun run build`
3. Restart MCP server or Super-MCP service
4. No configuration changes required

## [2.0.15] - 2025-11-21

### Fixed
- Tag search accuracy improvements (initial investigation)
- Bulk edit functionality (authorization fixes)

### Added
- Enhanced tool configurations
- Debug scripts for tag search testing

## [2.0.11] - 2025-11-21

### Changed
- Initial fork and local development setup
- Integration with Super-MCP router

---

## Version History Legend

- **CRITICAL** - Complete tool failure, blocks all functionality
- **HIGH** - Major functionality broken, workaround difficult
- **MEDIUM** - Annoying but workaround available
- **LOW** - Minor inconvenience

---

## Links

- [GitHub Repository](https://github.com/adeze/raindrop-mcp)
- [MCP SDK Documentation](https://modelcontextprotocol.io/)
- [Raindrop API Documentation](https://developer.raindrop.io/)
- [NPM Package](https://www.npmjs.com/package/@adeze/raindrop-mcp)

---

## Maintainer Notes

### For Future Releases

When creating a new release:

1. **Update version:**
   ```bash
   bun run bump:patch  # or bump:minor or bump:major
   ```

2. **Update this CHANGELOG:**
   - Move [Unreleased] items to new version section
   - Add date and version number
   - Create new empty [Unreleased] section

3. **Commit and tag:**
   ```bash
   git add CHANGELOG.md package.json
   git commit -m "chore: bump version to X.Y.Z"
   git tag vX.Y.Z
   git push && git push --tags
   ```

4. **Create GitHub release:**
   ```bash
   bun run release:dxt
   ```

### Changelog Sections

Use these sections in order (omit if empty):
- **Added** - New features
- **Changed** - Changes to existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security vulnerability fixes
