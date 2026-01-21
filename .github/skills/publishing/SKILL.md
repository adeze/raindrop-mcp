# Publishing Skill for @adeze/raindrop-mcp

Automates and manages the complete publishing workflow for @adeze/raindrop-mcp from version bumping through npm registry deployment.

## Overview

This skill encapsulates the end-to-end publishing process, ensuring consistent version management, proper synchronization across configuration files, and reliable deployment via GitHub Actions with npm Trusted Publishers.

## Publishing Workflow

### 1. Pre-Publication Checklist

Before publishing, verify:
- ✅ All tests passing: `bun run test`
- ✅ Type-check passing: `bun run type-check`
- ✅ Build successful: `bun run build`
- ✅ All changes committed to git
- ✅ No uncommitted work on master branch

### 2. Version Bump

Bump semantic version using Bun:

```bash
bun pm version <MAJOR.MINOR.PATCH>
```

**Examples:**
- Patch: `bun pm version 2.1.2` (bug fixes)
- Minor: `bun pm version 2.2.0` (new features)
- Major: `bun pm version 3.0.0` (breaking changes)

### 3. Sync All Version Files

Update version numbers in ALL four files to maintain consistency:

**Files to update:**
1. **package.json** - Already updated by `bun pm version`
2. **manifest.json** - DXT manifest version (lines 2-4)
3. **CLAUDE.md** - Project guidelines (around line 8)
4. **README.md** - User documentation (around line 278)

**Version reference locations:**
```json
// manifest.json
{
  "dxt_version": "0.1",
  "name": "@adeze/raindrop-mcp",
  "version": "X.X.X",
```

```markdown
// CLAUDE.md
### Version Information
- **Current version**: X.X.X
```

```markdown
// README.md
## 📋 Recent Enhancements (vX.X.X)
```

### 4. Build & Commit

```bash
# Rebuild with new version
bun run build

# Stage all version updates
git add package.json manifest.json CLAUDE.md README.md

# Commit with semantic message
git commit -m "chore: bump version to X.X.X"

# Push to master
git push origin master
```

### 5. Create & Push Version Tag

```bash
# Create semantic version tag
git tag vX.X.X

# Push tag to trigger GitHub Actions
git push origin vX.X.X
```

**Note:** If tag already exists:
```bash
git tag -d vX.X.X
git tag vX.X.X
git push origin vX.X.X --force
```

### 6. GitHub Actions Automatic Steps

Once tag is pushed, GitHub Actions automatically:

1. ✅ Checks out code
2. ✅ Sets up Node.js & Bun
3. ✅ Installs dependencies
4. ✅ Runs type-check: `bun run type-check`
5. ✅ Builds: `bun run build`
6. ✅ **Publishes to npm** via Trusted Publishers (OIDC-based, no token needed)
7. ✅ Deletes existing GitHub Release (if present)
8. ✅ Creates new GitHub Release

## npm Trusted Publishers Setup

**One-time setup required:**

1. Go to: https://www.npmjs.com/settings/@adeze/packages
2. Click **raindrop-mcp** package
3. Go to **Settings** tab
4. Scroll to **Publishing access**
5. Click **Configure trusted publishers**
6. Select **GitHub Actions**
7. Fill in:
   - **Owner:** `adeze`
   - **Repository:** `raindrop-mcp`
   - **Workflow:** `publish.yml`
   - **Environment:** (leave blank)
8. Click **Add**

**Benefits:**
- 🔒 No static tokens needed (OIDC-based)
- 🔄 No token rotation required
- 📋 Automatic provenance attestation
- ✨ Zero maintenance

## Workflow File

Location: `.github/workflows/publish.yml`

**Key permissions:**
```yaml
permissions:
  id-token: write
  contents: write
```

**Key steps:**
- Node.js 24 with `registry-url: https://registry.npmjs.org`
- `npm publish --provenance --access public`
- GitHub release creation: deletes existing release first, then creates new one

## Monitoring Workflow Status

### Using GitHub CLI

Check the latest workflow run:

```bash
gh run list --limit 1
```

**Output statuses:**
- `*` - Running
- `✓` - Completed successfully
- `✗` - Failed

View detailed logs:

```bash
gh run view <run-id>
```

### Using GitHub MCP Tools

**Check latest release:**

Call `mcp_github_get_latest_release` with:
- `owner`: adeze
- `repo`: raindrop-mcp

This returns the most recent release and confirms:
- `tag_name` matches your version (e.g., v2.1.2)
- `published_at` is recent
- Workflow executed successfully

## Troubleshooting

### Error: "cannot publish over previously published versions"

**Cause:** Version already exists on npm
**Solution:** Bump semantic version and retry

### Error: "Release.tag_name already exists"

**Cause:** GitHub release already exists from previous publish attempt
**Solution:** Workflow automatically deletes existing release before creating a new one

### Error: "need auth This command requires you to be logged in"

**Cause:** npm Trusted Publishers not configured
**Solution:** Complete one-time setup at https://www.npmjs.com/settings/@adeze/packages

## Full Publishing Command Sequence

```bash
# 1. Verify all tests pass
bun run test
bun run type-check
bun run build

# 2. Bump version (example: 2.1.1 → 2.1.2)
bun pm version 2.1.2

# 3. Update all version files
# - manifest.json (line 3)
# - CLAUDE.md (line 9)
# - README.md (line 278)

# 4. Build & commit
bun run build
git add package.json manifest.json CLAUDE.md README.md
git commit -m "chore: bump version to 2.1.2"
git push origin master

# 5. Create & push tag (triggers workflow)
git tag v2.1.2
git push origin v2.1.2

# 6. Monitor workflow with GitHub CLI
gh run list --limit 1

# 7. Verify once workflow completes (✓ status)
npm view @adeze/raindrop-mcp@2.1.2
mcp_github_get_latest_release owner=adeze repo=raindrop-mcp
```

## Verification

After workflow completes (usually 30-60 seconds):

1. **Check workflow status with GitHub CLI:**

   ```bash
   gh run list --limit 1
   # Should show ✓ status indicating success
   ```

2. **Verify latest GitHub release created:**
   - Use `mcp_github_get_latest_release` to verify release exists
   - Should match the version you just published
   - `body` field contains "MCP Server for Raindrop.io"

3. **Verify npm publication:**

   ```bash
   npm view @adeze/raindrop-mcp@2.1.2
   ```
   
   Should return package metadata confirming it's live

4. **Verify package installation:**
   ```bash
   npm install @adeze/raindrop-mcp@2.1.2
   ```

## Important Notes

- **Semantic Versioning:** Follow semver strictly (MAJOR.MINOR.PATCH)
- **Version Synchronization:** All 4 files MUST have matching versions
- **Master Branch:** Always publish from master
- **No Token Management:** Trusted Publishers eliminates token rotation burden
- **Provenance:** All publishes include cryptographic provenance attestation

## Related Resources

- [npm Trusted Publishers Docs](https://docs.npmjs.com/trusted-publishers)
- [GitHub Blog: npm Classic Tokens Revoked](https://github.blog/changelog/2025-12-09-npm-classic-tokens-revoked-session-based-auth-and-cli-token-management-now-available/)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
