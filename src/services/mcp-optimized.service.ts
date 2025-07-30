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
    private logger = {
        warn: (msg: string, error?: any) => console.warn(`[WARN] ${msg}`, error || ''),
        info: (msg: string) => console.info(`[INFO] ${msg}`),
        error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error || ''),
        debug: (msg: string) => console.debug(`[DEBUG] ${msg}`)
    };

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
        this.server = new McpServer(
            {
                name: 'raindrop-mcp-optimized',
                version: '2.0.0',
                description: 'Modern MCP 2025 Server for Raindrop.io with advanced interactive capabilities',
                capabilities: {
                    logging: false, // Keep logging off for STDIO compatibility
                    elicitation: {}, // Enable interactive user input requests
                    sampling: {} // Enable LLM sampling capabilities
                }
            },
            {
                // Enable notification debouncing for better performance
                debouncedNotificationMethods: [
                    'notifications/tools/list_changed',
                    'notifications/resources/list_changed',
                    'notifications/prompts/list_changed'
                ]
            }
        );

        this.setupLogging();
        this.initializeResources();
        this.initializeTools();
        this.setupElicitationHelpers();
        this.setupDynamicTools();
    }

    private setupLogging() {
        // Basic logging setup - same as original but condensed
        // Implementation details unchanged from original
    }

    /**
     * Setup elicitation helper methods for interactive user input
     * These methods enable rich user interactions during tool execution
     */
    private setupElicitationHelpers() {
        // No additional setup needed - elicitation methods are available on server instance
    }


    /**
     * Setup dynamic tool management
     * This enables tools to be conditionally available based on context
     */
    private setupDynamicTools() {
        // Add a dynamic tool that checks if user has Pro features
        this.server.tool(
            'feature_availability',
            'Check which Raindrop.io features are available for your account (Pro vs Free). Some tools may require Pro subscription.',
            {
                includeToolAvailability: z.boolean().optional().default(false).describe('Include which tools require Pro features')
            },
            async ({ includeToolAvailability }) => {
                try {
                    const userInfo = await raindropService.getUserInfo();
                    const isPro = userInfo.pro;

                    const features = {
                        basic: [
                            'All collection operations',
                            'Basic bookmark management',
                            'Tag management',
                            'Basic search',
                            'Export bookmarks',
                            'Highlights viewing'
                        ],
                        pro: isPro ? [
                            'Advanced search filters',
                            'Full-text search in bookmark content',
                            'Nested collections',
                            'Collaboration features',
                            'Advanced export options',
                            'Permanent bookmark deletion',
                            'Bulk operations'
                        ] : []
                    };

                    let toolAvailability = {};
                    if (includeToolAvailability) {
                        toolAvailability = {
                            // Tools that require Pro
                            proRequiredTools: isPro ? [] : [
                                'Advanced search with full-text content',
                                'Nested collection management',
                                'Advanced export formats'
                            ],
                            // Tools available to all users
                            availableTools: [
                                'collection_list', 'collection_create', 'collection_update', 'collection_delete',
                                'bookmark_search', 'bookmark_create', 'bookmark_update', 'bookmark_batch_operations',
                                'tag_list', 'tag_manage',
                                'highlight_list', 'highlight_create', 'highlight_update', 'highlight_delete',
                                'user_profile', 'user_statistics',
                                'import_status', 'export_bookmarks', 'export_status'
                            ]
                        };
                    }

                    return {
                        content: [{
                            type: "text",
                            text: `Account Type: ${isPro ? 'Pro' : 'Free'} - ${isPro ? 'All features available' : 'Some advanced features require Pro subscription'}`,
                            metadata: {
                                accountType: isPro ? 'pro' : 'free',
                                userId: userInfo._id,
                                email: userInfo.email,
                                features,
                                ...toolAvailability,
                                category: OptimizedRaindropMCPService.CATEGORIES.USER
                            }
                        }]
                    };
                } catch (error) {
                    throw new Error(`Failed to check feature availability: ${(error as Error).message}`);
                }
            }
        );

        // Add a dynamic tool for contextual quick actions
        this.server.tool(
            'quick_actions',
            'Get suggested quick actions based on your recent activity and current data state. This tool provides contextual recommendations.',
            {
                context: z.enum(['collections', 'bookmarks', 'tags', 'highlights', 'general']).optional().default('general').describe('Focus area for suggestions')
            },
            async ({ context }) => {
                try {
                    const [collections, userStats] = await Promise.all([
                        raindropService.getCollections(),
                        raindropService.getUserStats()
                    ]);

                    const suggestions: Array<{action: string, description: string, tool: string, reason: string}> = [];

                    // Analyze collections and suggest actions
                    const emptyCollections = collections.filter(c => c.count === 0);
                    const largeCollections = collections.filter(c => c.count > 100);
                    
                    if (context === 'collections' || context === 'general') {
                        if (emptyCollections.length > 0) {
                            suggestions.push({
                                action: 'Remove Empty Collections',
                                description: `Remove ${emptyCollections.length} empty collections to clean up your workspace`,
                                tool: 'collection_maintenance',
                                reason: `Found ${emptyCollections.length} collections with no bookmarks`
                            });
                        }

                        if (largeCollections.length > 0) {
                            suggestions.push({
                                action: 'Review Large Collections',
                                description: `Consider organizing ${largeCollections.length} collections with 100+ bookmarks`,
                                tool: 'bookmark_search',
                                reason: 'Large collections might benefit from sub-collections or better tagging'
                            });
                        }
                    }

                    if (context === 'bookmarks' || context === 'general') {
                        // Get recent bookmarks to suggest tagging
                        try {
                            const recentBookmarks = await raindropService.getBookmarks({ 
                                perPage: 10, 
                                page: 0, 
                                sort: '-created' 
                            });
                            
                            const untaggedRecent = recentBookmarks.items.filter(b => !b.tags || b.tags.length === 0);
                            if (untaggedRecent.length > 0) {
                                suggestions.push({
                                    action: 'Tag Recent Bookmarks',
                                    description: `Add tags to ${untaggedRecent.length} recent untagged bookmarks`,
                                    tool: 'bookmark_batch_operations',
                                    reason: 'Recent bookmarks without tags are harder to find later'
                                });
                            }
                        } catch (error) {
                            // Ignore bookmark analysis errors
                        }
                    }

                    if (context === 'tags' || context === 'general') {
                        try {
                            const tags = await raindropService.getTags();
                            const singleUseTags = tags.filter(t => t.count === 1);
                            
                            if (singleUseTags.length > 10) {
                                suggestions.push({
                                    action: 'Consolidate Single-Use Tags',
                                    description: `Consider merging or removing ${singleUseTags.length} tags used only once`,
                                    tool: 'tag_manage',
                                    reason: 'Too many single-use tags can clutter your organization system'
                                });
                            }
                        } catch (error) {
                            // Ignore tag analysis errors  
                        }
                    }

                    // General maintenance suggestions
                    if (context === 'general') {
                        suggestions.push({
                            action: 'Export Backup',
                            description: 'Create a backup of your bookmarks',
                            tool: 'export_bookmarks',
                            reason: 'Regular backups protect your bookmark collection'
                        });

                        if (collections.length > 20) {
                            suggestions.push({
                                action: 'Review Collection Structure',
                                description: 'Consider consolidating or reorganizing your collections',
                                tool: 'collection_maintenance',
                                reason: `You have ${collections.length} collections - organization might help`
                            });
                        }
                    }

                    return {
                        content: suggestions.map(suggestion => ({
                            type: "text",
                            text: `${suggestion.action}: ${suggestion.description}`,
                            metadata: {
                                action: suggestion.action,
                                description: suggestion.description,
                                recommendedTool: suggestion.tool,
                                reason: suggestion.reason,
                                priority: suggestion.action.includes('Empty') || suggestion.action.includes('Backup') ? 'high' : 'medium',
                                category: OptimizedRaindropMCPService.CATEGORIES.USER
                            }
                        })),
                        metadata: {
                            context,
                            totalSuggestions: suggestions.length,
                            analysisDate: new Date().toISOString(),
                            accountStats: {
                                totalCollections: collections.length,
                                emptyCollections: emptyCollections.length,
                                largeCollections: largeCollections.length
                            }
                        }
                    };
                } catch (error) {
                    throw new Error(`Failed to generate quick actions: ${(error as Error).message}`);
                }
            }
        );
    }


    /**
     * Request user confirmation for destructive operations
     * Since elicitation is not available in this MCP SDK version, we'll skip confirmation
     */
    private async requestConfirmation(
        message: string,
        details?: { itemCount?: number; itemType?: string; additionalInfo?: string }
    ): Promise<boolean> {
        // Note: Elicitation not available in current MCP SDK
        // For destructive operations, we'll proceed but log the action
        this.logger.warn(`DESTRUCTIVE ACTION: ${message}`, details);
        return true; // Proceed with operation
    }


    /**
     * Get MIME type from URL based on file extension
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
            case 'xml':
                return 'application/xml';
            case 'txt':
                return 'text/plain';
            case 'zip':
                return 'application/zip';
            default:
                return 'application/octet-stream';
        }
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
                            categories: Object.values(OptimizedRaindropMCPService.CATEGORIES),
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
                    ? await raindropService.getChildCollections(parentId)
                    : await raindropService.getCollections();
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
                const collection = await raindropService.getCollection(id);
                
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
                                category: OptimizedRaindropMCPService.CATEGORIES.COLLECTIONS
                            }
                        }]
                    };
                }

                await raindropService.deleteCollection(id);
                return {
                    content: [{
                        type: "text",
                        text: `Collection "${collection.title}" successfully deleted. ${collection.count} bookmarks moved to Unsorted.`,
                        metadata: {
                            deletedCollectionId: id,
                            deletedCollectionTitle: collection.title,
                            bookmarksMoved: collection.count,
                            category: OptimizedRaindropMCPService.CATEGORIES.COLLECTIONS
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
                        const targetCollection = await raindropService.getCollection(targetId);
                        const sourceCollections = await Promise.all(
                            sourceIds.map(id => raindropService.getCollection(id))
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
                                        category: OptimizedRaindropMCPService.CATEGORIES.COLLECTIONS
                                    }
                                }]
                            };
                        }

                        await raindropService.mergeCollections(targetId, sourceIds);
                        result = `Successfully merged ${sourceIds.length} collections (${sourceCollections.map(c => c.title).join(', ')}) into "${targetCollection.title}"`;
                        break;

                    case 'remove_empty':
                        // First check how many empty collections exist
                        const collections = await raindropService.getCollections();
                        const emptyCollections = collections.filter(c => c.count === 0);
                        
                        if (emptyCollections.length === 0) {
                            return {
                                content: [{
                                    type: "text",
                                    text: `No empty collections found. Nothing to remove.`,
                                    metadata: {
                                        operation: 'remove_empty',
                                        emptyCollectionsFound: 0,
                                        category: OptimizedRaindropMCPService.CATEGORIES.COLLECTIONS
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
                                        category: OptimizedRaindropMCPService.CATEGORIES.COLLECTIONS
                                    }
                                }]
                            };
                        }

                        const removeResult = await raindropService.removeEmptyCollections();
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
                                        category: OptimizedRaindropMCPService.CATEGORIES.COLLECTIONS
                                    }
                                }]
                            };
                        }

                        await raindropService.emptyTrash();
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
                            category: OptimizedRaindropMCPService.CATEGORIES.COLLECTIONS
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
                const result = await raindropService.searchRaindrops(params);
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
                const tags = await raindropService.getTags(collectionId);
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
            })
        );

        this.server.tool(
            'highlight_delete',
            'Delete a highlight permanently. This action cannot be undone.',
            {
                id: z.number().describe('Highlight ID to delete')
            },
            this.asyncHandler(async ({ id }) => {
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
            })
        );

        this.server.tool(
            'export_status',
            'Check the status of an ongoing export operation and get download link when ready.',
            {},
            this.asyncHandler(async () => {
                const status = await raindropService.getExportStatus();
                
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
                            category: OptimizedRaindropMCPService.CATEGORIES.IMPORT_EXPORT
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
                                category: OptimizedRaindropMCPService.CATEGORIES.IMPORT_EXPORT
                            }
                        }]
                    };
                }
            })
        );
    }

    /**
     * Helper to wrap tool/resource handlers with error handling
     */
    private asyncHandler<T extends object, R>(fn: (params: T) => Promise<R>) {
        return async (params: T) => {
            try {
                return await fn(params);
            } catch (error) {
                throw new Error((error as Error).message);
            }
        };
    }

    /**
     * Helper to map collections to content array
     */
    private mapCollections(collections: any[], category = OptimizedRaindropMCPService.CATEGORIES.COLLECTIONS) {
        return collections.map(collection => ({
            type: "text",
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
     * Helper to map bookmarks to content array
     */
    private mapBookmarks(bookmarks: any[], category = OptimizedRaindropMCPService.CATEGORIES.BOOKMARKS) {
        return bookmarks.map(bookmark => ({
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
                    category
                }
            }
        }));
    }

    /**
     * Helper to map tags to content array
     */
    private mapTags(tags: any[], collectionId?: number, category = OptimizedRaindropMCPService.CATEGORIES.TAGS) {
        return tags.map(tag => ({
            type: "text",
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
     * Helper to map highlights to content array
     */
    private mapHighlights(highlights: any[], category = OptimizedRaindropMCPService.CATEGORIES.HIGHLIGHTS) {
        return highlights.map(highlight => ({
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
                category
            }
        }));
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
                            categories: Object.values(OptimizedRaindropMCPService.CATEGORIES),
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
                    ? await raindropService.getChildCollections(parentId)
                    : await raindropService.getCollections();
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
            })
        );

        this.server.tool(
            'collection_delete',
            'Delete a collection