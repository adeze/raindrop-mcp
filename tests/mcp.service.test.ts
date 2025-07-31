import { config } from 'dotenv';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import RaindropService from '../src/services/raindrop.service.js';
import { RaindropMCPService } from '../src/services/raindropmcp.service.js';
config(); // Load .env file


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

  describe('Live Collection Operations', () => {
    it.skip('should create a new collection (requires valid Raindrop.io API token)', async () => {
      const server = mcpService.getServer();
      const toolResult = await server.tool('collection_create', {
        title: `Test Collection ${Date.now()}`,
        isPublic: false
      });

      expect(toolResult).toBeDefined();
      expect(toolResult.content).toHaveLength(1);
      expect(toolResult.content[0].text).toContain('Created collection');

      // Store ID for cleanup
      createdCollectionId = toolResult.content[0].metadata.id;

      // Verify collection was created by fetching it
      if (createdCollectionId) {
        const collection = await raindropService.getCollection(createdCollectionId);
        expect(collection._id).toBe(createdCollectionId);
      }
    });
    
    it.skip('should update a collection (requires valid Raindrop.io API token)', async () => {
      // First create a collection
      const collection = await raindropService.createCollection(`Test Collection ${Date.now()}`, false);
      createdCollectionId = collection._id;
      
      // Then update it
      const server = mcpService.getServer();
      const newTitle = `Updated Collection ${Date.now()}`;
      
      const toolResult = await server.tool('collection_update', {
        id: createdCollectionId,
        title: newTitle,
        isPublic: true
      });
      
      expect(toolResult.content[0].text).toContain('Updated collection');
      expect(toolResult.content[0].metadata.public).toBe(true);

      // Verify update
      if (createdCollectionId) {
        const updatedCollection = await raindropService.getCollection(createdCollectionId);
        expect(updatedCollection.title).toBe(newTitle);
        expect(updatedCollection.public).toBe(true);
      }
    });
  });

  describe('Live Bookmark Operations', () => {
    it.skip('should create a bookmark in a collection (requires valid Raindrop.io API token)', async () => {
      // First create a collection
      const collection = await raindropService.createCollection(`Test Collection ${Date.now()}`, false);
      createdCollectionId = collection._id;
      
      // Then create a bookmark in that collection
      const server = mcpService.getServer();
      const toolResult = await server.tool('bookmark_create', {
        url: "https://example.com",
        collectionId: createdCollectionId,
        title: `Test Bookmark ${Date.now()}`,
        description: "Test excerpt",
        tags: ["test", "example"]
      });
      
      expect(toolResult).toBeDefined();
      expect(toolResult.content).toHaveLength(1);
      expect(toolResult.content[0].type).toBe("resource");
      expect(toolResult.content[0].resource.uri).toBe("https://example.com");

      // Store ID for cleanup
      createdBookmarkId = toolResult.content[0].resource.metadata.id;

      // Verify bookmark was created
      if (createdBookmarkId) {
        const bookmark = await raindropService.getBookmark(createdBookmarkId);
        expect(bookmark._id).toBe(createdBookmarkId);
        expect(bookmark.link).toBe("https://example.com");
      }
    });
    
    it.skip('should update an existing bookmark (requires valid Raindrop.io API token)', async () => {
      // First create a collection
      const collection = await raindropService.createCollection(`Test Collection ${Date.now()}`, false);
      createdCollectionId = collection._id;
      
      // Then create a bookmark
      const bookmark = await raindropService.createBookmark(createdCollectionId, {
        link: "https://example.com",
        title: `Original Bookmark ${Date.now()}`,
        excerpt: "Original excerpt"
      });
      createdBookmarkId = bookmark._id;
      
      // Update the bookmark
      const server = mcpService.getServer();
      const newTitle = `Updated Bookmark ${Date.now()}`;
      
      await server.tool('bookmark_update', {
        id: createdBookmarkId,
        title: newTitle,
        description: "Updated excerpt",
        tags: ["updated", "test"]
      });
      
      // Verify update
      if (createdBookmarkId) {
        const updatedBookmark = await raindropService.getBookmark(createdBookmarkId);
        expect(updatedBookmark.title).toBe(newTitle);
        expect(updatedBookmark.excerpt).toBe("Updated excerpt");
        expect(updatedBookmark.tags).toContain("updated");
      }
    });
  });

  describe('Live Resource Access', () => {
    it.skip('should retrieve collections via resource handler (requires valid Raindrop.io API token)', async () => {
      const server = mcpService.getServer();
      const result = await server.resource('raindrop://collections/all');
      
      expect(result).toBeDefined();
      expect(result.contents).toBeDefined();
      expect(Array.isArray(result.contents)).toBe(true);

      if (result.contents.length > 0) {
        const firstCollection = result.contents[0];
        expect(firstCollection.uri).toContain('raindrop://collections/item/');
        expect(firstCollection.metadata.id).toBeDefined();
      }
    });
    
    it.skip('should retrieve user info via resource handler (requires valid Raindrop.io API token)', async () => {
      const server = mcpService.getServer();
      const result = await server.resource('raindrop://user/profile');
      
      expect(result).toBeDefined();
      expect(result.contents).toHaveLength(1);

      const userInfo = result.contents[0];
      expect(userInfo.text).toContain('User:');
      expect(userInfo.metadata.id).toBeDefined();
      expect(userInfo.metadata.email).toBeDefined();
    });
    
    it.skip('should retrieve tags via resource handler (requires valid Raindrop.io API token)', async () => {
      const server = mcpService.getServer();
      const result = await server.resource('raindrop://tags/all');
      
      expect(result).toBeDefined();
      expect(result.contents).toBeDefined();
      expect(Array.isArray(result.contents)).toBe(true);

      // Only test further if tags exist
      if (result.contents.length > 0) {
        const firstTag = result.contents[0];
        expect(firstTag.uri).toContain('raindrop://tags/item/');
        expect(firstTag.text).toBeDefined();
        expect(firstTag.metadata.count).toBeDefined();
      }
    });
  });

  describe('End-to-End Flow', () => {
    it.skip('should create collection, add bookmarks, and retrieve them (requires valid Raindrop.io API token)', async () => {
      const server = mcpService.getServer();
      
      // 1. Create a collection
      const collectionResult = await server.tool('collection_create', {
        title: `Test E2E Collection ${Date.now()}`,
        isPublic: false
      });
      
      createdCollectionId = collectionResult.content[0].metadata.id;
      
      // 2. Add a bookmark to the collection
      const bookmarkResult = await server.tool('bookmark_create', {
        url: "https://example.com",
        collectionId: createdCollectionId,
        title: `Test E2E Bookmark ${Date.now()}`,
        tags: ["e2e", "test"]
      });
      
      createdBookmarkId = bookmarkResult.content[0].resource.metadata.id;
      
      // 3. Get the collection's bookmarks
      if (createdCollectionId) {
        const bookmarksResult = await raindropService.getBookmarks({ collection: createdCollectionId });
        expect(bookmarksResult.items.length).toBeGreaterThan(0);
        const bookmarkIds = bookmarksResult.items.map(item => 
          item._id
        );
        expect(bookmarkIds).toContain(createdBookmarkId);
      }
      
      // 4. Verify we can get the bookmark directly
      if (createdBookmarkId) {
        const singleBookmarkResult = await server.tool('bookmark_get', {
          id: createdBookmarkId
        });
        expect(singleBookmarkResult.content[0].resource.metadata.id).toBe(createdBookmarkId);
      }
    });
  });

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
