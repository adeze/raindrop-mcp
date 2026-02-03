# Recommended Dev Dependencies for Raindrop MCP

This guide outlines production-ready dev dependencies for testing, linting, formatting, and releasing the Raindrop MCP server.

## Current Project Setup

- **Runtime**: Bun + Node.js (esm)
- **Language**: TypeScript (strict, verbatimModuleSyntax)
- **Testing**: Vitest
- **MCP SDK**: `@modelcontextprotocol/sdk ^1.25.3`

## Recommended Dependencies

### 1. Testing & Coverage (Priority: High)

These ensure test reliability and coverage visibility.

```json
{
  "devDependencies": {
    "vitest": "^2.3.0",
    "@vitest/coverage-v8": "^2.3.0",
    "@vitest/ui": "^2.3.0",
    "happy-dom": "^14.0.0"
  }
}
```

**Why:**

- `vitest`: Lightning-fast unit test runner optimized for Bun/ESM
- `@vitest/coverage-v8`: V8 coverage reports (branch, line, function)
- `@vitest/ui`: Browser-based test reporter (http://localhost:51204/**vitest**/)
- `happy-dom`: Lightweight DOM library if testing resource rendering

**Already installed:** Vitest ^2.2.0 ✓

**Action:** Upgrade to ^2.3.0 for latest fixes and features

### 2. Linting & Code Quality (Priority: High)

Catch issues early, enforce consistency.

```json
{
  "devDependencies": {
    "eslint": "^9.15.0",
    "@typescript-eslint/eslint-plugin": "^8.13.0",
    "@typescript-eslint/parser": "^8.13.0",
    "eslint-config-prettier": "^9.2.0",
    "eslint-plugin-import": "^2.30.0",
    "eslint-plugin-promise": "^7.1.0",
    "eslint-plugin-n": "^17.12.0"
  }
}
```

**Why:**

- `eslint`: Base linter with modern rules
- `@typescript-eslint/*`: TS-aware linting (type-aware rules, unused vars)
- `eslint-config-prettier`: Disables conflicting ESLint rules for formatting
- `eslint-plugin-import`: Enforces import order and unused imports
- `eslint-plugin-promise`: Async/await best practices
- `eslint-plugin-n`: Node.js-specific linting

**.eslintrc.json Config Example:**

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": "./tsconfig.json",
    "tsconfigRootDir": "."
  },
  "plugins": ["@typescript-eslint", "import", "promise", "n"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:promise/recommended",
    "plugin:n/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { "argsIgnorePattern": "^_" }
    ],
    "import/order": [
      "error",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index"
        ],
        "alphabeticalOrder": true,
        "newlinesBetween": "always"
      }
    ]
  }
}
```

**Action:** Install and configure ESLint with TypeScript plugin

### 3. Code Formatting (Priority: High)

Automatic formatting prevents style debates.

```json
{
  "devDependencies": {
    "prettier": "^3.3.0"
  }
}
```

**Why:**

- Zero-config opinionated formatter
- Integrates with ESLint via `eslint-config-prettier`
- Format on save in VS Code (settings.json)

**.prettierrc.json Config:**

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

**VS Code Settings (.vscode/settings.json):**

```json
{
  "[typescript]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": "explicit"
    }
  }
}
```

**Action:** Install Prettier and configure in package.json scripts

### 4. Debugging & Inspection (Priority: High)

Critical for MCP protocol development.

```json
{
  "devDependencies": {
    "@modelcontextprotocol/inspector": "^1.25.3"
  }
}
```

**Why:**

- Official MCP debugging tool for STDIO/HTTP servers
- Visualizes tool/resource schema and message flow
- Real-time tool invocation testing
- Captures diagnostic logs

**Already in project:** Used via `bun run inspector` ✓

**Action:** Document Inspector workflow in dev guide (already done in mcp-inspector.instructions.md)

### 5. Type Checking (Priority: High)

Catch type errors before runtime.

```json
{
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

**Why:**

- Already in project (tsconfig.json configured)
- `bun run type-check` validates without emitting

**Current Config (tsconfig.json):**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "lib": ["ES2020"]
  }
}
```

**Action:** Keep TypeScript pinned to ^5.6.0 in devDependencies

### 6. Test Utilities & Mocking (Priority: Medium)

Optional but useful for complex test scenarios.

```json
{
  "devDependencies": {
    "vitest-mock-extended": "^1.1.0",
    "@testing-library/dom": "^10.4.0",
    "zod": "^3.22.4"
  }
}
```

**Why:**

- `vitest-mock-extended`: Better mock setup (DeepMockProxy)
- `@testing-library/dom`: Query utilities for testing rendered resources
- `zod`: Already in project, use for test fixtures

**Example Mock Pattern:**

```typescript
import { mock } from "vitest-mock-extended";
import RaindropService from "../services/raindrop.service";

