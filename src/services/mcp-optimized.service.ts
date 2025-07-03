import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
    type LoggingLevel
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
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

        this.setupLogging();
        this.initializeResources();
        this.initializeTools();
    }

    private setupLogging() {
        // Basic logging setup - same as original but condensed
        // Implementation details unchanged from original
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
        this.initializePromptsTool();
        this.initializeCollectionTools();
        this.initializeBookmarkTools();
        this.initializeTagTools();
        this.initializeHighlightTools();
        this.initializeUserTools();
        this.initializeImportExportTools();
    }

    /**
     * Prompts Management Tool
     * Use this tool to list and manage prompts for the MCP extension
     */
    private initializePromptsTool() {
        // Implements the MCP prompts/list method for DXT compatibility
        this.server.tool(
            'prompts/list',
            'List available prompts for the Raindrop MCP extension. Returns an array of prompt definitions (empty if none are defined).',
            z.object({}),
            async ({}) => {
                try {
                    return {
                        content: [] // No prompts defined yet
                    };
                } catch (error) {
                    throw new Error(`Failed to list prompts: ${(error as Error).message}`);
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
            'collection_list',
            'List all collections or child collections of a parent. Use this to understand the user\'s collection structure before performing other operations.',
            {
                parentId: z.number().optional().describe('Parent collection ID to list children. Omit to list root collections.')
            },
            async ({ parentId }) => {
                try {
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
                } catch (error) {
                    throw new Error(`Failed to list collections: ${(error as Error).message}`);
                }
            }
        );

        this.server.tool(
            'collection_get',
            'Get detailed information about a specific collection by ID. Use this when you need full details about a collection.',
            {
                id: z.number().describe('Collection ID (e.g., 12345)')
            },
            async ({ id }) => {
                try {
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
                } catch (error) {
                    throw new Error(`Failed to get collection: ${(error as Error).message}`);
                }
            }
        );

        this.server.tool(
            'collection_create',
            'Create a new collection (folder) for organizing bookmarks. Collections help organize bookmarks by topic, project, or any categorization system.',
            {
                title: z.string().min(1).describe('Collection name (e.g., "Web Development Resources", "Research Papers")'),
                isPublic: z.boolean().optional().default(false).describe('Make collection publicly viewable (default: false)')
            },
            async ({ title, isPublic }) => {
                try {
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
                } catch (error) {
                    throw new Error(`Failed to create collection: ${(error as Error).message}`);
                }
            }
        );

        this.server.tool(
            'collection_update',
            'Update collection properties like title, visibility, or view settings. Use this to rename collections or change their configuration.',
            {
                id: z.number().describe('Collection ID to update'),
                title: z.string().optional().describe('New collection title'),
                isPublic: z.boolean().optional().describe('Change public visibility'),
                view: z.enum(['list', 'simple', 'grid', 'masonry']).optional().describe('Collection view type in Raindrop.io interface'),
                sort: z.enum(['title', '-created']).optional().describe('Default sort order (-created = newest first)')
            },
            async ({ id, isPublic, ...updates }) => {
                try {
                    const apiUpdates: Record<string, any> = { ...updates };
                    if (isPublic !== undefined) {
                        apiUpdates.public = isPublic;
                    }

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
                } catch (error) {
                    throw new Error(`Failed to update collection: ${(error as Error).message}`);
                }
            }
        );

        this.server.tool(
            'collection_delete',
            'Delete a collection permanently. WARNING: This action cannot be undone. Bookmarks in the collection will be moved to Unsorted.',
            {
                id: z.number().describe('Collection ID to delete')
            },
            async ({ id }) => {
                try {
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
                } catch (error) {
                    throw new Error(`Failed to delete collection: ${(error as Error).message}`);
                }
            }
        );

        this.server.tool(
            'collection_share',
            'Share a collection with specific users or generate a public sharing link. Useful for collaboration or sharing curated bookmark lists.',
            {
                id: z.number().describe('Collection ID to share'),
                level: z.enum(['view', 'edit', 'remove']).describe('Access level: view (read-only), edit (add/modify), remove (full access)'),
                emails: z.array(z.string().email()).optional().describe('Email addresses to share with (for specific user sharing)')
            },
            async ({ id, level, emails }) => {
                try {
                    const result = await raindropService.shareCollection(id, level, emails);
                    return {
                        content: [{
                            type: "text",
                            text: `Collection shared successfully. Public link: ${result.link}`,
                            metadata: {
                                collectionId: id,
                                shareLink: result.link,
                                accessLevel: level,
                                sharedWith: emails?.length || 0,
                                category: OptimizedRaindropMCPService.CATEGORIES.COLLECTIONS
                            }
                        }]
                    };
                } catch (error) {
                    throw new Error(`Failed to share collection: ${(error as Error).message}`);
                }
            }
        );

        this.server.tool(
            'collection_maintenance',
            'Perform maintenance operations on collections. Use this to clean up your collection structure.',
            {
                operation: z.enum(['merge', 'remove_empty', 'empty_trash']).describe('Maintenance operation to perform'),
                targetId: z.number().optional().describe('Target collection ID (required for merge operation)'),
                sourceIds: z.array(z.number()).optional().describe('Source collection IDs to merge (required for merge operation)')
            },
            async ({ operation, targetId, sourceIds }) => {
                try {
                    let result: string;

                    switch (operation) {
                        case 'merge':
                            if (!targetId || !sourceIds?.length) {
                                throw new Error('Merge operation requires targetId and sourceIds');
                            }
                            await raindropService.mergeCollections(targetId, sourceIds);
                            result = `Successfully merged ${sourceIds.length} collections into collection ${targetId}`;
                            break;

                        case 'remove_empty':
                            const removeResult = await raindropService.removeEmptyCollections();
                            result = `Removed ${removeResult.count} empty collections`;
                            break;

                        case 'empty_trash':
                            await raindropService.emptyTrash();
                            result = 'Trash emptied successfully';
                            break;
                    }

                    return {
                        content: [{
                            type: "text",
                            text: result,
                            metadata: {
                                operation,
                                targetId,
                                sourceIds,
                                category: OptimizedRaindropMCPService.CATEGORIES.COLLECTIONS
                            }
                        }]
                    };
                } catch (error) {
                    throw new Error(`Failed to perform maintenance operation: ${(error as Error).message}`);
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
            'bookmark_search',
            'Search bookmarks with advanced filtering. This is the primary tool for finding bookmarks. Supports full-text search, tag filtering, date ranges, and collection scoping.',
            {
                query: z.string().optional().describe('Search query (searches title, description, content, and URL)'),
                collection: z.number().optional().describe('Limit search to specific collection ID'),
                tags: z.array(z.string()).optional().describe('Filter by tags (e.g., ["javascript", "tutorial"])'),
                createdStart: z.string().optional().describe('Created after date (ISO format: YYYY-MM-DD)'),
                createdEnd: z.string().optional().describe('Created before date (ISO format: YYYY-MM-DD)'),
                important: z.boolean().optional().describe('Only show important/starred bookmarks'),
                media: z.enum(['image', 'video', 'document', 'audio']).optional().describe('Filter by media type'),
                page: z.number().optional().default(0).describe('Page number for pagination (starts at 0)'),
                perPage: z.number().min(1).max(50).optional().default(25).describe('Results per page (1-50)'),
                sort: z.enum(['title', '-title', 'domain', '-domain', 'created', '-created', 'lastUpdate', '-lastUpdate']).optional().default('-created').describe('Sort order (prefix with - for descending)')
            },
            async (params) => {
                try {
                    const result = await raindropService.searchRaindrops(params);
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
                            page: params.page || 0,
                            perPage: params.perPage || 25,
                            hasMore: (params.page || 0) * (params.perPage || 25) + result.items.length < result.count
                        }
                    };
                } catch (error) {
                    throw new Error(`Failed to search bookmarks: ${(error as Error).message}`);
                }
            }
        );

        this.server.tool(
            'bookmark_get',
            'Get detailed information about a specific bookmark by ID. Use this when you need full bookmark details.',
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
                } catch (error) {
                    throw new Error(`Failed to get bookmark: ${(error as Error).message}`);
                }
            }
        );

        this.server.tool(
            'bookmark_create',
            'Add a new bookmark to a collection. The system will automatically extract title, description, and other metadata from the URL.',
            {
                url: z.string().url().describe('URL to bookmark (e.g., "https://example.com/article")'),
                collectionId: z.number().describe('Collection ID where bookmark will be saved'),
                title: z.string().optional().describe('Custom title (if not provided, will be extracted from URL)'),
                description: z.string().optional().describe('Custom description or notes'),
                tags: z.array(z.string()).optional().describe('Tags for organization (e.g., ["javascript", "tutorial"])'),
                important: z.boolean().optional().default(false).describe('Mark as important/starred')
            },
            async ({ url, collectionId, description, ...data }) => {
                try {
                    const bookmarkData = {
                        link: url,
                        excerpt: description,
                        ...data
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
                } catch (error) {
                    throw new Error(`Failed to create bookmark: ${(error as Error).message}`);
                }
            }
        );

        this.server.tool(
            'bookmark_update',
            'Update bookmark properties like title, description, tags, or move to different collection. Use this to modify existing bookmarks.',
            {
                id: z.number().describe('Bookmark ID to update'),
                title: z.string().optional().describe('New title'),
                description: z.string().optional().describe('New description or notes'),
                tags: z.array(z.string()).optional().describe('New tags (replaces existing tags)'),
                collectionId: z.number().optional().describe('Move to different collection'),
                important: z.boolean().optional().describe('Change important/starred status')
            },
            async ({ id, collectionId, description, ...updates }) => {
                try {
                    const apiUpdates: Record<string, any> = {
                        excerpt: description,
                        ...updates
                    };

                    if (collectionId !== undefined) {
                        apiUpdates.collection = { $id: collectionId };
                    }

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
                } catch (error) {
                    throw new Error(`Failed to update bookmark: ${(error as Error).message}`);
                }
            }
        );

        this.server.tool(
            'bookmark_batch_operations',
            'Perform operations on multiple bookmarks at once. Efficient for bulk updates, moves, tagging, or deletions.',
            {
                operation: z.enum(['update', 'move', 'tag_add', 'tag_remove', 'delete', 'delete_permanent']).describe('Batch operation type'),
                bookmarkIds: z.array(z.number()).min(1).describe('List of bookmark IDs to operate on'),

                // Update/move parameters
                collectionId: z.number().optional().describe('Target collection ID (for move/update operations)'),
                important: z.boolean().optional().describe('Set important status (for update operations)'),

                // Tagging parameters
                tags: z.array(z.string()).optional().describe('Tags to add/remove (for tag operations)')
            },
            async ({ operation, bookmarkIds, collectionId, important, tags }) => {
                try {
                    let result: string;

                    switch (operation) {
                        case 'update':
                        case 'move':
                            const updateData: Record<string, any> = {};
                            if (collectionId !== undefined) updateData.collection = collectionId;
                            if (important !== undefined) updateData.important = important;

                            await raindropService.batchUpdateBookmarks(bookmarkIds, updateData);
                            result = `Successfully ${operation === 'move' ? 'moved' : 'updated'} ${bookmarkIds.length} bookmarks`;
                            break;

                        case 'tag_add':
                        case 'tag_remove':
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
                            break;

                        case 'delete':
                        case 'delete_permanent':
                            await Promise.all(bookmarkIds.map(id =>
                                operation === 'delete_permanent'
                                    ? raindropService.permanentDeleteBookmark(id)
                                    : raindropService.deleteBookmark(id)
                            ));

                            result = `Successfully ${operation === 'delete_permanent' ? 'permanently ' : ''}deleted ${bookmarkIds.length} bookmarks`;
                            break;

                        default:
                            throw new Error(`Unknown operation: ${operation}`);
                    }

                    return {
                        content: [{
                            type: "text",
                            text: result,
                            metadata: {
                                operation,
                                affectedBookmarks: bookmarkIds.length,
                                category: OptimizedRaindropMCPService.CATEGORIES.BOOKMARKS
                            }
                        }]
                    };
                } catch (error) {
                    throw new Error(`Failed to perform batch operation: ${(error as Error).message}`);
                }
            }
        );

        this.server.tool(
            'bookmark_reminders',
            'Manage reminders for bookmarks. Set or remove reminder notifications for important bookmarks you want to revisit.',
            {
                operation: z.enum(['set', 'remove']).describe('Reminder operation'),
                bookmarkId: z.number().describe('Bookmark ID'),
                date: z.string().optional().describe('Reminder date in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ) - required for set operation'),
                note: z.string().optional().describe('Optional reminder note')
            },
            async ({ operation, bookmarkId, date, note }) => {
                try {
                    if (operation === 'set') {
                        if (!date) throw new Error('Date required for setting reminder');

                        const bookmark = await raindropService.setReminder(bookmarkId, { date, note });
                        return {
                            content: [{
                                type: "text",
                                text: `Reminder set for "${bookmark.title || 'Untitled'}" on ${date}`,
                                metadata: {
                                    bookmarkId: bookmark._id,
                                    reminderDate: date,
                                    reminderNote: note,
                                    category: OptimizedRaindropMCPService.CATEGORIES.BOOKMARKS
                                }
                            }]
                        };
                    } else {
                        await raindropService.deleteReminder(bookmarkId);
                        return {
                            content: [{
                                type: "text",
                                text: `Reminder removed from bookmark ${bookmarkId}`,
                                metadata: {
                                    bookmarkId,
                                    category: OptimizedRaindropMCPService.CATEGORIES.BOOKMARKS
                                }
                            }]
                        };
                    }
                } catch (error) {
                    throw new Error(`Failed to manage reminder: ${(error as Error).message}`);
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
            'tag_list',
            'List all tags or tags from a specific collection. Use this to understand the current tag structure before performing tag operations.',
            {
                collectionId: z.number().optional().describe('Collection ID to filter tags (omit for all tags)')
            },
            async ({ collectionId }) => {
                try {
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
                } catch (error) {
                    throw new Error(`Failed to list tags: ${(error as Error).message}`);
                }
            }
        );

        this.server.tool(
            'tag_manage',
            'Perform tag management operations like renaming, merging, or deleting tags. Use this to maintain a clean tag structure.',
            {
                operation: z.enum(['rename', 'merge', 'delete', 'delete_multiple']).describe('Tag management operation'),
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

                    switch (operation) {
                        case 'rename':
                            if (!oldName || !newName) throw new Error('oldName and newName required for rename operation');

                            const renameResult = await raindropService.renameTag(collectionId, oldName, newName);
                            result = `Successfully renamed tag "${oldName}" to "${newName}"${collectionId ? ` in collection ${collectionId}` : ''}`;
                            break;

                        case 'merge':
                            if (!sourceTags?.length || !destinationTag) throw new Error('sourceTags and destinationTag required for merge operation');

                            await raindropService.mergeTags(collectionId, sourceTags, destinationTag);
                            result = `Successfully merged tags [${sourceTags.join(', ')}] into "${destinationTag}"`;
                            break;

                        case 'delete':
                            if (!tagName) throw new Error('tagName required for delete operation');

                            await raindropService.deleteTags(collectionId, [tagName]);
                            result = `Successfully deleted tag "${tagName}"${collectionId ? ` from collection ${collectionId}` : ''}`;
                            break;

                        case 'delete_multiple':
                            if (!tagNames?.length) throw new Error('tagNames required for delete_multiple operation');

                            await raindropService.deleteTags(collectionId, tagNames);
                            result = `Successfully deleted ${tagNames.length} tags: [${tagNames.join(', ')}]`;
                            break;

                        default:
                            throw new Error(`Unknown operation: ${operation}`);
                    }

                    return {
                        content: [{
                            type: "text",
                            text: result,
                            metadata: {
                                operation,
                                collectionId,
                                category: OptimizedRaindropMCPService.CATEGORIES.TAGS
                            }
                        }]
                    };
                } catch (error) {
                    throw new Error(`Failed to manage tags: ${(error as Error).message}`);
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
            'highlight_list',
            'List highlights from all bookmarks, a specific bookmark, or a collection. Use this to find and review saved text highlights.',
            {
                scope: z.enum(['all', 'bookmark', 'collection']).describe('Scope of highlights to retrieve'),
                bookmarkId: z.number().optional().describe('Bookmark ID (required when scope=bookmark)'),
                collectionId: z.number().optional().describe('Collection ID (required when scope=collection)'),
                page: z.number().optional().default(0).describe('Page number for pagination (starts at 0)'),
                perPage: z.number().min(1).max(50).optional().default(25).describe('Results per page (1-50)')
            },
            async ({ scope, bookmarkId, collectionId, page, perPage }) => {
                try {
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
                } catch (error) {
                    throw new Error(`Failed to list highlights: ${(error as Error).message}`);
                }
            }
        );

        this.server.tool(
            'highlight_create',
            'Create a new text highlight for a bookmark. Use this to save important text passages from articles or documents.',
            {
                bookmarkId: z.number().describe('Bookmark ID to add highlight to'),
                text: z.string().min(1).describe('Text to highlight (the actual content to be highlighted)'),
                note: z.string().optional().describe('Optional note or comment about this highlight'),
                color: z.string().optional().describe('Highlight color (e.g., "yellow", "blue", "#FFFF00")')
            },
            async ({ bookmarkId, text, note, color }) => {
                try {
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
                } catch (error) {
                    throw new Error(`Failed to create highlight: ${(error as Error).message}`);
                }
            }
        );

        this.server.tool(
            'highlight_update',
            'Update an existing highlight\'s text, note, or color. Use this to modify saved highlights.',
            {
                id: z.number().describe('Highlight ID to update'),
                text: z.string().optional().describe('New highlighted text'),
                note: z.string().optional().describe('New note or comment'),
                color: z.string().optional().describe('New highlight color')
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
                } catch (error) {
                    throw new Error(`Failed to update highlight: ${(error as Error).message}`);
                }
            }
        );

        this.server.tool(
            'highlight_delete',
            'Delete a highlight permanently. This action cannot be undone.',
            {
                id: z.number().describe('Highlight ID to delete')
            },
            async ({ id }) => {
                try {
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
                } catch (error) {
                    throw new Error(`Failed to delete highlight: ${(error as Error).message}`);
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
            'user_profile',
            'Get user account information including name, email, subscription status, and registration date.',
            {},
            async () => {
                try {
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
                } catch (error) {
                    throw new Error(`Failed to get user profile: ${(error as Error).message}`);
                }
            }
        );

        this.server.tool(
            'user_statistics',
            'Get user account statistics or statistics for a specific collection. Includes bookmark counts, collection counts, and other usage metrics.',
            {
                collectionId: z.number().optional().describe('Collection ID for specific collection statistics (omit for account-wide stats)')
            },
            async ({ collectionId }) => {
                try {
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
                } catch (error) {
                    throw new Error(`Failed to get statistics: ${(error as Error).message}`);
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
            'import_status',
            'Check the status of an ongoing import operation. Use this to monitor import progress.',
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
            'export_bookmarks',
            'Export bookmarks in various formats for backup or migration. Supports CSV, HTML, and PDF formats with filtering options.',
            {
                format: z.enum(['csv', 'html', 'pdf']).describe('Export format: csv (spreadsheet), html (browser bookmarks), pdf (document)'),
                collectionId: z.number().optional().describe('Export specific collection only (omit for all bookmarks)'),
                includeBroken: z.boolean().optional().default(false).describe('Include bookmarks with broken/dead links'),
                includeDuplicates: z.boolean().optional().default(false).describe('Include duplicate bookmarks')
            },
            async ({ format, collectionId, includeBroken, includeDuplicates }) => {
                try {
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
                            text: `Export started successfully in ${format.toUpperCase()} format. Check export status for download link.`,
                            metadata: {
                                format,
                                collectionId,
                                includeBroken,
                                includeDuplicates,
                                statusUrl: result.url,
                                category: OptimizedRaindropMCPService.CATEGORIES.IMPORT_EXPORT
                            }
                        }]
                    };
                } catch (error) {
                    throw new Error(`Failed to start export: ${(error as Error).message}`);
                }
            }
        );

        this.server.tool(
            'export_status',
            'Check the status of an ongoing export operation and get download link when ready.',
            {},
            async () => {
                try {
                    const status = await raindropService.getExportStatus();
                    const message = `Export Status: ${status.status}${status.url ? ` - Download: ${status.url}` : ''}`;

                    return {
                        content: [{
                            type: "text",
                            text: message,
                            metadata: {
                                ...status,
                                category: OptimizedRaindropMCPService.CATEGORIES.IMPORT_EXPORT
                            }
                        }]
                    };
                } catch (error) {
                    throw new Error(`Failed to get export status: ${(error as Error).message}`);
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
