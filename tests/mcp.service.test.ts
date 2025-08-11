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

// Test constants for URIs and resource IDs (populate these as needed)
const USER_PROFILE_URI = 'mcp://user/profile';
const DIAGNOSTICS_URI = 'diagnostics://server';
const TEST_COLLECTION_ID = 55725911; // <-- set your known collection ID here
const TEST_RAINDROP_ID = 1286757883;   // <-- set your known raindrop/bookmark ID here
// Add more constants here as needed for other read-only resources

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

  // Only readonly API calls and metadata/resource checks are tested below

  it('should successfully initialize McpServer', () => {
    const server = mcpService.getServer();
    expect(server).toBeDefined();
  });

  it('should read the user_profile resource via a public API', async () => {
    // Add a public method to RaindropMCPService for resource reading if not present
    if (typeof mcpService.readResource !== 'function') {
      throw new Error('readResource(uri: string) public method not implemented on RaindropMCPService');
    }
    const result = await mcpService.readResource(USER_PROFILE_URI);
    expect(result).toBeDefined();
    expect(result.contents).toBeDefined();
    expect(Array.isArray(result.contents)).toBe(true);
    expect(result.contents[0].uri).toBe(USER_PROFILE_URI);
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

  it('should read the diagnostics resource via a public API', async () => {
    if (typeof mcpService.readResource !== 'function') {
      throw new Error('readResource(uri: string) public method not implemented on RaindropMCPService');
    }
    const result = await mcpService.readResource(DIAGNOSTICS_URI);
    expect(result).toBeDefined();
    expect(result.contents).toBeDefined();
    expect(Array.isArray(result.contents)).toBe(true);
    expect(result.contents[0].uri).toBe(DIAGNOSTICS_URI);
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

  it('should read a specific collection resource', async () => {
    if (typeof mcpService.readResource !== 'function') {
      throw new Error('readResource(uri: string) public method not implemented on RaindropMCPService');
    }
    const collectionUri = `mcp://collection/${TEST_COLLECTION_ID}`;
    const result = await mcpService.readResource(collectionUri);
    expect(result).toBeDefined();
    expect(result.contents).toBeDefined();
    expect(Array.isArray(result.contents)).toBe(true);
    expect(result.contents[0].uri).toBe(collectionUri);
    expect(result.contents[0].text).toContain('collection');
  });

  it('should read a specific raindrop (bookmark) resource', async () => {
    if (typeof mcpService.readResource !== 'function') {
      throw new Error('readResource(uri: string) public method not implemented on RaindropMCPService');
    }
    const raindropUri = `mcp://raindrop/${TEST_RAINDROP_ID}`;
    const result = await mcpService.readResource(raindropUri);
    expect(result).toBeDefined();
    expect(result.contents).toBeDefined();
    expect(Array.isArray(result.contents)).toBe(true);
    expect(result.contents[0].uri).toBe(raindropUri);
    expect(result.contents[0].text).toContain('raindrop');
  });

  // Additional test to output actual return values for inspection
  it('should output actual API data for inspection', async () => {
    console.log('=== Testing actual API responses ===');

    // Test user profile
    try {
      const userResult = await mcpService.readResource(USER_PROFILE_URI);
      console.log('User Profile Result:', JSON.stringify(userResult, null, 2));
    } catch (error) {
      console.log('User Profile Error:', error instanceof Error ? error.message : String(error));
    }

    // Test diagnostics
    try {
      const diagResult = await mcpService.readResource(DIAGNOSTICS_URI);
      console.log('Diagnostics Result:', JSON.stringify(diagResult, null, 2));
    } catch (error) {
      console.log('Diagnostics Error:', error instanceof Error ? error.message : String(error));
    }

    // Test collection
    try {
      const collectionUri = `mcp://collection/${TEST_COLLECTION_ID}`;
      const collectionResult = await mcpService.readResource(collectionUri);
      console.log('Collection Result:', JSON.stringify(collectionResult, null, 2));
    } catch (error) {
      console.log('Collection Error:', error instanceof Error ? error.message : String(error));
    }

    // Test raindrop
    try {
      const raindropUri = `mcp://raindrop/${TEST_RAINDROP_ID}`;
      const raindropResult = await mcpService.readResource(raindropUri);
      console.log('Raindrop Result:', JSON.stringify(raindropResult, null, 2));
    } catch (error) {
      console.log('Raindrop Error:', error instanceof Error ? error.message : String(error));
    }

    // Test available tools
    try {
      const tools = await mcpService.listTools();
      console.log('Available Tools:', tools.map(t => ({ id: t.id, name: t.name, description: t.description })));
    } catch (error) {
      console.log('Tools Error:', error instanceof Error ? error.message : String(error));
    }

    // Test available resources
    try {
      const resources = mcpService.listResources();
      console.log('Available Resources:', resources);
    } catch (error) {
      console.log('Resources Error:', error instanceof Error ? error.message : String(error));
    }

    console.log('=== End of API inspection ===');

    // This test always passes - it's just for inspection
    expect(true).toBe(true);
  });
});

