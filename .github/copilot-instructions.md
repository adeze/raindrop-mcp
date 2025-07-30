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

When working with the Model Context Protocol (MCP) specifications, please refer to :

- use `context7` tool for llm friendly documentation and examples. and also:
- https://modelcontextprotocol.io/llms-full.txt
- https://github.com/modelcontextprotocol/specification
- https://github.com/modelcontextprotocol/typescript-sdk

when building this as a Desktop Extension, abbreviated as "DXT". Please follow these steps:

1. **Read the specifications thoroughly:**

   - https://github.com/anthropics/dxt/blob/main/README.md - DXT architecture overview, capabilities, and integration patterns
   - https://github.com/anthropics/dxt/blob/main/MANIFEST.md - Complete extension manifest structure and field definitions
   - https://github.com/anthropics/dxt/tree/main/examples - Reference implementations including a "Hello World" example

2. **Create a proper extension structure:**

   - Generate a valid manifest.json following the MANIFEST.md spec
   - Implement an MCP server using @modelcontextprotocol/sdk with proper tool definitions
   - Include proper error handling and timeout management

3. **Follow best development practices:**

   - Implement proper MCP protocol communication via stdio transport
   - Structure tools with clear schemas, validation, and consistent JSON responses
   - Make use of the fact that this extension will be running locally
   - Add appropriate logging and debugging capabilities
   - Include proper documentation and setup instructions

4. **Test considerations:**
   - Validate that all tool calls return properly structured responses
   - Verify manifest loads correctly and host integration works

Generate complete, production-ready code that can be immediately tested. Focus on defensive programming, clear error messages, and following the exact
DXT specifications to ensure compatibility with the ecosystem.