const mockRaindropService = mock<RaindropService>();
mockRaindropService.getCollections.mockResolvedValue([
  { _id: 1, title: "Test" },
]);
```

**Action:** Install for advanced testing (optional for MVP)

### 7. Release & Versioning (Priority: Medium)

Automate semantic versioning and changelog generation.

```json
{
  "devDependencies": {
    "semantic-release": "^24.0.0",
    "@semantic-release/git": "^10.0.0",
    "@semantic-release/github": "^10.0.0",
    "@semantic-release/npm": "^12.0.0",
    "@semantic-release/changelog": "^6.0.0",
    "conventional-commits-parser": "^5.0.0"
  }
}
```

**Why:**

- Automates version bumps based on commit messages
- Integrates with GitHub releases and npm
- Generates CHANGELOG.md from conventional commits
- Used by `bun run release:mcpb` workflow

**Current Setup:**

- Uses `bun pm version` for manual bumping
- `semantic-release` optional for CD pipelines

**Action:** Install for GitHub Actions CI/CD automation (optional)

### 8. Documentation (Priority: Low)

Generate API docs from TypeScript/JSDoc.

```json
{
  "devDependencies": {
    "typedoc": "^0.25.0",
    "typedoc-plugin-missing-index": "^0.3.0"
  }
}
```

**Why:**

- Already in project (typedoc.json configured)
- Generates HTML docs from TypeScript source
- Used by `bun run docs` (custom script)

**Current Output:** `/docs/` directory

**Action:** Keep typedoc pinned to ^0.25.0

### 9. Development Server & Hot Reload (Priority: Low)

Improve DX during development.

```json
{
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

**Why:**

- Restart server on file changes
- Better than manual restarts

**Alternative:** Use Bun's built-in `--watch` flag (recommended for Bun projects)

```bash
bun --watch src/index.ts
```

**Action:** Stick with Bun's `--watch` (already in tasks)

### 10. Performance Profiling (Priority: Low)

Optional: Profile tool execution time.

```json
{
  "devDependencies": {
    "clinic": "^13.0.0"
  }
}
```

**Why:**

- Flame graphs and heat maps for latency analysis
- Useful when optimizing tool performance

**Action:** Install only if performance becomes a concern

---

## Recommended package.json Scripts

```json
{
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "dev:http": "bun --watch src/server.ts",
    "build": "bun build --target=node --format=esm --bundle --sourcemap --outdir=build ./src/index.ts ./src/server.ts",
    "start:prod": "node build/index.js",
    "type-check": "tsc --noEmit",
    "lint": "eslint src tests --fix",
    "format": "prettier --write 'src/**/*.ts' 'tests/**/*.ts'",
    "format:check": "prettier --check 'src/**/*.ts' 'tests/**/*.ts'",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "inspector": "npx @modelcontextprotocol/inspector bun run src/index.ts",
    "inspector:http-server": "npx @modelcontextprotocol/inspector bun run src/server.ts",
    "clean": "rm -rf build dist coverage .vitest",
    "docs": "typedoc src --out docs",
    "precommit": "npm run lint && npm run format && npm run type-check && npm run test"
  ]
}
```

---

## Installation Roadmap

### Phase 1: Core (Already Complete)

- [x] TypeScript
- [x] Vitest
- [x] MCP SDK
- [x] Bun

### Phase 2: Quality (Recommended Next)

1. Install ESLint & TypeScript plugin

   ```bash
   bun add -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
   ```

2. Install Prettier

   ```bash
   bun add -D prettier eslint-config-prettier
   ```

3. Configure in VS Code
   - Install extensions: ESLint, Prettier
   - Add .prettierrc.json and .eslintrc.json to root

### Phase 3: CI/CD (Optional)

1. Semantic Release (for automated versioning)

   ```bash
   bun add -D semantic-release @semantic-release/git @semantic-release/github
   ```

2. GitHub Actions (lint, test, build, release on push)
   - Create `.github/workflows/test.yml`

### Phase 4: Advanced (As Needed)

- vitest-mock-extended for complex mocking
- clinic for performance profiling
- typedoc for API documentation

---

## Dev Dependency Comparison Chart

| Category    | Package                         | Version | Why              | Already?  |
| ----------- | ------------------------------- | ------- | ---------------- | --------- |
| Testing     | vitest                          | ^2.3.0  | Fast, Bun-native | ✅ v2.2.0 |
| Coverage    | @vitest/coverage-v8             | ^2.3.0  | V8 coverage      | ❌        |
| Coverage UI | @vitest/ui                      | ^2.3.0  | Browser test UI  | ❌        |
| Linting     | eslint                          | ^9.15.0 | Base linter      | ❌        |
| TS Linting  | @typescript-eslint/\*           | ^8.13.0 | Type-aware rules | ❌        |
| Formatting  | prettier                        | ^3.3.0  | Code formatter   | ❌        |
| Type Check  | typescript                      | ^5.6.0  | Type validation  | ✅        |
| Debugging   | @modelcontextprotocol/inspector | ^1.25.3 | MCP debug tool   | ✅        |
| Docs        | typedoc                         | ^0.25.0 | API docs         | ✅        |
| Release     | semantic-release                | ^24.0.0 | Auto versioning  | ❌        |

---

## Summary & Action Items

### Immediate (This Sprint)

- [ ] Upgrade Vitest to ^2.3.0
- [ ] Install ESLint + @typescript-eslint plugins
- [ ] Install Prettier
- [ ] Configure `.eslintrc.json` and `.prettierrc.json`
- [ ] Update VS Code workspace settings
- [ ] Add lint/format scripts to package.json

### Soon (Next Sprint)

- [ ] Add GitHub Actions workflow for lint → test → build
- [ ] Update CONTRIBUTING.md with lint/format/test instructions
- [ ] Add pre-commit hooks (husky) for local enforcement

### Optional (Later)

- [ ] Set up semantic-release for automated versioning
- [ ] Add vitest-mock-extended for advanced mocking
- [ ] Profile tool performance with clinic.js

---

## References

- [Bun Package Management](https://bun.sh/docs/cli/add)
- [ESLint Configuration](https://eslint.org/docs/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [Vitest Documentation](https://vitest.dev)
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [Semantic Release](https://semantic-release.gitbook.io/semantic-release/)
