---

---

# MCP Inspector CLI Prompt

This prompt guides you to use the MCP Inspector tool in CLI mode for protocol inspection, debugging, and tool listing in a VS Code environment.

## Prerequisites

- Ensure you have Node.js and npx installed.
- Install MCP Inspector: `npx -y @modelcontextprotocol/inspector --help`
- Build your MCP server (e.g., `bun run build` or equivalent).

## Usage Examples

### List Available Tools

Run the following command in your VS Code terminal:

```
npx -y @modelcontextprotocol/inspector --cli node build/index.js --method tools/list
```

### Send a Protocol Request (e.g., ping)

```
npx -y @modelcontextprotocol/inspector --cli node build/index.js --method ping
```

### Debugging and Inspection

- Use Inspector CLI to wrap your MCP server and inspect protocol traffic.
- Example for STDIO server:

```
npx -y @modelcontextprotocol/inspector node build/index.js
```

- For HTTP server:

```
npx -y @modelcontextprotocol/inspector node build/server.js
```

## Tips

- Use Inspector CLI flags for advanced filtering, logging, and output formatting. See Inspector documentation for details.
- Integrate Inspector CLI commands into your VS Code tasks or launch configurations for automated inspection and debugging.
- Use Vitest or your preferred test runner to automate CLI checks (see `tests/inspector.test.ts` for examples).

## References

- [MCP Inspector GitHub](https://github.com/modelcontextprotocol/inspector)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)

---

This prompt is designed for VS Code users working with MCP protocol servers and the Inspector tool in CLI mode.
