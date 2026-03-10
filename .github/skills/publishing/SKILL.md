---
name: publishing
description: Publishing and release workflow with semantic-release and GitHub Actions
---

# Publishing Skill for @adeze/raindrop-mcp

Use this workflow for all standard releases in this repository.

## Source of Truth

- Release command: `bun run release`
- Release config: `.releaserc.json`
- CI trigger: `.github/workflows/ci.yml` on push to `master`

## Standard Release Flow

1. Merge Conventional Commit-based changes to `master`.
2. CI runs lint, type-check, tests, and build.
3. CI release job runs `semantic-release`.
4. `semantic-release` computes version, updates `CHANGELOG.md`, tags release, publishes npm, and creates a GitHub Release.
5. Release prepare step syncs `manifest.json` and builds `raindrop-mcp.mcpb` so the bundle is attached to the GitHub Release.

## Required Secrets

- `GITHUB_TOKEN`: provided by GitHub Actions.

## Publishing Authentication

- npm publish uses GitHub Actions OIDC trusted publishing.
- No long-lived npm token is required for the standard CI release path.

## Local Verification Before Merge

```bash
bun run lint
bun run type-check
bun run test
bun run build
```

## Conventional Commit Examples

- `fix: handle missing collection id in bulk edit`
- `feat: add includeArchived filter to bookmark_search`
- `feat!: remove deprecated query parameter`

## Rules

- Do not manually bump package versions for standard releases.
- Do not manually create release tags for standard releases.
- Do not run manual npm publish commands for standard releases.
- Keep release behavior in `.releaserc.json` and CI workflow aligned.
