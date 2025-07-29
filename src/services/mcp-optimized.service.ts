import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
    type LoggingLevel
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { defaultLogger } from '../utils/log.js';
import raindropService from './raindrop.service.js';

/**
 * Optimized Raindrop.io MCP Service
 * 
 * This service implements an optimized Model Context Protocol (MCP) interface for Raindrop.io
 * with improved tool organization, enhanced descriptions, and AI-friendly parameter documentation.
 * 
 * ## Tool Categories:
 * - **Collections**: Organize and manage bookmark collections (folders)
 * - **Bookmarks**: Create, read, update, delete, and search bookmarks 
 * - **Tags**: Manage bookmark tags and organization
 * - **Highlights**: Extract and manage text highlights from bookmarks
 * - **User**: Access user account information and statistics
 * - **Import/Export**: Data migration and backup operations
 * 
 * ## Resource URI Patterns:
 * - `raindrop://collections/{scope}` - Collection data
 * - `raindrop://bookmarks/{scope}` - Bookmark data  
 * - `raindrop://tags/{scope}` - Tag data
 * - `raindrop://highlights/{scope}` - Highlight data
 * - `raindrop://user/{scope}` - User data
 * 
 * For debugging with MCP Inspector: https://modelcontextprotocol.io/docs/tools/inspector
 */
export class OptimizedRaindropMCPService {
    private server: McpServer;
    private logLevel: LoggingLevel = "debug";
    private logger = defaultLogger;

    // Tool category constants for organization
    private static readonly CATEGORIES = {
        COLLECTIONS: 'Collections',
        BOOKMARKS: 'Bookmarks',
        TAGS: 'Tags',
        HIGHLIGHTS: 'Highlights',
        USER: 'User',
        IMPORT_EXPORT: 'Import/Export'
    } as const;

    constructor() {
        this.server = new McpServer({
            name: 'raindrop-mcp-optimized',
            version: '2.0.0',
            description: 'Optimized MCP Server for Raindrop.io with enhanced AI-friendly tool organization',
            capabilities: {
                logging: false // Keep logging off for STDIO compatibility
            }
        });

        // Logging/diagnostics: All logs go to stderr via logger, never stdout. MCP protocol messages only on stdout.
        // Use system info tool for runtime health/debug info.
        this.setupLogging();
        this.initializeResources();
        this.initializeTools();
    }

    private setupLogging() {
        // All logs routed to stderr using logger utility
        this.logger.info('Logging initialized (stderr only, never stdout)');
    }


    /**
     * Initialize standardized resources with consistent URI patterns
     * All resources follow the pattern: raindrop://{type}/{scope}[/{id}]
     */
    private initializeResources() {
        // Collections Resources
        this.server.resource(
            "collections-all",
            "raindrop://collections/all",
            async (uri) => {
                const collections = await raindropService.getCollections();
                return {
                    contents: collections.map(collection => ({
                        uri: `raindrop://collections/item/${collection._id}`,
                        text: `${collection.title} (${collection.count} items)`,
                        metadata: {
                            id: collection._id,
                            title: collection.title,
                            count: collection.count,
                            public: collection.public,
                            created: collection.created,
                            lastUpdate: collection.lastUpdate,
                            category: 'collection'
                        }
                    }))
                };
            }
        );

        this.server.resource(
            "collection-children",
            new ResourceTemplate("raindrop://collections/children/{parentId}", { list: undefined }),
            async (uri, { parentId }) => {
                const collections = await raindropService.getChildCollections(Number(parentId));
                return {
                    contents: collections.map(collection => ({
                        uri: `raindrop://collections/item/${collection._id}`,
                        text: `${collection.title} (${collection.count} items)`,
                        metadata: {
                            id: collection._id,
                            title: collection.title,
                            count: collection.count,
                            parentId: Number(parentId),
                            category: 'collection'
                        }
                    }))
                };
            }
        );

        // Bookmarks Resources
        this.server.resource(
            "collection-bookmarks",
            new ResourceTemplate("raindrop://bookmarks/collection/{collectionId}", { list: undefined }),
            async (uri, { collectionId }) => {
                const result = await raindropService.getBookmarks({ collection: Number(collectionId) });
                return {
                    contents: result.items.map(bookmark => ({
                        uri: `raindrop://bookmarks/item/${bookmark._id}`,
                        text: `${bookmark.title || 'Untitled'} - ${bookmark.link}`,
                        metadata: {
                            id: bookmark._id,
                            title: bookmark.title,
                            link: bookmark.link,
                            excerpt: bookmark.excerpt,
                            tags: bookmark.tags,
                            collectionId: Number(collectionId),
                            created: bookmark.created,
                            lastUpdate: bookmark.lastUpdate,
                            type: bookmark.type,
                            category: 'bookmark'
                        }
                    })),
                    metadata: {
                        collectionId: Number(collectionId),
                        totalCount: result.count
                    }
                };
            }
        );

        this.server.resource(
            "bookmark-details",
            new ResourceTemplate("raindrop://bookmarks/item/{bookmarkId}", { list: undefined }),
            async (uri, { bookmarkId }) => {
                const bookmark = await raindropService.getBookmark(Number(bookmarkId));
                return {
                    contents: [{
                        uri: bookmark.link,
                        text: `${bookmark.title || 'Untitled Bookmark'}`,
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
                            category: 'bookmark'
                        }
                    }]
                };
            }
        );

