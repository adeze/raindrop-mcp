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

describe('RaindropMCPService Live Tests', () => {
  let mcpService: RaindropMCPService;
  let raindropService: RaindropService;
  let createdCollectionId: number | undefined;
  let createdBookmarkId: number | undefined;

  beforeEach(async () => {
    // Ensure any previous global registrations are cleaned up before creating a new instance
    if (mcpService && typeof mcpService.cleanup === 'function') {
      await mcpService.cleanup();
    }
    mcpService = new RaindropMCPService();
    raindropService = new RaindropService();
    createdCollectionId = undefined;
    createdBookmarkId = undefined;
  });

  afterEach(async () => {
    // Clean up created resources to avoid test pollution
    if (createdBookmarkId) {
      try {
        await raindropService.deleteBookmark(createdBookmarkId);
      } catch (err) {
        process.stderr.write(`Failed to clean up bookmark: ${err}\n`);
      }
    }
    if (createdCollectionId) {
      try {
        await raindropService.deleteCollection(createdCollectionId);
      } catch (err) {
        process.stderr.write(`Failed to clean up collection: ${err}\n`);
      }
    }
    if (typeof mcpService.cleanup === 'function') {
      await mcpService.cleanup();
    }
    // Explicitly stop the server to prevent "Cannot read properties of undefined (reading 'stop')"
    if (mcpService && mcpService.getServer() && typeof mcpService.getServer().stop === 'function') {
      await mcpService.getServer().stop();
    }
    // Set IDs and service to undefined after cleanup to avoid race conditions and double registration
    createdBookmarkId = undefined;
    createdCollectionId = undefined;
    mcpService = undefined as unknown as RaindropMCPService;
    raindropService = undefined as unknown as RaindropService;
  });

  // Removed Live Collection Operations (create/update) tests for read-only policy

  // Removed Live Bookmark Operations (create/update) tests for read-only policy

  describe('Live Resource Access', () => {

    it('should retrieve collections via service', async () => {
      const collections = await raindropService.getCollections();
      expect(collections).toBeDefined();
      expect(Array.isArray(collections)).toBe(true);
      if (collections.length > 0) {
        const firstCollection = collections[0];
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
      // Only test further if tags exist
      if (tags.length > 0) {
        const firstTag = tags[0];
        expect(firstTag._id).toBeDefined();
        expect(firstTag.count).toBeDefined();
      }
    });
  });

  // Removed End-to-End Flow (create/add/delete) tests for read-only policy

  describe('Server Configuration', () => {
    it('should successfully initialize McpServer', () => {
      const server = mcpService.getServer();
      expect(server).toBeDefined();
    });
    
    it('should provide a working createOptimizedRaindropServer factory function', () => {
      // Clear require cache to avoid double registration of tools
      delete require.cache[require.resolve('../src/services/raindropmcp.service.js')];
      const { server, cleanup } = require('../src/services/raindropmcp.service.js').createOptimizedRaindropServer();
      expect(server).toBeDefined();
      expect(typeof cleanup).toBe('function');
      cleanup();
    });
  });
});
