import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type LoggingLevel } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import RaindropService from './raindrop.service.js';


// Main optimized MCP service for Raindrop.io
export class RaindropMCPService {
    private server: McpServer;
    private raindropService: RaindropService;
    private logLevel: LoggingLevel = "debug";

    constructor() {
        this.raindropService = new RaindropService();
        this.server = new McpServer({
            name: 'raindrop-mcp-server',
            version: '2.0.0',
            description: 'MCP Server for Raindrop.io with advanced interactive capabilities',
            capabilities: {
                logging: false,
                discovery: true,
                errorStandardization: true,
                sessionInfo: true,
                toolChaining: true,
                schemaExport: true,
                promptManagement: true,
                sampling: {},
                elicitation: {}
            }
        });
        this.initializeTools();
    }

    // Expose the server instance
    public getServer() {
        return this.server;
    }

    // Defensive async handler for tool methods
    private asyncHandler<T extends object = any>(fn: (params: T) => Promise<any>) {
        return async (params: T) => {
            try {
                return await fn(params);
            } catch (error) {
                return { error: (error as Error).message };
            }
        };
    }
    private logger = {
        info: (msg: string) => process.stderr.write(`[INFO] ${msg}\n`),
        warn: (msg: string) => process.stderr.write(`[WARN] ${msg}\n`),
        error: (msg: string) => process.stderr.write(`[ERROR] ${msg}\n`),
        debug: (msg: string) => process.stderr.write(`[DEBUG] ${msg}\n`)
    };
    public static readonly CATEGORIES = {
        COLLECTIONS: 'Collections',
        BOOKMARKS: 'Bookmarks',
        TAGS: 'Tags',
        HIGHLIGHTS: 'Highlights',
        USER: 'User',
        IMPORT_EXPORT: 'Import/Export'
    } as const;

    // ...rest of the class implementation...


    // All resource and tool initializers, and logic, must be inside the class body above. Move all code currently outside the class into the class, and remove any duplicate or misplaced code. The only code outside the class should be the export for the factory function below (if present).