        // Tags Resources
        this.server.resource(
            "tags-all",
            "raindrop://tags/all",
            async (uri) => {
                const tags = await raindropService.getTags();
                return {
                    contents: tags.map(tag => ({
                        uri: `raindrop://tags/item/${encodeURIComponent(tag._id)}`,
                        text: `${tag._id} (${tag.count} bookmarks)`,
                        metadata: {
                            name: tag._id,
                            count: tag.count,
                            category: 'tag'
                        }
                    }))
                };
            }
        );

        this.server.resource(
            "collection-tags",
            new ResourceTemplate("raindrop://tags/collection/{collectionId}", { list: undefined }),
            async (uri, { collectionId }) => {
                const tags = await raindropService.getTagsByCollection(Number(collectionId));
                return {
                    contents: tags.map(tag => ({
                        uri: `raindrop://tags/item/${encodeURIComponent(tag._id)}`,
                        text: `${tag._id} (${tag.count} bookmarks)`,
                        metadata: {
                            name: tag._id,
                            count: tag.count,
                            collectionId: Number(collectionId),
                            category: 'tag'
                        }
                    }))
                };
            }
        );

        // Highlights Resources
        this.server.resource(
            "highlights-all",
            "raindrop://highlights/all",
            async (uri) => {
                const highlights = await raindropService.getAllHighlights();
                return {
                    contents: highlights.map(highlight => ({
                        uri: `raindrop://highlights/item/${highlight._id}`,
                        text: highlight.text.substring(0, 100) + (highlight.text.length > 100 ? '...' : ''),
                        metadata: {
                            id: highlight._id,
                            text: highlight.text,
                            raindropId: highlight.raindrop?._id,
                            raindropTitle: highlight.raindrop?.title,
                            raindropLink: highlight.raindrop?.link,
                            note: highlight.note,
                            color: highlight.color,
                            created: highlight.created,
                            lastUpdate: highlight.lastUpdate,
                            tags: highlight.tags,
                            category: 'highlight'
                        }
                    }))
                };
            }
        );

        this.server.resource(
            "bookmark-highlights",
            new ResourceTemplate("raindrop://highlights/bookmark/{bookmarkId}", { list: undefined }),
            async (uri, { bookmarkId }) => {
                const highlights = await raindropService.getHighlights(Number(bookmarkId));
                return {
                    contents: highlights.map(highlight => ({
                        uri: `raindrop://highlights/item/${highlight._id}`,
                        text: highlight.text.substring(0, 100) + (highlight.text.length > 100 ? '...' : ''),
                        metadata: {
                            id: highlight._id,
                            text: highlight.text,
                            bookmarkId: Number(bookmarkId),
                            note: highlight.note,
                            color: highlight.color,
                            created: highlight.created,
                            lastUpdate: highlight.lastUpdate,
                            category: 'highlight'
                        }
                    }))
                };
            }
        );

        // User Resources
        this.server.resource(
            "user-profile",
            "raindrop://user/profile",
            async (uri) => {
                const user = await raindropService.getUserInfo();
                return {
                    contents: [{
                        uri: uri.href,
                        text: `${user.fullName || user.email} - ${user.pro ? 'Pro' : 'Free'} Account`,
                        metadata: {
                            id: user._id,
                            email: user.email,
                            fullName: user.fullName,
                            pro: user.pro,
                            registered: user.registered,
                            category: 'user'
                        }
                    }]
                };
            }
        );

