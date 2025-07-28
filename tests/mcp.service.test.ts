import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import RaindropMCPService, { createRaindropServer } from '../src/services/mcp.service.js';
import raindropService from '../src/services/raindrop.service.js';
import type { Collection, Bookmark } from '../src/types/raindrop.js';
import { config } from 'dotenv';
config(); // Load .env file

describe('RaindropMCPService Live Tests', () => {
  let mcpService: RaindropMCPService;
  // For storing references to created items so we can clean up
  let createdCollectionId: number;
  let createdBookmarkId: number;

  beforeEach(() => {
    // Create a fresh instance of the service for each test
    mcpService = new RaindropMCPService();
  });

  afterEach(async () => {
    // Clean up created resources to avoid test pollution
    if (createdBookmarkId) {
      try {
        await raindropService.deleteBookmark(createdBookmarkId);
      } catch (err) {
        console.error('Failed to clean up bookmark:', err);
      }
    }

    if (createdCollectionId) {
      try {
        await raindropService.deleteCollection(createdCollectionId);
      } catch (err) {
        console.error('Failed to clean up collection:', err);
      }
    }

    // Stop the MCP service
    await mcpService.stop();
  });

  describe('Live Collection Operations', () => {
    it('should create a new collection', async () => {
      const server = mcpService.getServerInstance();
      const toolResult = await server.callTool('createCollection', {
        title: `Test Collection ${Date.now()}`,
        isPublic: false
      });

      expect(toolResult).toBeDefined();
      expect(toolResult.content).toHaveLength(1);
      expect(toolResult.content[0].text).toContain('Test Collection');
      
      // Store ID for cleanup
      createdCollectionId = toolResult.content[0].metadata.id;
      
      // Verify collection was created by fetching it
      const collection = await raindropService.getCollection(createdCollectionId);
      expect(collection._id).toBe(createdCollectionId);
    });
    
    it('should update a collection', async () => {
      // First create a collection
      const collection = await raindropService.createCollection(`Test Collection ${Date.now()}`, false);
      createdCollectionId = collection._id;
      
      // Then update it
      const server = mcpService.getServerInstance();
      const newTitle = `Updated Collection ${Date.now()}`;
      
      const toolResult = await server.callTool('updateCollection', {
        id: createdCollectionId,
        title: newTitle,
        isPublic: true
      });
      
      expect(toolResult.content[0].text).toBe(newTitle);
      expect(toolResult.content[0].metadata.public).toBe(true);
      
      // Verify update
      const updatedCollection = await raindropService.getCollection(createdCollectionId);
      expect(updatedCollection.title).toBe(newTitle);
      expect(updatedCollection.public).toBe(true);
    });
  });

  describe('Live Bookmark Operations', () => {
    it('should create a bookmark in a collection', async () => {
      // First create a collection
      const collection = await raindropService.createCollection(`Test Collection ${Date.now()}`, false);
      createdCollectionId = collection._id;
      
      // Then create a bookmark in that collection
      const server = mcpService.getServerInstance();
      const toolResult = await server.callTool('createBookmark', {
        link: "https://example.com",
        collectionId: createdCollectionId,
        title: `Test Bookmark ${Date.now()}`,
        excerpt: "Test excerpt",
        tags: ["test", "example"]
      });
      
      expect(toolResult).toBeDefined();
      expect(toolResult.content).toHaveLength(1);
      expect(toolResult.content[0].type).toBe("resource");
      expect(toolResult.content[0].resource.uri).toBe("https://example.com");
      
      // Store ID for cleanup
      createdBookmarkId = toolResult.content[0].resource.metadata.id;
      
      // Verify bookmark was created
      const bookmark = await raindropService.getBookmark(createdBookmarkId);
      expect(bookmark._id).toBe(createdBookmarkId);
      expect(bookmark.link).toBe("https://example.com");
    });
    
    it('should update an existing bookmark', async () => {
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
      const server = mcpService.getServerInstance();
      const newTitle = `Updated Bookmark ${Date.now()}`;
      
      await server.callTool('updateBookmark', {
        id: createdBookmarkId,
        title: newTitle,
        excerpt: "Updated excerpt",
        tags: ["updated", "test"]
      });
      
      // Verify update
      const updatedBookmark = await raindropService.getBookmark(createdBookmarkId);
      expect(updatedBookmark.title).toBe(newTitle);
      expect(updatedBookmark.excerpt).toBe("Updated excerpt");
      expect(updatedBookmark.tags).toContain("updated");
    });
  });

  describe('Live Resource Access', () => {
    it('should retrieve collections via resource handler', async () => {
      const server = mcpService.getServerInstance();
      const result = await server.getResource('collections://all');
      
      expect(result).toBeDefined();
      expect(result.contents).toBeDefined();
      expect(Array.isArray(result.contents)).toBe(true);
      
      if (result.contents.length > 0) {
        const firstCollection = result.contents[0];
        expect(firstCollection.uri).toContain('collections://all/');
        expect(firstCollection.metadata.id).toBeDefined();
      }
    });
    
    it('should retrieve user info via resource handler', async () => {
      const server = mcpService.getServerInstance();
      const result = await server.getResource('user://info');
      
      expect(result).toBeDefined();
      expect(result.contents).toHaveLength(1);
      
      const userInfo = result.contents[0];
      expect(userInfo.text).toContain('User:');
      expect(userInfo.metadata.id).toBeDefined();
      expect(userInfo.metadata.email).toBeDefined();
    });
    
    it('should retrieve tags via resource handler', async () => {
      const server = mcpService.getServerInstance();
      const result = await server.getResource('tags://all');
      
      expect(result).toBeDefined();
      expect(result.contents).toBeDefined();
      expect(Array.isArray(result.contents)).toBe(true);
      
      // Only test further if tags exist
      if (result.contents.length > 0) {
        const firstTag = result.contents[0];
        expect(firstTag.uri).toContain('tags://all/');
        expect(firstTag.text).toBeDefined();
        expect(firstTag.metadata.count).toBeDefined();
      }
    });
  });

  describe('End-to-End Flow', () => {
    it('should create collection, add bookmarks, and retrieve them', async () => {
      const server = mcpService.getServerInstance();
      
      // 1. Create a collection
      const collectionResult = await server.callTool('createCollection', {
        title: `Test E2E Collection ${Date.now()}`,
        isPublic: false
      });
      
      createdCollectionId = collectionResult.content[0].metadata.id;
      
      // 2. Add a bookmark to the collection
      const bookmarkResult = await server.callTool('createBookmark', {
        link: "https://example.com",
        collectionId: createdCollectionId,
        title: `Test E2E Bookmark ${Date.now()}`,
        tags: ["e2e", "test"]
      });
      
      createdBookmarkId = bookmarkResult.content[0].resource.metadata.id;
      
      // 3. Get the collection's bookmarks
      const bookmarksResult = await server.callTool('getBookmarksInCollection', {
        collectionId: createdCollectionId
      });
      
      expect(bookmarksResult.content.length).toBeGreaterThan(0);
      const bookmarkIds = bookmarksResult.content.map(item => 
        item.resource.metadata.id
      );
      expect(bookmarkIds).toContain(createdBookmarkId);
      
      // 4. Verify we can get the bookmark directly
      const singleBookmarkResult = await server.callTool('getBookmark', {
        id: createdBookmarkId
      });
      
      expect(singleBookmarkResult.content[0].resource.metadata.id).toBe(createdBookmarkId);
    });
  });

  describe('Server Configuration', () => {
    it('should successfully initialize McpServer', () => {
      const server = mcpService.getServerInstance();
      expect(server).toBeDefined();
    });
    
    it('should provide a working createRaindropServer factory function', () => {
      const { server, cleanup } = createRaindropServer();
      expect(server).toBeDefined();
      expect(cleanup).toBeInstanceOf(Function);
      cleanup();
    });
  });
});