    /**
     * Initialize optimized tools with enhanced descriptions and AI-friendly organization
     */
    private initializeTools() {
        this.initializePromptsTool();
        this.initializeDiagnosticsTool();
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
            {},
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
     * Diagnostics Tool
     * Use this tool to get diagnostic information about the MCP server and connection
     */
    private initializeDiagnosticsTool() {
        this.server.tool(
            'diagnostics',
            'Get diagnostic information about the MCP server, including version, capabilities, logging status, and environment information. Helpful for debugging and support.',
            {
                includeEnvironment: z.boolean().optional().default(false).describe('Include environment variables (sensitive info masked)')
            },
            async ({ includeEnvironment }) => {
                try {
                    const diagnostics = {
                        server: {
                            name: 'raindrop-mcp-optimized',
                            version: '2.0.0',
                            description: 'Optimized MCP Server for Raindrop.io',
                            uptime: process.uptime(),
                            pid: process.pid,
                            nodeVersion: process.version,
                            platform: process.platform,
                            arch: process.arch
                        },
                        capabilities: {
                            logging: false, // MCP logging disabled for STDIO compatibility
                            resources: true,
                            tools: true,
                            prompts: true
                        },
                        logging: {
                            level: this.logLevel,
                            stdioSafe: true, // Uses stderr for logs, safe for STDIO transport
                            description: 'All logs use stderr to avoid polluting STDIO MCP protocol'
                        },
                        tools: {
                            categories: Object.values(RaindropMCPService.CATEGORIES),
                            description: 'Available tool categories for bookmark management'
                        },
                        memory: {
                            rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
                            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
                        },
                        transport: {
                            type: 'STDIO or HTTP',
                            description: 'Server supports both STDIO (CLI) and HTTP transports'
                        }
                    };

                    let finalDiagnostics: any = diagnostics;
                    if (includeEnvironment) {
                        finalDiagnostics = {
                            ...diagnostics,
                            environment: {
                                hasRaindropToken: !!process.env.RAINDROP_ACCESS_TOKEN,
                                logLevel: process.env.LOG_LEVEL || 'info (default)',
                                nodeEnv: process.env.NODE_ENV || 'not set'
                            }
                        };
                    }

                    return {
                        content: [{
                            type: "text",
                            text: "MCP Server Diagnostics",
                            metadata: {
                                ...finalDiagnostics,
                                timestamp: new Date().toISOString(),
                                category: 'Diagnostics'
                            }
                        }]
                    };
                } catch (error) {
                    throw new Error(`Failed to get diagnostics: ${(error as Error).message}`);
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
            this.asyncHandler(async ({ parentId }) => {
                const collections = parentId
                    ? await this.raindropService.getChildCollections(parentId)
                    : await this.raindropService.getCollections();
                return { content: this.mapCollections(collections) };
            })
        );
        this.server.tool(
            'collection_get',
            'Get detailed information about a specific collection by ID. Use this when you need full details about a collection.',
            {
                id: z.number().describe('Collection ID (e.g., 12345)')
            },
            this.asyncHandler(async ({ id }) => {
                const collection = await this.raindropService.getCollection(id);
                return { content: this.mapCollections([collection]) };
            })
        );

        this.server.tool(
            'collection_create',
            'Create a new collection (folder) for organizing bookmarks. Collections help organize bookmarks by topic, project, or any categorization system.',
            {
                title: z.string().min(1).describe('Collection name (e.g., "Web Development Resources", "Research Papers")'),
                isPublic: z.boolean().optional().default(false).describe('Make collection publicly viewable (default: false)')
            },
            this.asyncHandler(async ({ title, isPublic }) => {
                const collection = await this.raindropService.createCollection(title, isPublic);
                return {
                    content: [{
                        type: "text",
                        text: `Created collection: ${collection.title}`,
                        metadata: {
                            id: collection._id,
                            title: collection.title,
                            public: collection.public,
                            category: RaindropMCPService.CATEGORIES.COLLECTIONS
                        }
                    }]
                };
            })
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
            this.asyncHandler(async ({ id, isPublic, ...updates }) => {
                const apiUpdates: Record<string, any> = { ...updates };
                if (isPublic !== undefined) {
                    apiUpdates.public = isPublic;
                }

                const collection = await this.raindropService.updateCollection(id, apiUpdates);
                return {
                    content: [{
                        type: "text",
                        text: `Updated collection: ${collection.title}`,
                        metadata: {
                            id: collection._id,
                            title: collection.title,
                            public: collection.public,
                            category: RaindropMCPService.CATEGORIES.COLLECTIONS
                        }
                    }]
                };
            })
        );

        this.server.tool(
            'collection_delete',
            'Delete a collection permanently. WARNING: This action cannot be undone. Bookmarks in the collection will be moved to Unsorted.',
            {
                id: z.number().describe('Collection ID to delete')
            },
            this.asyncHandler(async ({ id }) => {
                // Get collection details for confirmation
                const collection = await this.raindropService.getCollection(id);
                
                // Request user confirmation with details
                const confirmed = await this.requestConfirmation(
                    `You are about to permanently delete the collection "${collection.title}" which contains ${collection.count} bookmarks. This action cannot be undone. The bookmarks will be moved to "Unsorted".`,
                    {
                        itemCount: collection.count,
                        itemType: 'bookmarks',
                        additionalInfo: `Collection: ${collection.title}`
                    }
                );

                if (!confirmed) {
                    return {
                        content: [{
                            type: "text",
                            text: `Collection deletion cancelled by user. Collection "${collection.title}" was not deleted.`,
                            metadata: {
                                cancelled: true,
                                collectionId: id,
                                category: RaindropMCPService.CATEGORIES.COLLECTIONS
                            }
                        }]
                    };
                }

                await this.raindropService.deleteCollection(id);
                return {
                    content: [{
                        type: "text",
                        text: `Collection "${collection.title}" successfully deleted. ${collection.count} bookmarks moved to Unsorted.`,
                        metadata: {
                            deletedCollectionId: id,
                            deletedCollectionTitle: collection.title,
                            bookmarksMoved: collection.count,
                            category: RaindropMCPService.CATEGORIES.COLLECTIONS
                        }
                    }]
                };
            })
        );

        this.server.tool(
            'collection_share',
            'Share a collection with specific users or generate a public sharing link. Useful for collaboration or sharing curated bookmark lists.',
            {
                id: z.number().describe('Collection ID to share'),
                level: z.enum(['view', 'edit', 'remove']).describe('Access level: view (read-only), edit (add/modify), remove (full access)'),
                emails: z.array(z.string().email()).optional().describe('Email addresses to share with (for specific user sharing)')
            },
            this.asyncHandler(async ({ id, level, emails }) => {
                const result = await this.raindropService.shareCollection(id, level, emails);
                return {
                    content: [{
                        type: "text",
                        text: `Collection shared successfully. Public link: ${result.link}`,
                        metadata: {
                            collectionId: id,
                            shareLink: result.link,
                            accessLevel: level,
                            sharedWith: emails?.length || 0,
                            category: RaindropMCPService.CATEGORIES.COLLECTIONS
                        }
                    }]
                };
            })
        );

        this.server.tool(
            'collection_maintenance',
            'Perform maintenance operations on collections. Use this to clean up your collection structure.',
            {
                operation: z.enum(['merge', 'remove_empty', 'empty_trash']).describe('Maintenance operation to perform'),
                targetId: z.number().optional().describe('Target collection ID (required for merge operation)'),
                sourceIds: z.array(z.number()).optional().describe('Source collection IDs to merge (required for merge operation)')
            },
            this.asyncHandler(async ({ operation, targetId, sourceIds }) => {
                let result: string;
                let confirmed = true; // Default to true for non-destructive operations

                switch (operation) {
                    case 'merge':
                        if (!targetId || !sourceIds?.length) {
                            throw new Error('Merge operation requires targetId and sourceIds');
                        }

                        // Get collection details for confirmation
                        const targetCollection = await this.raindropService.getCollection(targetId);
                        const sourceCollections = await Promise.all(
                            sourceIds.map(id => this.raindropService.getCollection(id))
                        );
                        const totalBookmarks = sourceCollections.reduce((sum, col) => sum + col.count, 0);

                        confirmed = await this.requestConfirmation(
                            `You are about to merge ${sourceIds.length} collections (${sourceCollections.map(c => c.title).join(', ')}) into "${targetCollection.title}". This will move ${totalBookmarks} bookmarks and delete the source collections. This action cannot be undone.`,
                            {
                                itemCount: totalBookmarks,
                                itemType: 'bookmarks from merged collections',
                                additionalInfo: `Target: ${targetCollection.title}`
                            }
                        );

                        if (!confirmed) {
                            return {
                                content: [{
                                    type: "text",
                                    text: `Collection merge cancelled by user. No collections were merged.`,
                                    metadata: {
                                        cancelled: true,
                                        operation: 'merge',
                                        category: RaindropMCPService.CATEGORIES.COLLECTIONS
                                    }
                                }]
                            };
                        }

                        await this.raindropService.mergeCollections(targetId, sourceIds);
                        result = `Successfully merged ${sourceIds.length} collections (${sourceCollections.map(c => c.title).join(', ')}) into "${targetCollection.title}"`;
                        break;

                    case 'remove_empty':
                        // First check how many empty collections exist
                        const collections = await this.raindropService.getCollections();
                        const emptyCollections = collections.filter(c => c.count === 0);
                        
                        if (emptyCollections.length === 0) {
                            return {
                                content: [{
                                    type: "text",
                                    text: `No empty collections found. Nothing to remove.`,
                                    metadata: {
                                        operation: 'remove_empty',
                                        emptyCollectionsFound: 0,
                                        category: RaindropMCPService.CATEGORIES.COLLECTIONS
                                    }
                                }]
                            };
                        }

                        confirmed = await this.requestConfirmation(
                            `You are about to remove ${emptyCollections.length} empty collections: ${emptyCollections.map(c => c.title).join(', ')}. This action cannot be undone.`,
                            {
                                itemCount: emptyCollections.length,
                                itemType: 'empty collections'
                            }
                        );

                        if (!confirmed) {
                            return {
                                content: [{
                                    type: "text",
                                    text: `Remove empty collections cancelled by user. No collections were removed.`,
                                    metadata: {
                                        cancelled: true,
                                        operation: 'remove_empty',
                                        category: RaindropMCPService.CATEGORIES.COLLECTIONS
                                    }
                                }]
                            };
                        }

                        const removeResult = await this.raindropService.removeEmptyCollections();
                        result = `Removed ${removeResult.count} empty collections: ${emptyCollections.map(c => c.title).join(', ')}`;
                        break;

                    case 'empty_trash':
                        confirmed = await this.requestConfirmation(
                            `You are about to permanently delete all items in the trash. This action cannot be undone and will free up storage space.`,
                            {
                                itemType: 'all trash items'
                            }
                        );

                        if (!confirmed) {
                            return {
                                content: [{
                                    type: "text",
                                    text: `Empty trash cancelled by user. Trash was not emptied.`,
                                    metadata: {
                                        cancelled: true,
                                        operation: 'empty_trash',
                                        category: RaindropMCPService.CATEGORIES.COLLECTIONS
                                    }
                                }]
                            };
                        }

                        await this.raindropService.emptyTrash();
                        result = 'Trash emptied successfully. All deleted items have been permanently removed.';
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
                            category: RaindropMCPService.CATEGORIES.COLLECTIONS
                        }
                    }]
                };
            })
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
            this.asyncHandler(async (params) => {
                const result = await this.raindropService.searchRaindrops(params);
                return {
                    content: this.mapBookmarks(result.items),
                    metadata: {
                        total: result.count,
                        page: params.page || 0,
                        perPage: params.perPage || 25,
                        hasMore: (params.page || 0) * (params.perPage || 25) + result.items.length < result.count
                    }
                };
            })
        );
        this.server.tool(
            'bookmark_get',
            'Get detailed information about a specific bookmark by ID. Use this when you need full bookmark details.',
            {
                id: z.number().describe('Bookmark ID')
            },
            this.asyncHandler(async ({ id }) => {
                const bookmark = await this.raindropService.getBookmark(id);
                return { content: this.mapBookmarks([bookmark]) };
            })
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
            this.asyncHandler(async ({ url, collectionId, description, ...data }) => {
                const bookmarkData = {
                    link: url,
                    excerpt: description,
                    ...data
                };

                const bookmark = await this.raindropService.createBookmark(collectionId, bookmarkData);
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
                                category: RaindropMCPService.CATEGORIES.BOOKMARKS
                            }
                        }
                    }]
                };
            })
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
            this.asyncHandler(async ({ id, collectionId, description, ...updates }) => {
                const apiUpdates: Record<string, any> = {
                    excerpt: description,
                    ...updates
                };

                if (collectionId !== undefined) {
                    apiUpdates.collection = { $id: collectionId };
                }

                const bookmark = await this.raindropService.updateBookmark(id, apiUpdates);
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
                                category: RaindropMCPService.CATEGORIES.BOOKMARKS
                            }
                        }
                    }]
                };
            })
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
            this.asyncHandler(async ({ operation, bookmarkIds, collectionId, important, tags }) => {
                let result: string;

                switch (operation) {
                    case 'update':
                    case 'move':
                        const updateData: Record<string, any> = {};
                        if (collectionId !== undefined) updateData.collection = collectionId;
                        if (important !== undefined) updateData.important = important;

                        await this.raindropService.batchUpdateBookmarks(bookmarkIds, updateData);
                        result = `Successfully ${operation === 'move' ? 'moved' : 'updated'} ${bookmarkIds.length} bookmarks`;
                        break;

                    case 'tag_add':
                    case 'tag_remove':
                        if (!tags?.length) throw new Error('Tags required for tag operations');

                        const bookmarks = await Promise.all(bookmarkIds.map(id => this.raindropService.getBookmark(id)));
                        await Promise.all(bookmarks.map(bookmark => {
                            const existingTags = bookmark.tags || [];
                            const newTags = operation === 'tag_add'
                                ? [...new Set([...existingTags, ...tags])]
                                : existingTags.filter(tag => !tags.includes(tag));
                            return this.raindropService.updateBookmark(bookmark._id, { tags: newTags });
                        }));

                        result = `Successfully ${operation === 'tag_add' ? 'added' : 'removed'} tags [${tags.join(', ')}] ${operation === 'tag_add' ? 'to' : 'from'} ${bookmarkIds.length} bookmarks`;
                        break;

                    case 'delete':
                    case 'delete_permanent':
                        await Promise.all(bookmarkIds.map(id =>
                            operation === 'delete_permanent'
                                ? this.raindropService.permanentDeleteBookmark(id)
                                : this.raindropService.deleteBookmark(id)
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
                            category: RaindropMCPService.CATEGORIES.BOOKMARKS
                        }
                    }]
                };
            })
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
            this.asyncHandler(async ({ operation, bookmarkId, date, note }) => {
                if (operation === 'set') {
                    if (!date) throw new Error('Date required for setting reminder');

                    const bookmark = await this.raindropService.setReminder(bookmarkId, { date, note });
                    return {
                        content: [{
                            type: "text",
                            text: `Reminder set for "${bookmark.title || 'Untitled'}" on ${date}`,
                            metadata: {
                                bookmarkId: bookmark._id,
                                reminderDate: date,
                                reminderNote: note,
                                category: RaindropMCPService.CATEGORIES.BOOKMARKS
                            }
                        }]
                    };
                } else {
                    await this.raindropService.deleteReminder(bookmarkId);
                    return {
                        content: [{
                            type: "text",
                            text: `Reminder removed from bookmark ${bookmarkId}`,
                            metadata: {
                                bookmarkId,
                                category: RaindropMCPService.CATEGORIES.BOOKMARKS
                            }
                        }]
                    };
                }
            })
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
            this.asyncHandler(async ({ collectionId }) => {
                const tags = await this.raindropService.getTags(collectionId);
                return { content: this.mapTags(tags, collectionId) };
            })
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
            this.asyncHandler(async ({ operation, collectionId, oldName, newName, sourceTags, destinationTag, tagName, tagNames }) => {
                let result: string;

                switch (operation) {
                    case 'rename':
                        if (!oldName || !newName) throw new Error('oldName and newName required for rename operation');

                        const renameResult = await this.raindropService.renameTag(collectionId, oldName, newName);
                        result = `Successfully renamed tag "${oldName}" to "${newName}"${collectionId ? ` in collection ${collectionId}` : ''}`;
                        break;

                    case 'merge':
                        if (!sourceTags?.length || !destinationTag) throw new Error('sourceTags and destinationTag required for merge operation');

                        await this.raindropService.mergeTags(collectionId, sourceTags, destinationTag);
                        result = `Successfully merged tags [${sourceTags.join(', ')}] into "${destinationTag}"`;
                        break;

                    case 'delete':
                        if (!tagName) throw new Error('tagName required for delete operation');

                        await this.raindropService.deleteTags(collectionId, [tagName]);
                        result = `Successfully deleted tag "${tagName}"${collectionId ? ` from collection ${collectionId}` : ''}`;
                        break;

                    case 'delete_multiple':
                        if (!tagNames?.length) throw new Error('tagNames required for delete_multiple operation');

                        await this.raindropService.deleteTags(collectionId, tagNames);
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
                            category: RaindropMCPService.CATEGORIES.TAGS
                        }
                    }]
                };
            })
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
            this.asyncHandler(async ({ scope, bookmarkId, collectionId, page, perPage }) => {
                let highlights;

                switch (scope) {
                    case 'all':
                        // getAllHighlights returns all highlights, so we paginate manually
                        const allHighlights = await RaindropService.getAllHighlights();
                        const start = (page ?? 0) * (perPage ?? 25);
                        const end = start + (perPage ?? 25);
                        highlights = allHighlights.slice(start, end);
                        break;
                    case 'bookmark':
                        if (!bookmarkId) throw new Error('bookmarkId required when scope=bookmark');
                        highlights = await this.raindropService.getHighlights(bookmarkId);
                        break;
                    case 'collection':
                        if (!collectionId) throw new Error('collectionId required when scope=collection');
                        highlights = await this.raindropService.getHighlightsByCollection(collectionId);
                        break;
                    default:
                        throw new Error(`Invalid scope: ${scope}`);
                }

                return {
                    content: this.mapHighlights(highlights),
                    metadata: {
                        scope,
                        bookmarkId,
                        collectionId,
                        page: page || 0,
                        perPage: perPage || 25,
                        total: highlights.length
                    }
                };
            })
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
            this.asyncHandler(async ({ bookmarkId, text, note, color }) => {
                const highlight = await this.raindropService.createHighlight(bookmarkId, { text, note, color });
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
                            category: RaindropMCPService.CATEGORIES.HIGHLIGHTS
                        }
                    }]
                };
            })
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
            this.asyncHandler(async ({ id, text, note, color }) => {
                const highlight = await this.raindropService.updateHighlight(id, { text, note, color });
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
                            category: RaindropMCPService.CATEGORIES.HIGHLIGHTS
                        }
                    }]
                };
            })
        );

        this.server.tool(
            'highlight_delete',
            'Delete a highlight permanently. This action cannot be undone.',
            {
                id: z.number().describe('Highlight ID to delete')
            },
            this.asyncHandler(async ({ id }) => {
                await this.raindropService.deleteHighlight(id);
                return {
                    content: [{
                        type: "text",
                        text: `Highlight ${id} successfully deleted`,
                        metadata: {
                            deletedHighlightId: id,
                            category: RaindropMCPService.CATEGORIES.HIGHLIGHTS
                        }
                    }]
                };
            })
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
            this.asyncHandler(async () => {
                const user = await this.raindropService.getUserInfo();
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
                            category: RaindropMCPService.CATEGORIES.USER
                        }
                    }]
                };
            })
        );

        this.server.tool(
            'user_statistics',
            'Get user account statistics or statistics for a specific collection. Includes bookmark counts, collection counts, and other usage metrics.',
            {
                collectionId: z.number().optional().describe('Collection ID for specific collection statistics (omit for account-wide stats)')
            },
            this.asyncHandler(async ({ collectionId }) => {
                const stats = collectionId
                    ? await this.raindropService.getCollectionStats(collectionId)
                    : await this.raindropService.getUserStats();

                const context = collectionId ? `Collection ${collectionId} Statistics` : 'Account Statistics';

                return {
                    content: [{
                        type: "text",
                        text: context,
                        metadata: {
                            ...stats,
                            collectionId,
                            category: RaindropMCPService.CATEGORIES.USER
                        }
                    }]
                };
            })
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
            this.asyncHandler(async () => {
                const status = await this.raindropService.getImportStatus();
                return {
                    content: [{
                        type: "text",
                        text: `Import Status: ${status.status}`,
                        metadata: {
                            ...status,
                            category: RaindropMCPService.CATEGORIES.IMPORT_EXPORT
                        }
                    }]
                };
            })
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
            this.asyncHandler(async ({ format, collectionId, includeBroken, includeDuplicates }) => {
                const options = {
                    format,
                    collectionId,
                    broken: includeBroken,
                    duplicates: includeDuplicates
                };

                const result = await this.raindropService.exportBookmarks(options);
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
                            category: RaindropMCPService.CATEGORIES.IMPORT_EXPORT
                        }
                    }]
                };
            })
        );

        this.server.tool(
            'export_status',
            'Check the status of an ongoing export operation and get download link when ready.',
            {},
            this.asyncHandler(async () => {
                const status = await this.raindropService.getExportStatus();
                
                if (status.status === 'ready' && status.url) {
                    // Return ResourceLink when export is ready for download
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Export completed successfully and is ready to download.`
                            },
                            {
                                type: "resource_link",
                                uri: status.url,
                                name: `bookmarks_export.${status.url.split('.').pop() || 'file'}`,
                                mimeType: this.getMimeTypeFromUrl(status.url),
                                description: 'Your exported bookmarks file is ready to download'
                            }
                        ],
                        metadata: {
                            ...status,
                            category: RaindropMCPService.CATEGORIES.IMPORT_EXPORT
                        }
                    };
                } else {
                    // Return status text for in-progress or error states
                    const message = status.status === 'in-progress' 
                        ? `Export in progress${status.progress ? ` (${status.progress}% complete)` : ''}...`
                        : `Export Status: ${status.status}`;
                        
                    return {
                        content: [{
                            type: "text",
                            text: message,
                            metadata: {
                                ...status,
                                category: RaindropMCPService.CATEGORIES.IMPORT_EXPORT
                            }
                        }]
                    };
                }
            })
        );
    }



    /**
     * Helper to map collections to MCP text content array
     */
    private mapCollections(collections: any[], category = RaindropMCPService.CATEGORIES.COLLECTIONS): Array<{ type: "text"; text: string; metadata: any }> {
        return collections.map(collection => ({
            type: "text" as const,
            text: `${collection.title} (ID: ${collection._id}, ${collection.count} items)` ,
            metadata: {
                id: collection._id,
                title: collection.title,
                count: collection.count,
                public: collection.public,
                created: collection.created,
                lastUpdate: collection.lastUpdate,
                category
            }
        }));
    }

    /**
     * Helper to map bookmarks to MCP resource content array
     */
    private mapBookmarks(bookmarks: any[], category = RaindropMCPService.CATEGORIES.BOOKMARKS): Array<{ type: "resource"; resource: { text: string; uri: string; metadata: any } }> {
        return bookmarks.map(bookmark => ({
            type: "resource" as const,
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
                    category
                }
            }
        }));
    }

    /**
     * Helper to map tags to MCP text content array
     */
    private mapTags(tags: any[], collectionId?: number, category = RaindropMCPService.CATEGORIES.TAGS): Array<{ type: "text"; text: string; metadata: any }> {
        return tags.map(tag => ({
            type: "text" as const,
            text: `${tag._id} (${tag.count} bookmarks)` ,
            metadata: {
                name: tag._id,
                count: tag.count,
                collectionId,
                category
            }
        }));
    }

    /**
     * Helper to map highlights to MCP text content array
     */
    private mapHighlights(highlights: any[], category = RaindropMCPService.CATEGORIES.HIGHLIGHTS): Array<{ type: "text"; text: string; metadata: any }> {
        return highlights.map(highlight => ({
            type: "text" as const,
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
                category
            }
        }));
    }

    /**
     * Get the MCP server instance
     */
    /**
     * Get the MCP server instance (public accessor)
     */
    // Remove duplicate getServer if present

    // Add requestConfirmation stub for destructive ops
    private async requestConfirmation(message: string, details?: { itemCount?: number; itemType?: string; additionalInfo?: string }): Promise<boolean> {
        // For now, always return true (auto-confirm)
        return true;
    }

    /**
     * Cleanup method for graceful shutdown
     */
    /**
     * Cleanup method for graceful shutdown (public async)
     */
    public async cleanup() {
        // Perform any necessary cleanup here
        if (this.logger && typeof this.logger.info === 'function') {
            this.logger.info('MCP service cleanup completed');
        }
    }

    /**
     * Infer MIME type from a file URL or extension.
     */
    private getMimeTypeFromUrl(url: string): string {
        const extension = url.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'csv':
                return 'text/csv';
            case 'html':
            case 'htm':
                return 'text/html';
            case 'pdf':
                return 'application/pdf';
            case 'json':
                return 'application/json';
            case 'txt':
                return 'text/plain';
            case 'zip':
                return 'application/zip';
            default:
                return 'application/octet-stream';
        }
    }
}

/**
 * Factory function to create and configure the optimized Raindrop MCP server
 * Returns both the server instance and a cleanup function
 */
export function createOptimizedRaindropServer() {
    const service = new RaindropMCPService();
    
    return {
        server: service.getServer(),
        cleanup: async () => await service.cleanup()
    };
}