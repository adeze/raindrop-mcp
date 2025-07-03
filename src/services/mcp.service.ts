import { McpServer, ResourceTemplate  } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { z } from "zod";
import raindropService from './raindrop.service.js';
import { type Collection, type Bookmark,  type Highlight,type SearchParams } from '../types/raindrop.js';
import {
  CallToolRequestSchema,
  CompleteRequestSchema,
  type CreateMessageRequest,
  CreateMessageResultSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  type LoggingLevel,
  ReadResourceRequestSchema,
  type Resource,
  SetLevelRequestSchema,
  SubscribeRequestSchema,
  type Tool,
  ToolSchema,
  UnsubscribeRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { zodToJsonSchema } from "zod-to-json-schema";
import { 
  CollectionResponseSchema, 
  CollectionListResponseSchema,
  BookmarkResponseSchema,
  BookmarkListResponseSchema,
  TagResponseSchema,
  HighlightResponseSchema,
  UserResponseSchema,
  StatsResponseSchema,
  ImportExportResponseSchema,
  OperationResultResponseSchema,
  type CollectionResponse,
  type BookmarkResponse,
  type TagResponse
} from '../schemas/output.js';
import { 
  validateToolOutput, 
  createToolMetadata, 
  createValidatedToolHandler,
  createToolResponse
} from '../schemas/validation.js';

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

/**
 * Raindrop.io MCP Service
 * 
 * This service implements the Model Context Protocol (MCP) for the Raindrop.io bookmarking service.
 * It provides both resources and tools for working with Raindrop.io data.
 * 
 * Resources follow URI patterns like:
 * - collections://all - All collections
 * - collections://{parentId}/children - Child collections
 * - tags://all - All tags
 * - highlights://all - All highlights
 * - user://info - User information
 * - user://stats - User statistics
 * 
 * For debugging with Inspector, see:
 * https://modelcontextprotocol.io/docs/tools/inspector
 */
export class RaindropMCPService {
  private server: McpServer;

  private subsUpdateInterval: NodeJS.Timeout | undefined;
  private logsUpdateInterval: NodeJS.Timeout | undefined;
  private subscriptions: Set<string> = new Set();
  private logLevel: LoggingLevel = "debug";

  // Initialize the server
  constructor() {
    this.server = new McpServer({
        name: 'raindrop-mcp',
        version: '1.1.0',
        description: 'MCP Server for Raindrop.io bookmarking service',
        capabilities: {
            logging: false // Keep logging off for STDIO compatibility
        }
    });

    // Initialize subscriptions and notifications
    //this.setupSubscriptions();
    this.setupLogging();
    
    // Initialize resources and tools
    this.initializeResources();
    this.initializeTools();
  }

  // private setupSubscriptions() {
  //   // Set up update interval for subscribed resources
  //   this.subsUpdateInterval = setInterval(() => {
  //     for (const uri of this.subscriptions) {
  //       this.server.notification({
  //         method: "notifications/resources/updated",
  //         params: { uri },
  //       });
  //     }
  //   }, 5000);
  // }

  private setupLogging() {
    const messages = [
      { level: "debug", data: "Debug-level message" },
      { level: "info", data: "Info-level message" },
      { level: "notice", data: "Notice-level message" },
      { level: "warning", data: "Warning-level message" },
      { level: "error", data: "Error-level message" },
      { level: "critical", data: "Critical-level message" },
      { level: "alert", data: "Alert level-message" },
      { level: "emergency", data: "Emergency-level message" },
    ];

    const isMessageIgnored = (level: LoggingLevel): boolean => {
      const currentLevel = messages.findIndex((msg) => this.logLevel === msg.level);
      const messageLevel = messages.findIndex((msg) => level === msg.level);
      return messageLevel < currentLevel;
    };

    // Set up update interval for random log messages
    // this.logsUpdateInterval = setInterval(() => {
    //   let message = {
    //     method: "notifications/message",
    //     params: messages[Math.floor(Math.random() * messages.length)],
    //   };
    //   if (!isMessageIgnored(message.params.level as LoggingLevel))
    //     this.server.notification(message);
    // }, 15000);
  }

  // Helper method to request sampling from client
  // private async requestSampling(
  //   context: string,
  //   uri: string,
  //   maxTokens: number = 100
  // ) {
  //   const request: CreateMessageRequest = {
  //     method: "sampling/createMessage",
  //     params: {
  //       messages: [
  //         {
  //           role: "user",
  //           content: {
  //             type: "text",
  //             text: `Resource ${uri} context: ${context}`,
  //           },
  //         },
  //       ],
  //       systemPrompt: "You are a helpful test server.",
  //       maxTokens,
  //       temperature: 0.7,
  //       includeContext: "thisServer",
  //     },
  //   };

  //   return await this.server.request(request, CreateMessageResultSchema);
  // }
  

private initializeResources(){
 // Define a resource for all collections
 this.server.resource(
  "collections",
  "collections://all",
  async (uri) => {
    const collections = await raindropService.getCollections();
    return {
      method: "resources/read",
      params: {
        uri: uri.href
      },
      contents: collections.map(collection => ({
        uri: `${uri.href}/${collection._id}`,
        text: collection.title,
        metadata: {
          id: collection._id,
          count: collection.count,
          public: collection.public,
          created: collection.created,
          lastUpdate: collection.lastUpdate
        }
      }))
    };
  }
);

// Define a resource for child collections
this.server.resource(
  "child-collections",
  new ResourceTemplate("collections://{parentId}/children", { list: undefined }),
  async (uri, { parentId }) => {
    const collections = await raindropService.getChildCollections(Number(parentId));
    return {
      contents: collections.map(collection => ({
        uri: `${uri.href}/${collection._id}`,
        text: collection.title,
        metadata: {
          id: collection._id,
          count: collection.count,
          public: collection.public,
          created: collection.created,
          lastUpdate: collection.lastUpdate
        }
      }))
    };
  }
);

    // Convert getTags to a resource
    this.server.resource(
      'tags',
      'tags://all',
      async (uri) => {
        const tags = await raindropService.getTags();
        return {
          contents: tags.map(tag => ({
            uri: `${uri.href}/${tag._id}`,
            text: tag._id,
            metadata: {
              count: tag.count
            }
          }))
        };
      }
    );

    // Tags filtered by collection
    this.server.resource(
      'collection-tags',
      new ResourceTemplate('tags://collection/{collectionId}', { list: undefined }),
      async (uri, { collectionId }) => {
        const tags = await raindropService.getTagsByCollection(Number(collectionId));
        return {
          contents: tags.map(tag => ({
            uri: `${uri.href}/${tag._id}`,
            text: tag._id,
            metadata: {
              count: tag.count
            }
          })),
          metadata: {
            collectionId: Number(collectionId)
          }
        };
      }
    );
  
    // Convert getAllHighlights to a resource
    this.server.resource(
      'highlights',
      'highlights://all',
      async (uri) => {
        const highlights = await raindropService.getAllHighlights();
        return {
          contents: highlights.map(highlight => ({
            uri: `${uri.href}/${highlight._id}`,
            text: highlight.text,
            metadata: {
              id: highlight._id,
              raindropId: highlight.raindrop?._id,
              raindropTitle: highlight.raindrop?.title,
              raindropLink: highlight.raindrop?.link,
              note: highlight.note,
              color: highlight.color,
              created: highlight.created,
              lastUpdate: highlight.lastUpdate,
              title: highlight.title,
              tags: highlight.tags,
              link: highlight.link,
              domain: highlight.domain,
              excerpt: highlight.excerpt
            }
          }))
        };
      }
    );

    // Highlights for a specific bookmark
    this.server.resource(
      'raindrop-highlights',
      new ResourceTemplate('highlights://raindrop/{raindropId}', { list: undefined }),
      async (uri, { raindropId }) => {
        const highlights = await raindropService.getHighlights(Number(raindropId));
        return {
          contents: highlights.map(highlight => ({
            uri: `${uri.href}/${highlight._id}`,
            text: highlight.text,
            metadata: {
              id: highlight._id,
              raindropId: highlight.raindrop?._id,
              raindropTitle: highlight.raindrop?.title,
              raindropLink: highlight.raindrop?.link,
              note: highlight.note,
              color: highlight.color,
              created: highlight.created,
              lastUpdate: highlight.lastUpdate,
              tags: highlight.tags
            }
          })),
          metadata: {
            raindropId: Number(raindropId)
          }
        };
      }
    );

    // Highlights filtered by collection
    this.server.resource(
      'collection-highlights',
      new ResourceTemplate('highlights://collection/{collectionId}', { list: undefined }),
      async (uri, { collectionId }) => {
        const highlights = await raindropService.getHighlightsByCollection(Number(collectionId));
        return {
          contents: highlights.map(highlight => ({
            uri: `${uri.href}/${highlight._id}`,
            text: highlight.text,
            metadata: {
              id: highlight._id,
              raindropId: highlight.raindrop?._id,
              raindropTitle: highlight.raindrop?.title,
              raindropLink: highlight.raindrop?.link,
              note: highlight.note,
              color: highlight.color,
              created: highlight.created,
              lastUpdate: highlight.lastUpdate,
              tags: highlight.tags
            }
          })),
          metadata: {
            collectionId: Number(collectionId)
          }
        };
      }
    );

    // Bookmarks in a collection
    this.server.resource(
      'collection-bookmarks',
      new ResourceTemplate('bookmarks://collection/{collectionId}', { list: undefined }),
      async (uri, { collectionId }) => {
        const result = await raindropService.getBookmarks({ collection: Number(collectionId) });
        return {
          contents: result.items.map(bookmark => ({
            uri: `bookmarks://raindrop/${bookmark._id}`,
            text: bookmark.title || bookmark.link,
            metadata: {
              id: bookmark._id,
              link: bookmark.link,
              excerpt: bookmark.excerpt,
              tags: bookmark.tags,
              created: bookmark.created,
              lastUpdate: bookmark.lastUpdate,
              type: bookmark.type
            }
          })),
          metadata: {
            collectionId: Number(collectionId),
            count: result.count
          }
        };
      }
    );

    // Specific bookmark by ID
    this.server.resource(
      'bookmark',
      new ResourceTemplate('bookmarks://raindrop/{id}', { list: undefined }),
      async (uri, { id }) => {
        const bookmark = await raindropService.getBookmark(Number(id));
        return {
          contents: [{
            uri: bookmark.link,
            text: bookmark.title || "Untitled Bookmark",
            metadata: {
              id: bookmark._id,
              link: bookmark.link,
              excerpt: bookmark.excerpt,
              tags: bookmark.tags,
              collectionId: bookmark.collection?.$id,
              created: bookmark.created,
              lastUpdate: bookmark.lastUpdate,
              type: bookmark.type,
              important: bookmark.important
            }
          }]
        };
      }
    );
  
    // Convert getUserInfo to a resource
    this.server.resource(
      'user-info',
      'user://info',
      async (uri) => {
        const user = await raindropService.getUserInfo();
        return {
          contents: [{
            uri: uri.href,
            text: `User: ${user.fullName || user.email}`,
            metadata: {
              id: user._id,
              email: user.email,
              fullName: user.fullName,
              pro: user.pro,
              registered: user.registered
            }
          }]
        };
      }
    );
  
    // Convert getUserStats to a resource
    this.server.resource(
      'user-stats',
      'user://stats',
      async (uri) => {
        const stats = await raindropService.getUserStats();
        return {
          contents: [{
            uri: uri.href,
            text: `User Statistics`,
            metadata: stats
          }]
        };
      }
    );
  
}

  /**
   * Initialize all MCP tools for interacting with Raindrop.io
   * Tools are organized by category:
   * - Collection operations
   * - Bookmark operations
   * - Tag operations
   * - Highlight operations
   * - User operations
   * - Import/Export operations
   */
  private initializeTools() {
    // Collection operations
    this.server.tool(
      'getCollection',
      'Get a specific collection by ID',
      {
        id: z.number().describe('Collection ID')
      },
      createValidatedToolHandler(async ({ id }) => {
        try {
          const collection = await raindropService.getCollection(id);
          return createToolResponse([{
            type: "text",
            text: collection.title,
            metadata: {
              id: collection._id,
              title: collection.title,
              count: collection.count,
              public: collection.public,
              created: collection.created,
              lastUpdate: collection.lastUpdate,
              category: 'collection' as const
            }
          }], undefined, CollectionResponseSchema);
        } catch (error) {
          throw new Error(`Failed to get collection: ${(error as Error).message}`);
        }
      }, CollectionResponseSchema),
      createToolMetadata(CollectionResponseSchema, 'collections')
    );

    this.server.tool(
      'getCollections',
      'Get all collections',
      {},
      createValidatedToolHandler(async () => {
        try {
          const collections = await raindropService.getCollections();
          return createToolResponse(collections.map(collection => ({
            type: "text",
            text: collection.title,
            metadata: {
              id: collection._id,
              title: collection.title,
              count: collection.count,
              public: collection.public,
              created: collection.created,
              lastUpdate: collection.lastUpdate,
              category: 'collection' as const
            }
          })), undefined, CollectionListResponseSchema);
        } catch (error) {
          throw new Error(`Failed to get collections: ${(error as Error).message}`);
        }
      }, CollectionListResponseSchema),
      createToolMetadata(CollectionListResponseSchema, 'collections')
    );

   

    this.server.tool(
      'createCollection',
      'Create a new collection',
      {
        title: z.string().describe('Collection title'),
        isPublic: z.boolean().optional().describe('Whether the collection is public')
      },
      createValidatedToolHandler(async ({ title, isPublic }) => {
        try {
          const collection = await raindropService.createCollection(title, isPublic);
          return createToolResponse([{
            type: "text",
            text: collection.title,
            metadata: {
              id: collection._id,
              title: collection.title,
              count: collection.count,
              public: collection.public,
              created: collection.created,
              lastUpdate: collection.lastUpdate,
              category: 'collection' as const
            }
          }], undefined, CollectionResponseSchema);
        } catch (error) {
          throw new Error(`Failed to create collection: ${(error as Error).message}`);
        }
      }, CollectionResponseSchema),
      createToolMetadata(CollectionResponseSchema, 'collections')
    );

    this.server.tool(
      'updateCollection',
      'Update an existing collection',
      {
        id: z.number().describe('Collection ID'),
        title: z.string().optional().describe('New title'),
        isPublic: z.boolean().optional().describe('Whether the collection is public'),
        view: z.enum(['list', 'simple', 'grid', 'masonry']).optional().describe('View type'),
        sort: z.enum(['title', '-created']).optional().describe('Sort order')
      },
      async ({ id, ...updates }) => {
        try {
          // Convert isPublic to 'public' key expected by API
          const apiUpdates: Record<string, any> = { ...updates };
          if ('isPublic' in updates) {
            apiUpdates.public = updates.isPublic;
            delete apiUpdates.isPublic;
          }
          
          const collection = await raindropService.updateCollection(id, apiUpdates);
          return {
            content: [{
              type: "text",
              text: collection.title,
              metadata: {
                id: collection._id,
                count: collection.count,
                public: collection.public
              }
            }]
          };
        } catch (error) {
          throw new Error(`Failed to update collection: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'deleteCollection',
      'Delete a collection',
      {
        id: z.number().describe('Collection ID')
      },
      async ({ id }) => {
        try {
          await raindropService.deleteCollection(id);
          return {
            content: [{
              type: "text",
              text: `Collection ${id} successfully deleted.`
            }]
          };
        } catch (error) {
          throw new Error(`Failed to delete collection: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'shareCollection',
      'Share a collection with others',
      {
        id: z.number().describe('Collection ID'),
        level: z.enum(['view', 'edit', 'remove']).describe('Access level'),
        emails: z.array(z.string().email()).optional().describe('Email addresses to share with')
      },
      async ({ id, level, emails }) => {
        try {
          const result = await raindropService.shareCollection(id, level, emails);
          return {
            content: [{
              type: "text",
              text: `Collection shared successfully. Public link: ${result.link}`,
              metadata: {
                link: result.link,
                accessCount: result.access?.length || 0
              }
            }]
          };
        } catch (error) {
          throw new Error(`Failed to share collection: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'mergeCollections',
      'Merge multiple collections into one target collection',
      {
        targetId: z.number().describe('Target Collection ID'),
        sourceIds: z.array(z.number()).describe('Source Collection IDs to merge')
      },
      async ({ targetId, sourceIds }) => {
        try {
          await raindropService.mergeCollections(targetId, sourceIds);
          return {
            content: [{
              type: "text",
              text: `Successfully merged ${sourceIds.length} collections into collection ${targetId}.`
            }]
          };
        } catch (error) {
          throw new Error(`Failed to merge collections: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'removeEmptyCollections',
      'Remove all empty collections',
      {},
      async () => {
        try {
          const result = await raindropService.removeEmptyCollections();
          return {
            content: [{
              type: "text",
              text: `Removed ${result.count} empty collections.`
            }]
          };
        } catch (error) {
          throw new Error(`Failed to remove empty collections: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'emptyTrash',
      'Empty the trash by permanently deleting all raindrops in it',
      {},
      async () => {
        try {
          await raindropService.emptyTrash();
          return {
            content: [{
              type: "text",
              text: `Trash emptied successfully.`
            }]
          };
        } catch (error) {
          throw new Error(`Failed to empty trash: ${(error as Error).message}`);
        }
      }
    );

    // Bookmark operations
    this.server.tool(
      'getBookmark',
      'Get a specific bookmark by ID',
      {
        id: z.number().describe('Bookmark ID')
      },
      async ({ id }) => {
        try {
          const bookmark = await raindropService.getBookmark(id);
          return {
            content: [{
              type: "resource",
              resource: {
                text: bookmark.title || "Untitled Bookmark",
                uri: bookmark.link,
                metadata: {
                  id: bookmark._id,
                  excerpt: bookmark.excerpt,
                  tags: bookmark.tags,
                  collectionId: bookmark.collection?.$id,
                  created: bookmark.created,
                  lastUpdate: bookmark.lastUpdate,
                  type: bookmark.type
                }
              }
            }]
          };
        } catch (error) {
          throw new Error(`Failed to get bookmark: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'getBookmarks',
      'Get bookmarks with optional filtering',
      {
        collection: z.number().optional().describe('Collection ID'),
        search: z.string().optional().describe('Search query'),
        tags: z.array(z.string()).optional().describe('Filter by tags'),
        page: z.number().optional().describe('Page number'),
        perPage: z.number().optional().describe('Items per page (max 50)'),
        sort: z.enum(['title', '-title', 'domain', '-domain', 'created', '-created', 'lastUpdate', '-lastUpdate'])
          .optional()
          .describe('Sort order')
      },
      async (params) => {
        try {
          const result = await raindropService.getBookmarks(params);
          return {
            content: result.items.map(bookmark => ({
              type: "resource",
              resource: {
                text: bookmark.title || "Untitled Bookmark",
                uri: bookmark.link,
                metadata: {
                  id: bookmark._id,
                  excerpt: bookmark.excerpt,
                  tags: bookmark.tags,
                  collectionId: bookmark.collection?.$id,
                  created: bookmark.created,
                  lastUpdate: bookmark.lastUpdate,
                  type: bookmark.type
                }
              }
            })),
            metadata: {
              total: result.count,
              page: params.page || 0
            }
          };
        } catch (error) {
          throw new Error(`Failed to get bookmarks: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'searchBookmarks',
      'Search bookmarks with advanced filters',
      {
        search: z.string().optional().describe('Search query'),
        collection: z.number().optional().describe('Collection ID'),
        tags: z.array(z.string()).optional().describe('Filter by tags'),
        createdStart: z.string().optional().describe('Created after date (ISO format)'),
        createdEnd: z.string().optional().describe('Created before date (ISO format)'),
        important: z.boolean().optional().describe('Only important bookmarks'),
        media: z.enum(['image', 'video', 'document', 'audio']).optional().describe('Media type filter'),
        page: z.number().optional().describe('Page number'),
        perPage: z.number().optional().describe('Items per page (max 50)'),
        sort: z.string().optional().describe('Sort order (e.g., "title", "-created")')
      },
      createValidatedToolHandler(async (params) => {
        try {
          const result = await raindropService.searchRaindrops(params);
          return createToolResponse(result.items.map(bookmark => ({
            type: "resource" as const,
            resource: {
              text: bookmark.title || "Untitled Bookmark",
              uri: bookmark.link,
              metadata: {
                id: bookmark._id,
                title: bookmark.title,
                link: bookmark.link,
                excerpt: bookmark.excerpt,
                tags: bookmark.tags,
                collectionId: bookmark.collection?.$id,
                created: bookmark.created,
                lastUpdate: bookmark.lastUpdate,
                type: bookmark.type,
                important: bookmark.important,
                domain: bookmark.domain,
                category: 'bookmark' as const
              }
            }
          })), {
            total: result.count,
            page: params.page || 0
          }, BookmarkListResponseSchema);
        } catch (error) {
          throw new Error(`Failed to search bookmarks: ${(error as Error).message}`);
        }
      }, BookmarkListResponseSchema),
      createToolMetadata(BookmarkListResponseSchema, 'bookmarks')
    );

    this.server.tool(
      'createBookmark',
      'Create a new bookmark',
      {
        link: z.string().url().describe('URL of the bookmark'),
        collectionId: z.number().describe('Collection ID'),
        title: z.string().optional().describe('Title of the bookmark'),
        excerpt: z.string().optional().describe('Short description'),
        tags: z.array(z.string()).optional().describe('List of tags'),
        important: z.boolean().optional().describe('Mark as important')
      },
      async ({ collectionId, ...data }) => {
        try {
          const bookmark = await raindropService.createBookmark(collectionId, data);
          return {
            content: [{
              type: "resource",
              resource: {
                text: bookmark.title || "Untitled Bookmark",
                uri: bookmark.link,
                metadata: {
                  id: bookmark._id,
                  excerpt: bookmark.excerpt,
                  tags: bookmark.tags,
                  collectionId: bookmark.collection?.$id,
                  created: bookmark.created,
                  lastUpdate: bookmark.lastUpdate,
                  type: bookmark.type
                }
              }
            }]
          };
        } catch (error) {
          throw new Error(`Failed to create bookmark: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'updateBookmark',
      'Update an existing bookmark',
      {
        id: z.number().describe('Bookmark ID'),
        title: z.string().optional().describe('Title of the bookmark'),
        excerpt: z.string().optional().describe('Short excerpt or description'),
        tags: z.array(z.string()).optional().describe('List of tags'),
        collectionId: z.number().optional().describe('Collection ID to move the bookmark to'),
        important: z.boolean().optional().describe('Mark as important')
      },
      async ({ id, collectionId, ...updates }) => {
        try {
          const apiUpdates: Record<string, any> = { ...updates };
          if (collectionId !== undefined) {
            apiUpdates.collection = { $id: collectionId };
          }
          
          const updatedBookmark = await raindropService.updateBookmark(id, apiUpdates);
          return {
            content: [{
              type: "resource",
              resource: {
                text: updatedBookmark.title || "Untitled Bookmark",
                uri: updatedBookmark.link,
                metadata: {
                  id: updatedBookmark._id,
                  excerpt: updatedBookmark.excerpt,
                  tags: updatedBookmark.tags,
                  collectionId: updatedBookmark.collection?.$id,
                  created: updatedBookmark.created,
                  lastUpdate: updatedBookmark.lastUpdate,
                  type: updatedBookmark.type
                }
              }
            }]
          };
        } catch (error) {
          throw new Error(`Failed to update bookmark: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'deleteBookmark',
      'Delete a bookmark',
      {
        id: z.number().describe('Bookmark ID'),
        permanent: z.boolean().optional().describe('Permanently delete (skip trash)')
      },
      async ({ id, permanent }) => {
        try {
          if (permanent) {
            await raindropService.permanentDeleteBookmark(id);
          } else {
            await raindropService.deleteBookmark(id);
          }
          
          return {
            content: [{
              type: "text",
              text: `Bookmark ${id} successfully ${permanent ? 'permanently ' : ''}deleted.`
            }]
          };
        } catch (error) {
          throw new Error(`Failed to delete bookmark: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'batchUpdateBookmarks',
      'Update multiple bookmarks at once',
      {
        ids: z.array(z.number()).describe('List of bookmark IDs'),
        tags: z.array(z.string()).optional().describe('Tags to apply to all bookmarks'),
        collectionId: z.number().optional().describe('Collection ID to move bookmarks to'),
        important: z.boolean().optional().describe('Mark as important')
      },
      async ({ ids, collectionId, ...updates }) => {
        try {
          const apiUpdates: Record<string, any> = { ...updates };
          
          if (collectionId !== undefined) {
            apiUpdates.collection = collectionId;
          }
          
          await raindropService.batchUpdateBookmarks(ids, apiUpdates);
          return {
            content: [{
              type: "text",
              text: `Successfully updated ${ids.length} bookmarks.`
            }]
          };
        } catch (error) {
          throw new Error(`Failed to batch update bookmarks: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'bulkMoveBookmarks',
      'Move multiple bookmarks to another collection',
      {
        ids: z.array(z.number()).describe('List of bookmark IDs to move'),
        collectionId: z.number().describe('Target collection ID')
      },
      async ({ ids, collectionId }) => {
        try {
          await raindropService.batchUpdateBookmarks(ids, { collection: collectionId });
          return {
            content: [{
              type: "text",
              text: `Successfully moved ${ids.length} bookmarks to collection ${collectionId}.`
            }]
          };
        } catch (error) {
          throw new Error(`Failed to move bookmarks: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'bulkTagBookmarks',
      'Add or remove tags from multiple bookmarks',
      {
        ids: z.array(z.number()).describe('List of bookmark IDs'),
        tags: z.array(z.string()).describe('Tags to apply'),
        operation: z.enum(['add', 'remove']).describe('Whether to add or remove the specified tags')
      },
      async ({ ids, tags, operation }) => {
        try {
          // For adding tags, we need to first get existing tags for each bookmark
          // and then merge them with new tags to prevent overwriting
          if (operation === 'add') {
            // Get all bookmarks first
            const bookmarks = await Promise.all(
              ids.map(id => raindropService.getBookmark(id))
            );
            
            // Update each bookmark with merged tags
            await Promise.all(
              bookmarks.map(bookmark => {
                const existingTags = bookmark.tags || [];
                const mergedTags = [...new Set([...existingTags, ...tags])];
                return raindropService.updateBookmark(bookmark._id, { tags: mergedTags });
              })
            );
          }
          // For removing tags, we need to filter out the specified tags
          else {
            // Get all bookmarks first
            const bookmarks = await Promise.all(
              ids.map(id => raindropService.getBookmark(id))
            );
            
            // Update each bookmark with filtered tags
            await Promise.all(
              bookmarks.map(bookmark => {
                const existingTags = bookmark.tags || [];
                const filteredTags = existingTags.filter(tag => !tags.includes(tag));
                return raindropService.updateBookmark(bookmark._id, { tags: filteredTags });
              })
            );
          }
          
          return {
            content: [{
              type: "text",
              text: `Successfully ${operation === 'add' ? 'added' : 'removed'} tags [${tags.join(', ')}] ${operation === 'add' ? 'to' : 'from'} ${ids.length} bookmarks.`
            }]
          };
        } catch (error) {
          throw new Error(`Failed to ${operation} tags: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'batchDeleteBookmarks',
      'Delete multiple bookmarks at once',
      {
        ids: z.array(z.number()).describe('List of bookmark IDs to delete'),
        permanent: z.boolean().optional().describe('Permanently delete (skip trash)')
      },
      async ({ ids, permanent }) => {
        try {
          await Promise.all(
            ids.map(id => permanent ? 
              raindropService.permanentDeleteBookmark(id) : 
              raindropService.deleteBookmark(id)
            )
          );
          
          return {
            content: [{
              type: "text",
              text: `Successfully ${permanent ? 'permanently ' : ''}deleted ${ids.length} bookmarks.`
            }]
          };
        } catch (error) {
          throw new Error(`Failed to batch delete bookmarks: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'setReminder',
      'Set a reminder for a bookmark',
      {
        raindropId: z.number().describe('Bookmark ID'),
        date: z.string().describe('Reminder date (ISO format)'),
        note: z.string().optional().describe('Reminder note')
      },
      async ({ raindropId, date, note }) => {
        try {
          const bookmark = await raindropService.setReminder(raindropId, { date, note });
          return {
            content: [{
              type: "text",
              text: `Reminder set for "${bookmark.title || 'Untitled'}" on ${date}`,
              metadata: {
                bookmarkId: bookmark._id,
                reminderDate: date,
                reminderNote: note
              }
            }]
          };
        } catch (error) {
          throw new Error(`Failed to set reminder: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'deleteReminder',
      'Delete a reminder from a bookmark',
      {
        raindropId: z.number().describe('Bookmark ID')
      },
      async ({ raindropId }) => {
        try {
          await raindropService.deleteReminder(raindropId);
          return {
            content: [{
              type: "text",
              text: `Reminder successfully removed from bookmark ${raindropId}.`
            }]
          };
        } catch (error) {
          throw new Error(`Failed to delete reminder: ${(error as Error).message}`);
        }
      }
    );

    // Tag operations
    this.server.tool(
      'getTags',
      'Get all tags',
      {
        collectionId: z.number().optional().describe('Filter tags by collection')
      },
      async ({ collectionId }) => {
        try {
          const tags = await raindropService.getTags(collectionId);
          return {
            content: tags.map(tag => ({
              type: "text",
              text: tag._id,
              metadata: {
                count: tag.count
              }
            }))
          };
        } catch (error) {
          throw new Error(`Failed to get tags: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'renameTag',
      'Rename a tag across all bookmarks or in a specific collection',
      {
        oldName: z.string().describe('Current tag name'),
        newName: z.string().describe('New tag name'),
        collectionId: z.number().optional().describe('Collection ID (optional)')
      },
      async ({ oldName, newName, collectionId }) => {
        try {
          const result = await raindropService.renameTag(collectionId, oldName, newName);
          return {
            content: [{
              type: "text",
              text: `Successfully renamed tag "${oldName}" to "${newName}"${collectionId ? ` in collection ${collectionId}` : ''}.`,
              metadata: {
                success: result.result
              }
            }]
          };
        } catch (error) {
          throw new Error(`Failed to rename tag: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'deleteTag',
      'Remove a tag from all bookmarks or in a specific collection',
      {
        tag: z.string().describe('Tag to delete'),
        collectionId: z.number().optional().describe('Collection ID (optional)')
      },
      async ({ tag, collectionId }) => {
        try {
          const result = await raindropService.deleteTags(collectionId, [tag]);
          return {
            content: [{
              type: "text",
              text: `Successfully deleted tag "${tag}"${collectionId ? ` from collection ${collectionId}` : ''}.`,
              metadata: {
                success: result.result
              }
            }]
          };
        } catch (error) {
          throw new Error(`Failed to delete tag: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'mergeTags',
      'Merge multiple tags into one destination tag',
      {
        sourceTags: z.array(z.string()).describe('List of source tags to merge'),
        destinationTag: z.string().describe('Destination tag name'),
        collectionId: z.number().optional().describe('Collection ID (optional)')
      },
      async ({ sourceTags, destinationTag, collectionId }) => {
        try {
          await raindropService.mergeTags(collectionId, sourceTags, destinationTag);
          return {
            content: [{
              type: "text",
              text: `Merged tags [${sourceTags.join(', ')}] into "${destinationTag}".`
            }]
          };
        } catch (error) {
          throw new Error(`Failed to merge tags: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'deleteTags',
      'Delete tags from all bookmarks',
      {
        tags: z.array(z.string()).describe('List of tags to delete'),
        collectionId: z.number().optional().describe('Collection ID (optional)')
      },
      async ({ tags, collectionId }) => {
        try {
          await raindropService.deleteTags(collectionId, tags);
          return {
            content: [{
              type: "text",
              text: `Deleted tags: [${tags.join(', ')}].`
            }]
          };
        } catch (error) {
          throw new Error(`Failed to delete tags: ${(error as Error).message}`);
        }
      }
    );

    // Highlights operations
    this.server.tool(
      'getHighlights',
      'Get highlights for a specific bookmark',
      {
        raindropId: z.number().describe('Bookmark ID')
      },
      async ({ raindropId }) => {
        try {
          const highlights = await raindropService.getHighlights(raindropId);
          return {
            content: highlights.map(highlight => ({
              type: "text",
              text: highlight.text,
              metadata: {
                id: highlight._id,
                raindropId: highlight.raindrop?._id,
                raindropTitle: highlight.raindrop?.title,
                raindropLink: highlight.raindrop?.link,
                note: highlight.note,
                color: highlight.color,
                created: highlight.created,
                lastUpdate: highlight.lastUpdate,
                title: highlight.title,
                tags: highlight.tags,
                link: highlight.link,
                domain: highlight.domain,
                excerpt: highlight.excerpt
              }
            }))
          };
        } catch (error) {
          throw new Error(`Failed to get highlights: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'getAllHighlights',
      'Get all highlights across all bookmarks',
      {
        page: z.number().optional().describe('Page number, starting from 0'),
        perPage: z.number().optional().describe('Number of highlights per page (max 50)')
      },
      async ({ page, perPage }) => {
        try {
          const highlights = await raindropService.getAllHighlightsByPage(page, perPage);
          return {
            content: highlights.map(highlight => ({
              type: "text",
              text: highlight.text,
              metadata: {
                id: highlight._id,
                raindropId: highlight.raindrop?._id,
                raindropTitle: highlight.raindrop?.title,
                raindropLink: highlight.raindrop?.link,
                note: highlight.note,
                color: highlight.color,
                created: highlight.created,
                lastUpdate: highlight.lastUpdate,
                title: highlight.title,
                tags: highlight.tags,
                link: highlight.link,
                domain: highlight.domain,
                excerpt: highlight.excerpt
              }
            })),
            metadata: {
              page: page || 0,
              perPage: perPage || 25
            }
          };
        } catch (error) {
          throw new Error(`Failed to get all highlights: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'getHighlightsByCollection',
      'Get highlights for bookmarks in a specific collection',
      {
        collectionId: z.number().describe('Collection ID')
      },
      async ({ collectionId }) => {
        try {
          const highlights = await raindropService.getHighlightsByCollection(collectionId);
          return {
            content: highlights.map(highlight => ({
              type: "text",
              text: highlight.text,
              metadata: {
                id: highlight._id,
                raindropId: highlight.raindrop?._id,
                raindropTitle: highlight.raindrop?.title,
                raindropLink: highlight.raindrop?.link,
                note: highlight.note,
                color: highlight.color,
                created: highlight.created,
                lastUpdate: highlight.lastUpdate,
                tags: highlight.tags
              }
            })),
            metadata: {
              collectionId
            }
          };
        } catch (error) {
          throw new Error(`Failed to get highlights by collection: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'createHighlight',
      'Create a new highlight for a bookmark',
      {
        raindropId: z.number().describe('Bookmark ID'),
        text: z.string().describe('Highlighted text'),
        note: z.string().optional().describe('Additional note for the highlight'),
        color: z.string().optional().describe('Color for the highlight (e.g., "yellow", "#FFFF00")')
      },
      async ({ raindropId, text, note, color }) => {
        try {
          const highlight = await raindropService.createHighlight(raindropId, { text, note, color });
          return {
            content: [{
              type: "text",
              text: highlight.text,
              metadata: {
                id: highlight._id,
                raindropId: highlight.raindrop?._id,
                raindropTitle: highlight.raindrop?.title,
                raindropLink: highlight.raindrop?.link,
                note: highlight.note,
                color: highlight.color,
                created: highlight.created,
                lastUpdate: highlight.lastUpdate,
                title: highlight.title,
                tags: highlight.tags,
                link: highlight.link,
                domain: highlight.domain,
                excerpt: highlight.excerpt
              }
            }]
          };
        } catch (error) {
          throw new Error(`Failed to create highlight: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'updateHighlight',
      'Update an existing highlight',
      {
        id: z.number().describe('Highlight ID'),
        text: z.string().optional().describe('New highlighted text'),
        note: z.string().optional().describe('New note'),
        color: z.string().optional().describe('New color')
      },
      async ({ id, text, note, color }) => {
        try {
          const highlight = await raindropService.updateHighlight(id, { text, note, color });
          return {
            content: [{
              type: "text",
              text: highlight.text,
              metadata: {
                id: highlight._id,
                raindropId: highlight.raindrop?._id,
                raindropTitle: highlight.raindrop?.title,
                raindropLink: highlight.raindrop?.link,
                note: highlight.note,
                color: highlight.color,
                created: highlight.created,
                lastUpdate: highlight.lastUpdate,
                title: highlight.title,
                tags: highlight.tags,
                link: highlight.link,
                domain: highlight.domain,
                excerpt: highlight.excerpt
              }
            }]
          };
        } catch (error) {
          throw new Error(`Failed to update highlight: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'deleteHighlight',
      'Delete a highlight',
      {
        id: z.number().describe('Highlight ID')
      },
      async ({ id }) => {
        try {
          await raindropService.deleteHighlight(id);
          return {
            content: [{
              type: "text",
              text: `Highlight ${id} successfully deleted.`
            }]
          };
        } catch (error) {
          throw new Error(`Failed to delete highlight: ${(error as Error).message}`);
        }
      }
    );


 

    // User operations
    this.server.tool(
      'getUserInfo',
      'Get user information',
      {},
      async () => {
        try {
          const user = await raindropService.getUserInfo();
          return {
            content: [{
              type: "text",
              text: `User: ${user.fullName || user.email}`,
              metadata: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                pro: user.pro,
                registered: user.registered
              }
            }]
          };
        } catch (error) {
          throw new Error(`Failed to get user info: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'getUserStats',
      'Get user statistics',
      {
        collectionId: z.number().optional().describe('Collection ID for specific collection stats')
      },
      async ({ collectionId }) => {
        try {
          const stats = collectionId 
            ? await raindropService.getCollectionStats(collectionId)
            : await raindropService.getUserStats();
          
          return {
            content: [{
              type: "text",
              text: collectionId 
                ? `Stats for collection ${collectionId}`
                : `User Statistics`,
              metadata: stats
            }]
          };
        } catch (error) {
          throw new Error(`Failed to get stats: ${(error as Error).message}`);
        }
      }
    );

    // Import/Export operations
    this.server.tool(
      'getImportStatus',
      'Check the status of an ongoing import',
      {},
      async () => {
        try {
          const status = await raindropService.getImportStatus();
          return {
            content: [{
              type: "text",
              text: `Import status: ${status.status}`,
              metadata: status
            }]
          };
        } catch (error) {
          throw new Error(`Failed to get import status: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'getExportStatus',
      'Check the status of an ongoing export',
      {},
      async () => {
        try {
          const status = await raindropService.getExportStatus();
          return {
            content: [{
              type: "text",
              text: `Export status: ${status.status}${status.url ? `. Download URL: ${status.url}` : ''}`,
              metadata: status
            }]
          };
        } catch (error) {
          throw new Error(`Failed to get export status: ${(error as Error).message}`);
        }
      }
    );

    this.server.tool(
      'exportBookmarks',
      'Export bookmarks in various formats',
      {
        format: z.enum(['csv', 'html', 'pdf']).describe('Export format'),
        collectionId: z.number().optional().describe('Export specific collection'),
        broken: z.boolean().optional().describe('Include broken links'),
        duplicates: z.boolean().optional().describe('Include duplicates')
      },
      async (options) => {
        try {
          const result = await raindropService.exportBookmarks(options);
          return {
            content: [{
              type: "text",
              text: `Export started successfully. Status URL: ${result.url}`,
              metadata: {
                url: result.url
              }
            }]
          };
        } catch (error) {
          throw new Error(`Failed to start export: ${(error as Error).message}`);
        }
      }
    );
  }

  // Method to simply get the configured server instance
  getServerInstance(): McpServer {
    return this.server;
  }

  // Corrected stop method for cleanup
  async stop() {
    // Perform any necessary cleanup here
    // No assumption of a `close` method on the server
    this.server = null as unknown as McpServer; // Nullify the server reference
  }
}

// Factory function now returns the unconnected server instance
export function createRaindropServer() {
  const service = new RaindropMCPService();
  return { 
    server: service.getServerInstance(), // Return the instance directly
    cleanup: () => service.stop()       // Return the cleanup function
  };
}

export default RaindropMCPService;