        this.server.resource(
            "user-statistics",
            "raindrop://user/statistics",
            async (uri) => {
                const stats = await raindropService.getUserStats();
                return {
                    contents: [{
                        uri: uri.href,
                        text: `Account Statistics`,
                        metadata: {
                            ...stats,
                            category: 'user-stats'
                        }
                    }]
                };
            }
        );
    }

    /**
     * Initialize optimized tools with enhanced descriptions and AI-friendly organization
     */
    private initializeTools() {
        this.initializeSystemTools();
        this.initializeCollectionTools();
        this.initializeBookmarkTools();
        this.initializeTagTools();
        this.initializeHighlightTools();
        this.initializeUserTools();
        this.initializeImportExportTools();
    }

    /**
     * System Management Tools
     */
    private initializeSystemTools() {
        this.server.tool(
            'system_info',
            'Get system information including server diagnostics, health status, and available prompts. Use this for debugging and support.',
            {
                type: z.enum(['diagnostics', 'prompts']).describe('Type of system information to retrieve')
            },
            async ({ type }) => {
                try {
                    switch (type) {
                        case 'diagnostics': {
                            const memory = process.memoryUsage();
                            const uptime = process.uptime();
                            const env = {
                                NODE_ENV: process.env.NODE_ENV,
                                MCP_SERVER: process.env.MCP_SERVER,
                                PLATFORM: process.platform,
                                ARCH: process.arch
                            };
                            const status = {
                                version: '2.0.0',
                                uptime,
                                memory,
                                env,
                                timestamp: new Date().toISOString()
                            };
                            this.logger.debug('Diagnostics requested', status);
                            return {
                                content: [{
                                    type: 'text',
                                    text: 'MCP server diagnostics and health status',
                                    metadata: status
                                }]
                            };
                        }

                        case 'prompts': {
                            // Implements the MCP prompts/list method for DXT compatibility
                            return {
                                content: [] // No prompts defined yet
                            };
                        }

                        default:
                            throw new Error(`Unknown system info type: ${type}`);
                    }
                } catch (error) {
                    this.logger.error('System info error', error);
                    throw new Error(`Failed to get system info: ${(error as Error).message}`);
                }
            }
        );
    }

    /**
     * Collection Management Tools
     * Use these tools to organize bookmarks into collections (folders)
     */
    private initializeCollectionTools() {
        this.server.tool(
            'collection_manage',
            'Comprehensive collection management tool for all CRUD operations. Use this for listing, getting, creating, updating, and deleting collections.',
            {
                operation: z.enum(['list', 'get', 'create', 'update', 'delete']).describe('Collection operation to perform'),
                
                // List parameters
                parentId: z.number().optional().describe('Parent collection ID to list children (for list operation)'),
                
                // Get/Update/Delete parameters
                id: z.number().optional().describe('Collection ID (required for get, update, delete operations)'),
                
                // Create/Update parameters
                title: z.string().optional().describe('Collection name (required for create, optional for update)'),
                isPublic: z.boolean().optional().describe('Make collection publicly viewable'),
                view: z.enum(['list', 'simple', 'grid', 'masonry']).optional().describe('Collection view type in Raindrop.io interface'),
                sort: z.enum(['title', '-created']).optional().describe('Default sort order (-created = newest first)')
            },
            async ({ operation, parentId, id, title, isPublic, view, sort }) => {
                try {
                    switch (operation) {
                        case 'list': {
                            const collections = parentId
                                ? await raindropService.getChildCollections(parentId)
                                : await raindropService.getCollections();

                            return {
                                content: collections.map(collection => ({
                                    type: "text",
                                    text: `${collection.title} (ID: ${collection._id}, ${collection.count} items)`,
                                    metadata: {
                                        id: collection._id,
                                        title: collection.title,
                                        count: collection.count,
                                        public: collection.public,
                                        created: collection.created,
                                        lastUpdate: collection.lastUpdate,
                                        category: OptimizedRaindropMCPService.CATEGORIES.COLLECTIONS
                                    }
                                }))
                            };
                        }

                        case 'get': {
                            if (!id) throw new Error('Collection ID required for get operation');
                            const collection = await raindropService.getCollection(id);
                            return {
                                content: [{
                                    type: "text",
                                    text: `Collection: ${collection.title}`,
                                    metadata: {
                                        id: collection._id,
                                        title: collection.title,
                                        count: collection.count,
                                        public: collection.public,
                                        created: collection.created,
                                        lastUpdate: collection.lastUpdate,
                                        category: OptimizedRaindropMCPService.CATEGORIES.COLLECTIONS
                                    }
                                }]
                            };
                        }

                        case 'create': {
                            if (!title) throw new Error('Title required for create operation');
                            const collection = await raindropService.createCollection(title, isPublic);
                            return {
                                content: [{
                                    type: "text",
                                    text: `Created collection: ${collection.title}`,
                                    metadata: {
                                        id: collection._id,
                                        title: collection.title,
                                        public: collection.public,
                                        category: OptimizedRaindropMCPService.CATEGORIES.COLLECTIONS
                                    }
                                }]
                            };
                        }

                        case 'update': {
                            if (!id) throw new Error('Collection ID required for update operation');
                            const apiUpdates: Record<string, any> = {};
                            if (title !== undefined) apiUpdates.title = title;
                            if (isPublic !== undefined) apiUpdates.public = isPublic;
                            if (view !== undefined) apiUpdates.view = view;
                            if (sort !== undefined) apiUpdates.sort = sort;

                            const collection = await raindropService.updateCollection(id, apiUpdates);
                            return {
                                content: [{
                                    type: "text",
                                    text: `Updated collection: ${collection.title}`,
                                    metadata: {
                                        id: collection._id,
                                        title: collection.title,
                                        public: collection.public,
                                        category: OptimizedRaindropMCPService.CATEGORIES.COLLECTIONS
                                    }
                                }]
                            };
                        }

                        case 'delete': {
                            if (!id) throw new Error('Collection ID required for delete operation');
                            await raindropService.deleteCollection(id);
                            return {
                                content: [{
                                    type: "text",
                                    text: `Collection ${id} successfully deleted. Bookmarks moved to Unsorted.`,
                                    metadata: {
                                        deletedCollectionId: id,
                                        category: OptimizedRaindropMCPService.CATEGORIES.COLLECTIONS
                                    }
                                }]
                            };
                        }

                        default:
                            throw new Error(`Unknown operation: ${operation}`);
                    }
                } catch (error) {
                    throw new Error(`Failed to ${operation} collection: ${(error as Error).message}`);
                }
            }
        );

        this.server.tool(
            'collection_advanced',
            'Advanced collection operations including sharing and maintenance. Use this for collaboration features and collection cleanup.',
            {
                operation: z.enum(['share', 'merge', 'remove_empty', 'empty_trash']).describe('Advanced operation to perform'),
                
                // Share parameters
                id: z.number().optional().describe('Collection ID (required for share operation)'),
                level: z.enum(['view', 'edit', 'remove']).optional().describe('Access level for sharing: view (read-only), edit (add/modify), remove (full access)'),
                emails: z.array(z.string().email()).optional().describe('Email addresses to share with'),
                
                // Merge parameters
                targetId: z.number().optional().describe('Target collection ID (required for merge operation)'),
                sourceIds: z.array(z.number()).optional().describe('Source collection IDs to merge (required for merge operation)')
            },
            async ({ operation, id, level, emails, targetId, sourceIds }) => {
                try {
                    let result: string;
                    let metadata: Record<string, any> = {
                        operation,
                        category: OptimizedRaindropMCPService.CATEGORIES.COLLECTIONS
                    };

                    switch (operation) {
                        case 'share': {
                            if (!id || !level) throw new Error('Collection ID and access level required for share operation');
                            const shareResult = await raindropService.shareCollection(id, level, emails);
                            result = `Collection shared successfully. Public link: ${shareResult.link}`;
                            metadata = {
                                ...metadata,
                                collectionId: id,
                                shareLink: shareResult.link,
                                accessLevel: level,
                                sharedWith: emails?.length || 0
                            };
                            break;
                        }

                        case 'merge': {
                            if (!targetId || !sourceIds?.length) {
                                throw new Error('Target ID and source IDs required for merge operation');
                            }
                            await raindropService.mergeCollections(targetId, sourceIds);
                            result = `Successfully merged ${sourceIds.length} collections into collection ${targetId}`;
                            metadata = { ...metadata, targetId, sourceIds };
                            break;
                        }

                        case 'remove_empty': {
                            const removeResult = await raindropService.removeEmptyCollections();
                            result = `Removed ${removeResult.count} empty collections`;
                            metadata = { ...metadata, removedCount: removeResult.count };
                            break;
                        }

                        case 'empty_trash': {
                            await raindropService.emptyTrash();
                            result = 'Trash emptied successfully';
                            break;
                        }

                        default:
                            throw new Error(`Unknown operation: ${operation}`);
                    }

                    return {
                        content: [{
                            type: "text",
                            text: result,
                            metadata
                        }]
                    };
                } catch (error) {
                    throw new Error(`Failed to perform ${operation} operation: ${(error as Error).message}`);
                }
            }
        );
    }

    /**
     * Bookmark Management Tools
     * Use these tools to create, search, update, and organize bookmarks
     */
    private initializeBookmarkTools() {
        this.server.tool(
            'bookmark_manage',
            'Comprehensive bookmark management tool for core CRUD operations. Use this for searching, getting, creating, and updating bookmarks.',
            {
                operation: z.enum(['search', 'get', 'create', 'update']).describe('Bookmark operation to perform'),
                
                // Search parameters
                query: z.string().optional().describe('Search query (searches title, description, content, and URL)'),
                collection: z.number().optional().describe('Limit search to specific collection ID'),
                tags: z.array(z.string()).optional().describe('Filter by tags (e.g., ["javascript", "tutorial"])'),
                createdStart: z.string().optional().describe('Created after date (ISO format: YYYY-MM-DD)'),
                createdEnd: z.string().optional().describe('Created before date (ISO format: YYYY-MM-DD)'),
                important: z.boolean().optional().describe('Only show important/starred bookmarks (search) or set importance (create/update)'),
                media: z.enum(['image', 'video', 'document', 'audio']).optional().describe('Filter by media type'),
                page: z.number().optional().default(0).describe('Page number for pagination (starts at 0)'),
                perPage: z.number().min(1).max(50).optional().default(25).describe('Results per page (1-50)'),
                sort: z.enum(['title', '-title', 'domain', '-domain', 'created', '-created', 'lastUpdate', '-lastUpdate']).optional().default('-created').describe('Sort order (prefix with - for descending)'),
                
                // Get/Update parameters
                id: z.number().optional().describe('Bookmark ID (required for get and update operations)'),
                
                // Create parameters
                url: z.string().optional().describe('URL to bookmark (required for create operation)'),
                collectionId: z.number().optional().describe('Collection ID where bookmark will be saved (create) or moved to (update)'),
                
                // Create/Update parameters
                title: z.string().optional().describe('Bookmark title'),
                description: z.string().optional().describe('Description or notes')
            },
            async ({ operation, query, collection, tags, createdStart, createdEnd, important, media, page, perPage, sort, id, url, collectionId, title, description }) => {
                try {
                    switch (operation) {
                        case 'search': {
                            const searchParams = {
                                query, collection, tags, createdStart, createdEnd, important, media, page, perPage, sort
                            };
                            const result = await raindropService.searchRaindrops(searchParams);
                            return {
                                content: result.items.map(bookmark => ({
                                    type: "resource",
                                    resource: {
                                        text: `${bookmark.title || 'Untitled'} - ${bookmark.link}`,
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
                                            category: OptimizedRaindropMCPService.CATEGORIES.BOOKMARKS
                                        }
                                    }
                                })),
                                metadata: {
                                    total: result.count,
                                    page: page || 0,
                                    perPage: perPage || 25,
                                    hasMore: (page || 0) * (perPage || 25) + result.items.length < result.count
                                }
                            };
                        }

                        case 'get': {
                            if (!id) throw new Error('Bookmark ID required for get operation');
                            const bookmark = await raindropService.getBookmark(id);
                            return {
                                content: [{
                                    type: "resource",
                                    resource: {
                                        text: bookmark.title || 'Untitled Bookmark',
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
                                            category: OptimizedRaindropMCPService.CATEGORIES.BOOKMARKS
                                        }
                                    }
                                }]
                            };
                        }

                        case 'create': {
                            if (!url || !collectionId) throw new Error('URL and collection ID required for create operation');
                            const bookmarkData = {
                                link: url,
                                title,
                                excerpt: description,
                                tags,
                                important
                            };

                            const bookmark = await raindropService.createBookmark(collectionId, bookmarkData);
                            return {
                                content: [{
                                    type: "resource",
                                    resource: {
                                        text: bookmark.title || 'Untitled Bookmark',
                                        uri: bookmark.link,
                                        metadata: {
                                            id: bookmark._id,
                                            title: bookmark.title,
                                            link: bookmark.link,
                                            excerpt: bookmark.excerpt,
                                            tags: bookmark.tags,
                                            collectionId: bookmark.collection?.$id,
                                            created: bookmark.created,
                                            category: OptimizedRaindropMCPService.CATEGORIES.BOOKMARKS
                                        }
                                    }
                                }]
                            };
                        }

                        case 'update': {
                            if (!id) throw new Error('Bookmark ID required for update operation');
                            const apiUpdates: Record<string, any> = {};
                            if (title !== undefined) apiUpdates.title = title;
                            if (description !== undefined) apiUpdates.excerpt = description;
                            if (tags !== undefined) apiUpdates.tags = tags;
                            if (important !== undefined) apiUpdates.important = important;
                            if (collectionId !== undefined) apiUpdates.collection = { $id: collectionId };

                            const bookmark = await raindropService.updateBookmark(id, apiUpdates);
                            return {
                                content: [{
                                    type: "resource",
                                    resource: {
                                        text: bookmark.title || 'Untitled Bookmark',
                                        uri: bookmark.link,
                                        metadata: {
                                            id: bookmark._id,
                                            title: bookmark.title,
                                            link: bookmark.link,
                                            excerpt: bookmark.excerpt,
                                            tags: bookmark.tags,
                                            collectionId: bookmark.collection?.$id,
                                            lastUpdate: bookmark.lastUpdate,
                                            category: OptimizedRaindropMCPService.CATEGORIES.BOOKMARKS
                                        }
                                    }
                                }]
                            };
                        }

                        default:
                            throw new Error(`Unknown operation: ${operation}`);
                    }
                } catch (error) {
                    throw new Error(`Failed to ${operation} bookmark: ${(error as Error).message}`);
                }
            }
        );

        this.server.tool(
            'bookmark_batch',
            'Perform operations on multiple bookmarks at once, including batch updates, tagging, deletions, and reminder management. Efficient for bulk operations.',
            {
                operation: z.enum(['update', 'move', 'tag_add', 'tag_remove', 'delete', 'delete_permanent', 'set_reminder', 'remove_reminder']).describe('Batch operation type'),
                bookmarkIds: z.array(z.number()).min(1).describe('List of bookmark IDs to operate on'),

                // Update/move parameters
                collectionId: z.number().optional().describe('Target collection ID (for move/update operations)'),
                important: z.boolean().optional().describe('Set important status (for update operations)'),

                // Tagging parameters
                tags: z.array(z.string()).optional().describe('Tags to add/remove (for tag operations)'),
                
                // Reminder parameters (applies to single bookmark only)
                date: z.string().optional().describe('Reminder date in ISO format (required for set_reminder operation)'),
                note: z.string().optional().describe('Optional reminder note')
            },
            async ({ operation, bookmarkIds, collectionId, important, tags, date, note }) => {
                try {
                    let result: string;
                    let metadata: Record<string, any> = {
                        operation,
                        category: OptimizedRaindropMCPService.CATEGORIES.BOOKMARKS
                    };

                    switch (operation) {
                        case 'update':
                        case 'move': {
                            const updateData: Record<string, any> = {};
                            if (collectionId !== undefined) updateData.collection = collectionId;
                            if (important !== undefined) updateData.important = important;

                            await raindropService.batchUpdateBookmarks(bookmarkIds, updateData);
                            result = `Successfully ${operation === 'move' ? 'moved' : 'updated'} ${bookmarkIds.length} bookmarks`;
                            metadata.affectedBookmarks = bookmarkIds.length;
                            break;
                        }

                        case 'tag_add':
                        case 'tag_remove': {
                            if (!tags?.length) throw new Error('Tags required for tag operations');

                            const bookmarks = await Promise.all(bookmarkIds.map(id => raindropService.getBookmark(id)));
                            await Promise.all(bookmarks.map(bookmark => {
                                const existingTags = bookmark.tags || [];
                                const newTags = operation === 'tag_add'
                                    ? [...new Set([...existingTags, ...tags])]
                                    : existingTags.filter(tag => !tags.includes(tag));
                                return raindropService.updateBookmark(bookmark._id, { tags: newTags });
                            }));

                            result = `Successfully ${operation === 'tag_add' ? 'added' : 'removed'} tags [${tags.join(', ')}] ${operation === 'tag_add' ? 'to' : 'from'} ${bookmarkIds.length} bookmarks`;
                            metadata = { ...metadata, affectedBookmarks: bookmarkIds.length, tags };
                            break;
                        }

                        case 'delete':
                        case 'delete_permanent': {
                            await Promise.all(bookmarkIds.map(id =>
                                operation === 'delete_permanent'
                                    ? raindropService.permanentDeleteBookmark(id)
                                    : raindropService.deleteBookmark(id)
                            ));

                            result = `Successfully ${operation === 'delete_permanent' ? 'permanently ' : ''}deleted ${bookmarkIds.length} bookmarks`;
                            metadata.affectedBookmarks = bookmarkIds.length;
                            break;
                        }

                        case 'set_reminder': {
                            if (bookmarkIds.length > 1) throw new Error('Reminder operations support only single bookmark');
                            if (!date) throw new Error('Date required for setting reminder');

                            const bookmark = await raindropService.setReminder(bookmarkIds[0], { date, note });
                            result = `Reminder set for "${bookmark.title || 'Untitled'}" on ${date}`;
                            metadata = {
                                ...metadata,
                                bookmarkId: bookmark._id,
                                reminderDate: date,
                                reminderNote: note
                            };
                            break;
                        }

                        case 'remove_reminder': {
                            if (bookmarkIds.length > 1) throw new Error('Reminder operations support only single bookmark');
                            
                            await raindropService.deleteReminder(bookmarkIds[0]);
                            result = `Reminder removed from bookmark ${bookmarkIds[0]}`;
                            metadata.bookmarkId = bookmarkIds[0];
                            break;
                        }

                        default:
                            throw new Error(`Unknown operation: ${operation}`);
                    }

                    return {
                        content: [{
                            type: "text",
                            text: result,
                            metadata
                        }]
                    };
                } catch (error) {
                    throw new Error(`Failed to perform batch operation: ${(error as Error).message}`);
                }
            }
        );
    }

    /**
     * Tag Management Tools
     * Use these tools to organize and manage bookmark tags
     */
    private initializeTagTools() {
        this.server.tool(
            'tag_operations',
            'Comprehensive tag management tool for all tag operations including listing, renaming, merging, and deleting tags. Use this to maintain a clean tag structure.',
            {
                operation: z.enum(['list', 'rename', 'merge', 'delete', 'delete_multiple']).describe('Tag operation to perform'),
                collectionId: z.number().optional().describe('Collection ID to scope operation (omit for all collections)'),

                // Rename parameters
                oldName: z.string().optional().describe('Current tag name (required for rename)'),
                newName: z.string().optional().describe('New tag name (required for rename)'),

                // Merge parameters
                sourceTags: z.array(z.string()).optional().describe('Tags to merge from (required for merge)'),
                destinationTag: z.string().optional().describe('Tag to merge into (required for merge)'),

                // Delete parameters
                tagName: z.string().optional().describe('Tag to delete (required for single delete)'),
                tagNames: z.array(z.string()).optional().describe('Tags to delete (required for multiple delete)')
            },
            async ({ operation, collectionId, oldName, newName, sourceTags, destinationTag, tagName, tagNames }) => {
                try {
                    let result: string;
                    let metadata: Record<string, any> = {
                        operation,
                        collectionId,
                        category: OptimizedRaindropMCPService.CATEGORIES.TAGS
                    };

                    switch (operation) {
                        case 'list': {
                            const tags = await raindropService.getTags(collectionId);
                            return {
                                content: tags.map(tag => ({
                                    type: "text",
                                    text: `${tag._id} (${tag.count} bookmarks)`,
                                    metadata: {
                                        name: tag._id,
                                        count: tag.count,
                                        collectionId,
                                        category: OptimizedRaindropMCPService.CATEGORIES.TAGS
                                    }
                                }))
                            };
                        }

                        case 'rename': {
                            if (!oldName || !newName) throw new Error('oldName and newName required for rename operation');

                            await raindropService.renameTag(collectionId, oldName, newName);
                            result = `Successfully renamed tag "${oldName}" to "${newName}"${collectionId ? ` in collection ${collectionId}` : ''}`;
                            metadata = { ...metadata, oldName, newName };
                            break;
                        }

                        case 'merge': {
                            if (!sourceTags?.length || !destinationTag) throw new Error('sourceTags and destinationTag required for merge operation');

                            await raindropService.mergeTags(collectionId, sourceTags, destinationTag);
                            result = `Successfully merged tags [${sourceTags.join(', ')}] into "${destinationTag}"`;
                            metadata = { ...metadata, sourceTags, destinationTag };
                            break;
                        }

                        case 'delete': {
                            if (!tagName) throw new Error('tagName required for delete operation');

                            await raindropService.deleteTags(collectionId, [tagName]);
                            result = `Successfully deleted tag "${tagName}"${collectionId ? ` from collection ${collectionId}` : ''}`;
                            metadata = { ...metadata, deletedTag: tagName };
                            break;
                        }

                        case 'delete_multiple': {
                            if (!tagNames?.length) throw new Error('tagNames required for delete_multiple operation');

                            await raindropService.deleteTags(collectionId, tagNames);
                            result = `Successfully deleted ${tagNames.length} tags: [${tagNames.join(', ')}]`;
                            metadata = { ...metadata, deletedTags: tagNames, deletedCount: tagNames.length };
                            break;
                        }

                        default:
                            throw new Error(`Unknown operation: ${operation}`);
                    }

                    return {
                        content: [{
                            type: "text",
                            text: result,
                            metadata
                        }]
                    };
                } catch (error) {
                    throw new Error(`Failed to ${operation} tags: ${(error as Error).message}`);
                }
            }
        );
    }

    /**
     * Highlight Management Tools
     * Use these tools to manage text highlights from bookmarks
     */
    private initializeHighlightTools() {
        this.server.tool(
            'highlight_manage',
            'Comprehensive highlight management tool for all CRUD operations. Use this for listing, creating, updating, and deleting text highlights from bookmarks.',
            {
                operation: z.enum(['list', 'create', 'update', 'delete']).describe('Highlight operation to perform'),
                
                // List parameters
                scope: z.enum(['all', 'bookmark', 'collection']).optional().describe('Scope of highlights to retrieve (for list operation)'),
                bookmarkId: z.number().optional().describe('Bookmark ID (required for bookmark scope and create operation)'),
                collectionId: z.number().optional().describe('Collection ID (required for collection scope)'),
                page: z.number().optional().default(0).describe('Page number for pagination (starts at 0)'),
                perPage: z.number().min(1).max(50).optional().default(25).describe('Results per page (1-50)'),
                
                // Create/Update parameters
                id: z.number().optional().describe('Highlight ID (required for update and delete operations)'),
                text: z.string().optional().describe('Text to highlight (required for create, optional for update)'),
                note: z.string().optional().describe('Optional note or comment about this highlight'),
                color: z.string().optional().describe('Highlight color (e.g., "yellow", "blue", "#FFFF00")')
            },
            async ({ operation, scope, bookmarkId, collectionId, page, perPage, id, text, note, color }) => {
                try {
                    switch (operation) {
                        case 'list': {
                            if (!scope) scope = 'all'; // Default to 'all' if not specified
                            let highlights;

                            switch (scope) {
                                case 'all':
                                    highlights = await raindropService.getAllHighlightsByPage(page, perPage);
                                    break;
                                case 'bookmark':
                                    if (!bookmarkId) throw new Error('bookmarkId required when scope=bookmark');
                                    highlights = await raindropService.getHighlights(bookmarkId);
                                    break;
                                case 'collection':
                                    if (!collectionId) throw new Error('collectionId required when scope=collection');
                                    highlights = await raindropService.getHighlightsByCollection(collectionId);
                                    break;
                                default:
                                    throw new Error(`Invalid scope: ${scope}`);
                            }

                            return {
                                content: highlights.map(highlight => ({
                                    type: "text",
                                    text: highlight.text.substring(0, 200) + (highlight.text.length > 200 ? '...' : ''),
                                    metadata: {
                                        id: highlight._id,
                                        fullText: highlight.text,
                                        raindropId: highlight.raindrop?._id,
                                        raindropTitle: highlight.raindrop?.title,
                                        raindropLink: highlight.raindrop?.link,
                                        note: highlight.note,
                                        color: highlight.color,
                                        created: highlight.created,
                                        lastUpdate: highlight.lastUpdate,
                                        tags: highlight.tags,
                                        category: OptimizedRaindropMCPService.CATEGORIES.HIGHLIGHTS
                                    }
                                })),
                                metadata: {
                                    scope,
                                    bookmarkId,
                                    collectionId,
                                    page: page || 0,
                                    perPage: perPage || 25,
                                    total: highlights.length
                                }
                            };
                        }

                        case 'create': {
                            if (!bookmarkId || !text) throw new Error('Bookmark ID and text required for create operation');
                            
                            const highlight = await raindropService.createHighlight(bookmarkId, { text, note, color });
                            return {
                                content: [{
                                    type: "text",
                                    text: highlight.text,
                                    metadata: {
                                        id: highlight._id,
                                        bookmarkId: highlight.raindrop?._id,
                                        raindropTitle: highlight.raindrop?.title,
                                        raindropLink: highlight.raindrop?.link,
                                        note: highlight.note,
                                        color: highlight.color,
                                        created: highlight.created,
                                        category: OptimizedRaindropMCPService.CATEGORIES.HIGHLIGHTS
                                    }
                                }]
                            };
                        }

                        case 'update': {
                            if (!id) throw new Error('Highlight ID required for update operation');
                            
                            const updateData: Record<string, any> = {};
                            if (text !== undefined) updateData.text = text;
                            if (note !== undefined) updateData.note = note;
                            if (color !== undefined) updateData.color = color;
                            
                            const highlight = await raindropService.updateHighlight(id, updateData);
                            return {
                                content: [{
                                    type: "text",
                                    text: highlight.text,
                                    metadata: {
                                        id: highlight._id,
                                        bookmarkId: highlight.raindrop?._id,
                                        raindropTitle: highlight.raindrop?.title,
                                        raindropLink: highlight.raindrop?.link,
                                        note: highlight.note,
                                        color: highlight.color,
                                        lastUpdate: highlight.lastUpdate,
                                        category: OptimizedRaindropMCPService.CATEGORIES.HIGHLIGHTS
                                    }
                                }]
                            };
                        }

                        case 'delete': {
                            if (!id) throw new Error('Highlight ID required for delete operation');
                            
                            await raindropService.deleteHighlight(id);
                            return {
                                content: [{
                                    type: "text",
                                    text: `Highlight ${id} successfully deleted`,
                                    metadata: {
                                        deletedHighlightId: id,
                                        category: OptimizedRaindropMCPService.CATEGORIES.HIGHLIGHTS
                                    }
                                }]
                            };
                        }

                        default:
                            throw new Error(`Unknown operation: ${operation}`);
                    }
                } catch (error) {
                    throw new Error(`Failed to ${operation} highlight: ${(error as Error).message}`);
                }
            }
        );
    }

    /**
     * User Account Tools
     * Use these tools to access user information and account statistics
     */
    private initializeUserTools() {
        this.server.tool(
            'user_account',
            'Comprehensive user account management tool for profile information and statistics. Use this to access user data and usage metrics.',
            {
                operation: z.enum(['profile', 'statistics']).describe('User account operation to perform'),
                collectionId: z.number().optional().describe('Collection ID for specific collection statistics (only for statistics operation)')
            },
            async ({ operation, collectionId }) => {
                try {
                    switch (operation) {
                        case 'profile': {
                            const user = await raindropService.getUserInfo();
                            return {
                                content: [{
                                    type: "text",
                                    text: `User: ${user.fullName || user.email} (${user.pro ? 'Pro' : 'Free'} Account)`,
                                    metadata: {
                                        id: user._id,
                                        email: user.email,
                                        fullName: user.fullName,
                                        pro: user.pro,
                                        registered: user.registered,
                                        category: OptimizedRaindropMCPService.CATEGORIES.USER
                                    }
                                }]
                            };
                        }

                        case 'statistics': {
                            const stats = collectionId
                                ? await raindropService.getCollectionStats(collectionId)
                                : await raindropService.getUserStats();

                            const context = collectionId ? `Collection ${collectionId} Statistics` : 'Account Statistics';

                            return {
                                content: [{
                                    type: "text",
                                    text: context,
                                    metadata: {
                                        ...stats,
                                        collectionId,
                                        category: OptimizedRaindropMCPService.CATEGORIES.USER
                                    }
                                }]
                            };
                        }

                        default:
                            throw new Error(`Unknown operation: ${operation}`);
                    }
                } catch (error) {
                    throw new Error(`Failed to get user ${operation}: ${(error as Error).message}`);
                }
            }
        );
    }

    /**
     * Import/Export Tools
     * Use these tools for data migration, backup, and export operations
     */
    private initializeImportExportTools() {
        this.server.tool(
            'data_import',
            'Manage data import operations. Use this to monitor import progress and status.',
            {},
            async () => {
                try {
                    const status = await raindropService.getImportStatus();
                    return {
                        content: [{
                            type: "text",
                            text: `Import Status: ${status.status}`,
                            metadata: {
                                ...status,
                                category: OptimizedRaindropMCPService.CATEGORIES.IMPORT_EXPORT
                            }
                        }]
                    };
                } catch (error) {
                    throw new Error(`Failed to get import status: ${(error as Error).message}`);
                }
            }
        );

        this.server.tool(
            'data_export',
            'Comprehensive data export management tool. Use this to start exports and check their status. Supports CSV, HTML, and PDF formats with filtering options.',
            {
                operation: z.enum(['start', 'status']).describe('Export operation to perform'),
                
                // Start export parameters
                format: z.enum(['csv', 'html', 'pdf']).optional().describe('Export format: csv (spreadsheet), html (browser bookmarks), pdf (document) - required for start operation'),
                collectionId: z.number().optional().describe('Export specific collection only (omit for all bookmarks)'),
                includeBroken: z.boolean().optional().default(false).describe('Include bookmarks with broken/dead links'),
                includeDuplicates: z.boolean().optional().default(false).describe('Include duplicate bookmarks')
            },
            async ({ operation, format, collectionId, includeBroken, includeDuplicates }) => {
                try {
                    switch (operation) {
                        case 'start': {
                            if (!format) throw new Error('Format required for start operation');
                            
                            const options = {
                                format,
                                collectionId,
                                broken: includeBroken,
                                duplicates: includeDuplicates
                            };

                            const result = await raindropService.exportBookmarks(options);
                            return {
                                content: [{
                                    type: "text",
                                    text: `Export started successfully in ${format.toUpperCase()} format. Use 'status' operation to check progress and get download link.`,
                                    metadata: {
                                        operation,
                                        format,
                                        collectionId,
                                        includeBroken,
                                        includeDuplicates,
                                        statusUrl: result.url,
                                        category: OptimizedRaindropMCPService.CATEGORIES.IMPORT_EXPORT
                                    }
                                }]
                            };
                        }

                        case 'status': {
                            const status = await raindropService.getExportStatus();
                            const message = `Export Status: ${status.status}${status.url ? ` - Download: ${status.url}` : ''}`;

                            return {
                                content: [{
                                    type: "text",
                                    text: message,
                                    metadata: {
                                        operation,
                                        ...status,
                                        category: OptimizedRaindropMCPService.CATEGORIES.IMPORT_EXPORT
                                    }
                                }]
                            };
                        }

                        default:
                            throw new Error(`Unknown operation: ${operation}`);
                    }
                } catch (error) {
                    throw new Error(`Failed to ${operation} export: ${(error as Error).message}`);
                }
            }
        );
    }

    /**
     * Get the configured MCP server instance
     */
    getServerInstance(): McpServer {
        return this.server;
    }

    /**
     * Cleanup and stop the service
     */
    async stop() {
        this.server = null as unknown as McpServer;
    }
}

/**
 * Factory function to create optimized Raindrop MCP server
 */
export function createOptimizedRaindropServer() {
    const service = new OptimizedRaindropMCPService();
    return {
        server: service.getServerInstance(),
        cleanup: () => service.stop()
    };
}

export default OptimizedRaindropMCPService;
