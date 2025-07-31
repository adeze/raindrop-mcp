---
applyTo: "**"
---

# Instructions for GitHub Copilot and other AI assistants

- Keep your code modular, well-documented, and easy to maintain.
- Prefer modern, type-safe, and idiomatic TypeScript. Use zod for schema validation where appropriate.
- Use async/await consistently for asynchronous code.
- Group imports by type (external, then internal).
- Use camelCase for variables/functions, PascalCase for classes/types.
- Use try/catch for error handling with descriptive error messages.
- Prefer interfaces for object types.
- If you encounter ambiguity, prefer explicitness and reference the relevant documentation or example repositories.
- For project-wide conventions, detailed documentation, and tool usage, see the #.github/copilot.prompt.md file.
-

## Coding Conventions

- Ensure complete API coverage for Raindrop.io and MCP endpoints.
- Prefer modern, type-safe, and idiomatic TypeScript. Use zod for schema validation where appropriate.
- Keep code modular, well-documented, and easy to maintain.
- If you encounter ambiguity, prefer explicitness and reference the relevant documentation or example repositories.
- the buld diretory is `build` and the source directory is `src`.

  **Follow best development practices:**

- Implement proper MCP protocol communication via stdio transport
- Structure tools with clear schemas, validation, and consistent JSON responses
- Make use of the fact that this extension will be running locally
- Add appropriate logging and debugging capabilities
- Include proper documentation and setup instructions

**Test considerations:**

- Validate that all tool calls return properly structured responses
- Verify manifest loads correctly and host integration works

## Documentation and References

- `#fetch` [Raindrop.io API documentation](https://developer.raindrop.io) for all Raindrop-related endpoints, authentication, and data models.
- `#fetch` [Model Context Protocol documentation](https://modelcontextprotocol.io/) and specifically [LLMs integration guide](https://modelcontextprotocol.io/llms-full.txt) to ensure MCP compliance and best practices.
- `#githubRepo` [Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) for implementation details and usage patterns.

## Tooling

- Do NOT use console.log for STDIO-based local servers, as it may interfere with protocol communication.
- For debugging MCP servers, `#fetch` the [MCP Debugging Instructions](https://modelcontextprotocol.io/docs/tools/debugging).
- Use the [Inspector tool](https://modelcontextprotocol.io/docs/tools/inspector) and its repository at https://github.com/modelcontextprotocol/inspector for protocol inspection and debugging.
- Use [Vitest](https://vitest.dev/) for all tests. Place tests in the appropriate src/tests/ directory.
- Use `Bun` for package management and scripts, not npm. All install, build, and run commands should use Bun syntax.
- Use tools `#concept7` for documentation access and reference whenever possible, especially for SDKs, APIs, and protocol details.

- MCP Protocol specification use `#fetch` at `https://github.com/modelcontextprotocol/specification`

- For MCP server implementations, use the `#githubRepo` tool to access `modelcontextprotocol/serverstypescript-sdk/src/examples/README.md`
- LLM friendly documentation is `https://context7.com/context7/developer_raindrop_io/llms.txt`
- Best practice boilerplate is available at `#githubRepo` [ MCP Boilerplate](https://github.com/cyanheads/mcp-ts-template

Generate complete, production-ready code that can be immediately tested. Focus on defensive programming, clear error messages, and following the exact
DXT specifications to ensure compatibility with the ecosystem.

LLM friendly documentation is `https://context7.com/context7/developer_raindrop_io/llms.txt`
Best practice boilerplate is available at `#githubRepo` [ MCP Boilerplate](https://github.com/cyanheads/mcp-ts-template
