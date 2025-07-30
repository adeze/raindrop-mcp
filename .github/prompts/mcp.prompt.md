# Project Prompt for GitHub Copilot and AI Assistants

This file provides detailed guidance for Copilot and other AI assistants working on this project. Please follow these conventions and use the specified tools for best results.

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
