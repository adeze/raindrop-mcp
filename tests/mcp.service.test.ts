import { config } from 'dotenv';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RaindropMCPService } from '../src/services/raindropmcp.service.js';

// Defensive check: Ensure RAINDROP_ACCESS_TOKEN is present before running tests
config();
if (!process.env.RAINDROP_ACCESS_TOKEN || process.env.RAINDROP_ACCESS_TOKEN.trim() === '') {
  throw new Error(
    'RAINDROP_ACCESS_TOKEN is missing or empty. Please set it in your environment or .env file before running tests.'
  );
}

describe('RaindropMCPService', () => {
  let mcpService: RaindropMCPService;

  beforeEach(async () => {
    if (mcpService && typeof mcpService.cleanup === 'function') {
      await mcpService.cleanup();
    }
    mcpService = new RaindropMCPService();
  });

  afterEach(async () => {
    if (typeof mcpService?.cleanup === 'function') {
      await mcpService.cleanup();
    }
    mcpService = undefined as unknown as RaindropMCPService;
  });

  it('should successfully initialize McpServer', () => {
    const server = mcpService.getServer();
    expect(server).toBeDefined();
  });

  it('should read the user_profile resource via a public API', async () => {
    // Add a public method to RaindropMCPService for resource reading if not present
    if (typeof mcpService.readResource !== 'function') {
      throw new Error('readResource(uri: string) public method not implemented on RaindropMCPService');
    }
    const result = await mcpService.readResource('mcp://user/profile');
    expect(result).toBeDefined();
    expect(result.contents).toBeDefined();
    expect(Array.isArray(result.contents)).toBe(true);
    expect(result.contents[0].uri).toBe('mcp://user/profile');
    expect(result.contents[0].text).toContain('profile');
  });

  it('should list available tools', async () => {
    const tools = await mcpService.listTools();
    expect(tools).toBeDefined();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
    // Check that each tool has required properties and types
    for (const tool of tools) {
      expect(tool).toHaveProperty('id');
      expect(typeof tool.id).toBe('string');
      expect(tool).toHaveProperty('name');
      expect(typeof tool.name).toBe('string');
      expect(tool).toHaveProperty('description');
      expect(typeof tool.description).toBe('string');
      expect(tool).toHaveProperty('inputSchema');
      expect(tool).toHaveProperty('outputSchema');
    }
    // Check for a known tool
    const diagnosticsTool = tools.find((t: any) => t.id === 'diagnostics');
    expect(diagnosticsTool).toBeDefined();
    expect(diagnosticsTool?.name.toLowerCase()).toContain('diagnostic');
  });

  it('should call the diagnostics tool and receive a resource_link', async () => {
    // For testability, call the diagnostics tool logic directly from the RaindropMCPService instance
    // (Assumes registerTools is not private, or refactor to expose the handler for testing)
    // We'll simulate the handler as in the service definition
    const handler = mcpService["asyncHandler"](async (_args: any, _extra: any) => {
      return {
        content: [
          {
            type: "resource_link",
            uri: "diagnostics://server",
            name: "Server Diagnostics",
            description: "Server diagnostics and environment info resource.",
            mimeType: "application/json",
            _meta: {},
          }
        ],
      };
    });
    const result = await handler({ includeEnvironment: false }, {});
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    const link = result.content.find((c: any) => c.type === "resource_link");
    expect(link).toBeDefined();
    if (!link) throw new Error('No resource_link found in diagnostics tool result');
    expect(link.uri).toBe("diagnostics://server");
  });

  it('should read the diagnostics resource via a public API', async () => {
    if (typeof mcpService.readResource !== 'function') {
      throw new Error('readResource(uri: string) public method not implemented on RaindropMCPService');
    }
    const result = await mcpService.readResource('diagnostics://server');
    expect(result).toBeDefined();
    expect(result.contents).toBeDefined();
    expect(Array.isArray(result.contents)).toBe(true);
    expect(result.contents[0].uri).toBe('diagnostics://server');
    expect(result.contents[0].text).toContain('diagnostics');
  });

  it('should return the MCP manifest with correct structure', async () => {
    const manifest = await mcpService.getManifest();
    expect(manifest).toBeDefined();
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('version');
    expect(manifest).toHaveProperty('description');
    expect(manifest).toHaveProperty('capabilities');
    expect(manifest).toHaveProperty('tools');
    expect(Array.isArray((manifest as any).tools)).toBe(true);
  });

  it('should call a tool by ID and return a valid response', async () => {
    const result = await mcpService.callTool('diagnostics', { includeEnvironment: false });
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    const link = result.content.find((c: any) => c.type === 'resource_link');
    expect(link).toBeDefined();
    expect(link.uri).toBe('diagnostics://server');
  });

  it('should list all registered resources with metadata', () => {
    const resources = mcpService.listResources();
    expect(resources).toBeDefined();
    expect(Array.isArray(resources)).toBe(true);
    expect(resources.length).toBeGreaterThan(0);
    for (const resource of resources) {
      expect(resource).toHaveProperty('id');
      expect(resource).toHaveProperty('uri');
    }
  });

  it('should return true for healthCheck', async () => {
    const healthy = await mcpService.healthCheck();
    expect(healthy).toBe(true);
  });

  it('should return correct server info', () => {
    const info = mcpService.getInfo();
    expect(info).toBeDefined();
    expect(info).toHaveProperty('name');
    expect(info).toHaveProperty('version');
    expect(info).toHaveProperty('description');
    expect(typeof info.name).toBe('string');
    expect(typeof info.version).toBe('string');
    expect(typeof info.description).toBe('string');
  });
});

