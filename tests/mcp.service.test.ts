import { config } from 'dotenv';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import RaindropService from '../src/services/raindrop.service.js';
import { RaindropMCPService } from '../src/services/raindropmcp.service.js';

// Defensive check: Ensure RAINDROP_ACCESS_TOKEN is present before running tests
config();
if (!process.env.RAINDROP_ACCESS_TOKEN || process.env.RAINDROP_ACCESS_TOKEN.trim() === '') {
  throw new Error(
    'RAINDROP_ACCESS_TOKEN is missing or empty. Please set it in your environment or .env file before running tests.'
  );
}

describe('RaindropMCPService Read-Only Live Tests', () => {
  let mcpService: RaindropMCPService;
  let raindropService: RaindropService;

  beforeEach(async () => {
    // Defensive: Clean up any previous global registrations
    if (mcpService && typeof mcpService.cleanup === 'function') {
      await mcpService.cleanup();
    }
    mcpService = new RaindropMCPService();
    raindropService = new RaindropService();
  });

  afterEach(async () => {
    if (typeof mcpService?.cleanup === 'function') {
      await mcpService.cleanup();
    }
    mcpService = undefined as unknown as RaindropMCPService;
    raindropService = undefined as unknown as RaindropService;
  });

  describe('Live Resource Access (Read-Only)', () => {
    it('should retrieve collections via service', async () => {
      const collections = await raindropService.getCollections();
      expect(collections).toBeDefined();
      expect(Array.isArray(collections)).toBe(true);
      if (collections.length > 0) {
        const firstCollection = collections[0];
        expect(firstCollection).toBeDefined();
        expect(firstCollection._id).toBeDefined();
        expect(firstCollection.title).toBeDefined();
      }
    });

    it('should retrieve user info via service', async () => {
      const userInfo = await raindropService.getUserInfo();
      expect(userInfo).toBeDefined();
      expect(userInfo._id).toBeDefined();
      expect(userInfo.email).toBeDefined();
      expect(userInfo.fullName || userInfo.email).toBeDefined();
    });

    it('should retrieve tags via service', async () => {
      const tags = await raindropService.getTags();
      expect(tags).toBeDefined();
      expect(Array.isArray(tags)).toBe(true);
      if (tags.length > 0) {
        const firstTag = tags[0];
        expect(firstTag._id).toBeDefined();
        expect(firstTag.count).toBeDefined();
      }
    });

    it('should retrieve highlights for a valid collection (if any exist)', async () => {
      const collections = await raindropService.getCollections();
      if (collections.length > 0) {
        const firstCollection = collections[0];
        const highlights = await raindropService.getHighlightsByCollection(firstCollection._id);
        expect(highlights).toBeDefined();
        expect(Array.isArray(highlights)).toBe(true);
      }
    });

    // Bookmarks-by-collection method does not exist; test tags-by-collection as a read-only example
    it('should retrieve tags for a valid collection (if any exist)', async () => {
      const collections = await raindropService.getCollections();
      if (collections.length > 0) {
        const firstCollection = collections[0];
        const tags = await raindropService.getTagsByCollection(firstCollection._id);
        expect(tags).toBeDefined();
        expect(Array.isArray(tags)).toBe(true);
      }
    });

    it('should handle error when retrieving tags for invalid collection', async () => {
      await expect(raindropService.getTagsByCollection(-1)).rejects.toBeInstanceOf(Error);
    });

    it('should handle error when retrieving highlights for invalid collection', async () => {
      await expect(raindropService.getHighlightsByCollection(-1)).rejects.toBeInstanceOf(Error);
    });
  });

  describe('Server Configuration', () => {
    it('should successfully initialize McpServer', () => {
      const server = mcpService.getServer();
      expect(server).toBeDefined();
    });

    it('should provide a working createOptimizedRaindropServer factory function', () => {
      // Clear require cache to avoid double registration of tools
      delete require.cache[require.resolve('../src/services/raindropmcp.service.ts')];
      const { server, cleanup } = require('../src/services/raindropmcp.service.ts').createOptimizedRaindropServer();
      expect(server).toBeDefined();
      expect(typeof cleanup).toBe('function');
      cleanup();
    });
  });

  // Additional read-only tests for MCP endpoints (if exposed)
  it('should expose a valid MCP manifest', async () => {
    // Defensive: manifest should be loaded and valid JSON
    const manifest = require('../manifest.json');
    expect(manifest).toBeDefined();
    expect(typeof manifest).toBe('object');
    expect(manifest.name).toBeDefined();
    expect(manifest.tools).toBeDefined();
  });
});

