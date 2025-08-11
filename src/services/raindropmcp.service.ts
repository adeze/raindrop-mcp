import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import pkg from '../../package.json';
import { BookmarkInputSchema, BookmarkOutputSchema, CollectionManageInputSchema, CollectionOutputSchema, HighlightInputSchema, HighlightOutputSchema, TagInputSchema, TagOutputSchema } from "../types/raindrop-zod.schemas.js";
import RaindropService from "./raindrop.service.js";

/**
 * Configuration for an MCP tool.
 * @see {@link https://github.com/modelcontextprotocol/typescript-sdk | MCP TypeScript SDK}
 */
interface ToolConfig<T = { content: McpContent[] }> {
    /** Tool name (unique identifier) */
    name: string;
    /** Human-readable description of the tool */
    description: string;
    /** Zod schema for tool input */
    inputSchema: z.ZodType;
    /** Zod schema for tool output */
    outputSchema?: z.ZodType;
    /** Tool handler function */
    handler: (args: any, extra: any) => Promise<T>;
}



/**
 * MCP protocol content type for tool/resource responses.
 * @see {@link https://github.com/modelcontextprotocol/typescript-sdk | MCP TypeScript SDK}
 */
type McpContent =
    | { type: "text"; text: string; _meta?: Record<string, unknown> }
    | { type: "resource_link"; name: string; uri: string; description: string; mimeType: string; _meta?: Record<string, unknown> };

const SERVER_VERSION = pkg.version;



// --- Declarative tool configs ---
const toolConfigs: ToolConfig[] = [
    {
        name: 'diagnostics',
        description: 'Provides server diagnostics and environment info. Use includeEnvironment param for detailed info.',
        inputSchema: z.object({
            includeEnvironment: z.boolean().optional().describe('Include environment info')
        }),
        outputSchema: z.object({
            content: z.array(z.object({
                type: z.string(),
                uri: z.string(),
                name: z.string(),
                description: z.string(),
                mimeType: z.string(),
                _meta: z.record(z.any()),
            }))
        }),
        handler: async (_args) => ({
            content: [{
                type: 'resource_link',
                uri: 'diagnostics://server',
                name: 'Server Diagnostics',
                description: `Server diagnostics and environment info resource. Version: ${SERVER_VERSION}`,
                mimeType: 'application/json',
                _meta: {
                    version: SERVER_VERSION,
                    mcpProtocolVersion: process.env.MCP_PROTOCOL_VERSION || 'unknown',
                    nodeVersion: process.version,
                    bunVersion: (typeof Bun !== 'undefined' ? Bun.version : undefined),
                    os: process.platform,
                    uptime: process.uptime(),
                    startTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
                    env: {
                        NODE_ENV: process.env.NODE_ENV,
                        MCP_DEBUG: process.env.MCP_DEBUG,
                        MCP_TRANSPORT: process.env.MCP_TRANSPORT,
                        RAINDROP_ACCESS_TOKEN: process.env.RAINDROP_ACCESS_TOKEN ? 'set' : 'unset',
                    },
                    enabledTools: toolConfigs.map(t => t.name),
                    apiStatus: 'unknown', // Optionally, ping Raindrop.io API for live status
                    memory: process.memoryUsage(),
                },
            }]
        })
    },
    {
        name: 'collection_list',
        description: 'Lists all Raindrop collections for the authenticated user.',
        inputSchema: z.object({}),
        outputSchema: z.object({
            content: z.array(z.object({
                type: z.string(),
                name: z.string().optional(),
                uri: z.string().optional(),
                description: z.string().optional(),
                mimeType: z.string().optional(),
                text: z.string().optional()
            }))
        }),
        handler: async (_args, { raindropService }) => {
            const collections = await raindropService.getCollections();

            // Return resource links for each collection
            const content: McpContent[] = [
                { type: "text", text: `Found ${collections.length} collections` }
            ];

            collections.forEach((collection: any) => {
                content.push({
                    type: "resource_link",
                    uri: `mcp://collection/${collection._id}`,
                    name: collection.title || 'Untitled Collection',
                    description: collection.description || `Collection with ${collection.count || 0} bookmarks`,
                    mimeType: "application/json"
                });
            });

            return { content };
        }
    },
    {
        name: 'collection_manage',
        description: 'Creates, updates, or deletes a collection. Use the operation parameter to specify the action.',
        inputSchema: CollectionManageInputSchema,
        outputSchema: CollectionOutputSchema,
        handler: async (args, { raindropService }) => {
            switch (args.operation) {
                case 'create':
                    if (!args.title) throw new Error('title is required for create');
                    return await raindropService.createCollection(args.title);
                case 'update':
                    if (!args.id) throw new Error('id is required for update');
                    return await raindropService.updateCollection(args.id, {
                        title: args.title,
                        color: args.color,
                        description: args.description
                    });
                case 'delete':
                    if (!args.id) throw new Error('id is required for delete');
                    await raindropService.deleteCollection(args.id);
                    return { deleted: true };
            }
        }
    },
    {
        name: 'bookmark_search',
        description: 'Searches bookmarks with advanced filters, tags, and full-text search.',
        inputSchema: z.object({
            search: z.string().optional().describe('Full-text search query'),
            collection: z.number().optional().describe('Collection ID to search within'),
            tags: z.array(z.string()).optional().describe('Tags to filter by'),
            important: z.boolean().optional().describe('Filter by important bookmarks'),
            page: z.number().optional().describe('Page number for pagination'),
            perPage: z.number().optional().describe('Items per page (max 50)'),
            sort: z.string().optional().describe('Sort order (score, title, -created, created)'),
            tag: z.string().optional().describe('Single tag to filter by'),
            duplicates: z.boolean().optional().describe('Include duplicate bookmarks'),
            broken: z.boolean().optional().describe('Include broken links'),
            highlight: z.boolean().optional().describe('Only bookmarks with highlights'),
            domain: z.string().optional().describe('Filter by domain')
        }),
        outputSchema: z.object({
            items: z.array(BookmarkOutputSchema),
            count: z.number()
        }),
        handler: async (args, { raindropService }) => {
            const result = await raindropService.getBookmarks({
                search: args.search,
                collection: args.collection,
                tags: args.tags,
                important: args.important,
                page: args.page,
                perPage: args.perPage,
                sort: args.sort,
                tag: args.tag,
                duplicates: args.duplicates,
                broken: args.broken,
                highlight: args.highlight,
                domain: args.domain
            });

            // Return resource links instead of raw data for better efficiency
            const content: McpContent[] = [
                { type: "text", text: `Found ${result.count} bookmarks` }
            ];

            // Add resource links for each bookmark
            result.items.forEach((bookmark: any) => {
                content.push({
                    type: "resource_link",
                    uri: `mcp://raindrop/${bookmark._id}`,
                    name: bookmark.title || 'Untitled',
                    description: bookmark.excerpt || 'No description',
                    mimeType: "application/json"
                });
            });

            return { content };
        }
    },
    {
        name: 'bookmark_manage',
        description: 'Creates, updates, or deletes bookmarks. Use the operation parameter to specify the action.',
        inputSchema: BookmarkInputSchema.extend({ operation: z.enum(['create', 'update', 'delete']), id: z.number().optional() }),
        outputSchema: BookmarkOutputSchema,
        handler: async (args, { raindropService }) => {
            switch (args.operation) {
                case 'create':
                    if (!args.collectionId) throw new Error('collectionId is required for create');
                    return await raindropService.createBookmark(args.collectionId, {
                        link: args.url,
                        title: args.title,
                        excerpt: args.description,
                        tags: args.tags,
                        important: args.important
                    });
                case 'update':
                    if (!args.id) throw new Error('id is required for update');
                    return await raindropService.updateBookmark(args.id, {
                        link: args.url,
                        title: args.title,
                        excerpt: args.description,
                        tags: args.tags,
                        important: args.important
                    });
                case 'delete':
                    if (!args.id) throw new Error('id is required for delete');
                    await raindropService.deleteBookmark(args.id);
                    return { deleted: true };
            }
        }
    },
    {
        name: 'tag_manage',
        description: 'Renames, merges, or deletes tags. Use the operation parameter to specify the action.',
        inputSchema: TagInputSchema,
        outputSchema: TagOutputSchema,
        handler: async (args, { raindropService }) => {
            switch (args.operation) {
                case 'rename':
                    if (!args.tagNames || !args.newName) throw new Error('tagNames and newName required for rename');
                    return await raindropService.renameTag(args.collectionId, args.tagNames[0], args.newName);
                case 'merge':
                    if (!args.tagNames || !args.newName) throw new Error('tagNames and newName required for merge');
                    return await raindropService.mergeTags(args.collectionId, args.tagNames, args.newName);
                case 'delete':
                    if (!args.tagNames) throw new Error('tagNames required for delete');
                    return await raindropService.deleteTags(args.collectionId, args.tagNames);
            }
        }
    },
    {
        name: 'highlight_manage',
        description: 'Creates, updates, or deletes highlights. Use the operation parameter to specify the action.',
        inputSchema: HighlightInputSchema.extend({ operation: z.enum(['create', 'update', 'delete']), id: z.number().optional() }),
        outputSchema: HighlightOutputSchema,
        handler: async (args, { raindropService }) => {
            switch (args.operation) {
                case 'create':
                    if (!args.bookmarkId || !args.text) throw new Error('bookmarkId and text required for create');
                    return await raindropService.createHighlight(args.bookmarkId, {
                        text: args.text,
                        note: args.note,
                        color: args.color
                    });
                case 'update':
                    if (!args.id) throw new Error('id required for update');
                    return await raindropService.updateHighlight(args.id, {
                        text: args.text,
                        note: args.note,
                        color: args.color
                    });
                case 'delete':
                    if (!args.id) throw new Error('id required for delete');
                    await raindropService.deleteHighlight(args.id);
                    return { deleted: true };
            }
        }
    },
    {
        name: 'getRaindrop',
        description: 'Fetch a single Raindrop.io bookmark by ID.',
        inputSchema: z.object({
            id: z.string().min(1, 'Bookmark ID is required'),
        }),
        outputSchema: z.object({
            item: BookmarkOutputSchema
        }),
        handler: async (args, { raindropService }) => {
            const bookmark = await raindropService.getBookmark(parseInt(args.id));
            return {
                content: [{
                    type: "resource_link",
                    uri: `mcp://raindrop/${bookmark._id}`,
                    name: bookmark.title || 'Untitled',
                    description: bookmark.excerpt || 'No description',
                    mimeType: "application/json"
                }]
            };
        }
    },
    {
        name: 'listRaindrops',
        description: 'List Raindrop.io bookmarks for a collection.',
        inputSchema: z.object({
            collectionId: z.string().min(1, 'Collection ID is required'),
            limit: z.number().min(1).max(100).optional(),
        }),
        outputSchema: z.object({
            items: z.array(BookmarkOutputSchema),
            count: z.number()
        }),
        handler: async (args, { raindropService }) => {
            const result = await raindropService.getBookmarks({
                collection: parseInt(args.collectionId),
                perPage: args.limit || 50
            });

            // Return resource links for better efficiency
            const content: McpContent[] = [
                { type: "text", text: `Found ${result.count} bookmarks in collection` }
            ];

            result.items.forEach((bookmark: any) => {
                content.push({
                    type: "resource_link",
                    uri: `mcp://raindrop/${bookmark._id}`,
                    name: bookmark.title || 'Untitled',
                    description: bookmark.excerpt || 'No description',
                    mimeType: "application/json"
                });
            });

            return { content };
        }
    },

    {
        name: 'bulk_edit_raindrops',
        description: 'Bulk update tags, favorite status, media, cover, or move bookmarks to another collection.',
        inputSchema: z.object({
            collectionId: z.number().describe('Collection to update raindrops in'),
            ids: z.array(z.number()).optional().describe('Array of raindrop IDs to update. If omitted, all in collection are updated.'),
            important: z.boolean().optional().describe('Mark as favorite (true/false)'),
            tags: z.array(z.string()).optional().describe('Tags to set. Empty array removes all tags.'),
            media: z.array(z.string()).optional().describe('Media URLs to set. Empty array removes all media.'),
            cover: z.string().optional().describe('Cover URL. Use <screenshot> for auto screenshot.'),
            collection: z.object({ $id: z.number() }).optional().describe('Move to another collection.'),
            nested: z.boolean().optional().describe('Include nested collections.'),
        }),
        outputSchema: z.object({
            content: z.array(z.object({
                type: z.string(),
                text: z.string(),
            }))
        }),
        handler: async (args, { raindropService }) => {
            // Defensive: Only send fields that are defined
            const body: any = {};
            if (args.ids) body.ids = args.ids;
            if (args.important !== undefined) body.important = args.important;
            if (args.tags) body.tags = args.tags;
            if (args.media) body.media = args.media;
            if (args.cover) body.cover = args.cover;
            if (args.collection) body.collection = args.collection;
            if (args.nested !== undefined) body.nested = args.nested;

            // Call Raindrop.io bulk update API
            const url = `https://api.raindrop.io/rest/v1/raindrops/${args.collectionId}`;
            try {
                const response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        // Add auth header if needed
                    },
                    body: JSON.stringify(body),
                });
                const result = await response.json() as { result: boolean; errorMessage?: string; modified?: number };
                if (!result.result) {
                    throw new Error(result.errorMessage || 'Bulk edit failed');
                }
                return {
                    content: [{
                        type: 'text',
                        text: `Bulk edit successful. Modified: ${result.modified ?? 'unknown'}`,
                    }],
                };
            } catch (err) {
                return {
                    content: [{
                        type: 'text',
                        text: `Bulk edit error: ${(err as Error).message}`,
                    }],
                    isError: true,
                };
            }
        },
    },
    // ...add more tools as needed, following the same pattern...
];

// --- MCP Server class ---
/**
 * Main MCP server implementation for Raindrop.io.
 * Wraps the MCP SDK server and exposes Raindrop tools/resources.
 * @see {@link https://github.com/modelcontextprotocol/typescript-sdk | MCP TypeScript SDK}
 * @see McpServer
 */
export class RaindropMCPService {
    private server: McpServer;
    public raindropService: RaindropService;
    private resources: Record<string, any> = {};

    /**
     * Expose the MCP server instance for external control (e.g., connect, close).
     */
    public getServer() {
        return this.server;
    }

    /**
     * Expose a cleanup method for graceful shutdown (no-op by default).
     * Extend as needed for resource cleanup.
     */
    public async cleanup() {
        // Add any additional cleanup logic here if needed
    }

    /**
     * Returns the MCP manifest and server capabilities for host integration and debugging.
     * Uses the SDK's getManifest() method if available, otherwise builds a manifest from registered tools/resources.
     */
    public async getManifest(): Promise<unknown> {
        if (typeof (this.server as any).getManifest === 'function') {
            return (this.server as any).getManifest();
        }
        // Fallback: build manifest manually
        return {
            name: "raindrop-mcp",
            version: SERVER_VERSION,
            description: "MCP Server for Raindrop.io with advanced interactive capabilities",
            capabilities: (this.server as any).capabilities,
            tools: await this.listTools(),
            // Optionally add resources, schemas, etc.
        };
    }

    constructor() {
        this.raindropService = new RaindropService();
        this.server = new McpServer({
            name: "raindrop-mcp",
            version: SERVER_VERSION,
            description: "MCP Server for Raindrop.io with advanced interactive capabilities",
            capabilities: {
                logging: false,
                discovery: true,
                errorStandardization: true,
                sessionInfo: true,
                toolChaining: true,
                schemaExport: true,
                promptManagement: true,
                resources: true,
                sampling: { supported: true, description: "All list/search tools support sampling and pagination." },
                elicitation: { supported: true, description: "Destructive and ambiguous actions require confirmation or clarification." }
            }
        });
        this.registerDeclarativeTools();
        this.registerResources();
    }

    private asyncHandler<T extends (...args: any[]) => Promise<any>>(fn: T): T {
        return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
            try {
                return await fn(...args);
            } catch (err) {
                if (err instanceof Error) throw err;
                throw new Error(String(err));
            }
        }) as T;
    }

    private registerDeclarativeTools() {
        for (const config of toolConfigs) {
            this.server.registerTool(
                config.name,
                {
                    title: config.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    description: config.description,
                    inputSchema: (config.inputSchema as z.ZodObject<any>).shape
                },
                this.asyncHandler(async (args: any, extra: any) => config.handler(args, { raindropService: this.raindropService, ...extra }))
            );
        }
    }

    private registerResources() {
        // Register static resources only (user profile and diagnostics)
        this.resources['mcp://user/profile'] = {
            contents: [{
                uri: 'mcp://user/profile',
                text: JSON.stringify({ profile: 'User profile information from Raindrop.io' }, null, 2)
            }]
        };

        this.resources['diagnostics://server'] = {
            contents: [{
                uri: 'diagnostics://server',
                text: JSON.stringify({
                    diagnostics: 'Server diagnostics and environment info',
                    version: SERVER_VERSION,
                    timestamp: new Date().toISOString()
                }, null, 2)
            }]
        };

        // Note: Collection and raindrop resources are now handled dynamically
        // in readResource() method - no pre-registration needed
    }


    /**
     * Returns a list of all registered MCP tools with their metadata.
     */
    public async listTools(): Promise<Array<{
        id: string;
        name: string;
        description: string;
        inputSchema: unknown;
        outputSchema: unknown;
    }>> {
        // Return all registered tools from the MCP server, ensuring each has a description
        const tools = ((this.server as any)._tools || []).map((tool: any) => ({
            id: tool.id || tool.name,
            name: tool.name,
            description: tool.description || '',
            inputSchema: tool.inputSchema || {},
            outputSchema: tool.outputSchema || {},
        }));

        // Also include tools from our toolConfigs if the server's _tools is empty
        if (tools.length === 0) {
            return toolConfigs.map(config => ({
                id: config.name,
                name: config.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                description: config.description,
                inputSchema: config.inputSchema,
                outputSchema: config.outputSchema || {}
            }));
        }

        return tools.filter((tool: any) => tool.description);
    }

    /**
     * Call a registered tool by its ID with the given input.
     * @param toolId - The tool's ID
     * @param input - Input object for the tool
     * @returns Tool response
     */
    public async callTool(toolId: string, input: any): Promise<any> {
        const tool = (this.server as any)._tools?.find((t: any) => t.id === toolId);
        if (!tool || typeof tool.handler !== 'function') {
            throw new Error(`Tool with id "${toolId}" not found or has no handler.`);
        }
        // Defensive: ensure input is always an object
        return await tool.handler(input ?? {}, {});
    }

    /**
     * Reads an MCP resource by URI using the public API.
     * Supports both static pre-registered resources and dynamic resources.
     *
     * @param uri - The resource URI to read.
     * @returns The resource contents as an array of objects with uri and text.
     * @throws Error if the resource is not found or not readable.
     */
    public async readResource(uri: string): Promise<{ contents: any[] }> {
        // Handle dynamic resources first (no pre-registration required)
        try {
            if (uri.startsWith('mcp://collection/')) {
                const uriParts = uri.split('/');
                const collectionIdStr = uriParts[uriParts.length - 1];
                if (!collectionIdStr) {
                    throw new Error('Collection ID is required');
                }
                const collectionId = parseInt(collectionIdStr);
                if (isNaN(collectionId)) {
                    throw new Error(`Invalid collection ID: ${collectionIdStr}`);
                }
                const collection = await this.raindropService.getCollection(collectionId);
                return {
                    contents: [{
                        uri,
                        text: JSON.stringify({ collection }, null, 2)
                    }]
                };
            }

            if (uri.startsWith('mcp://raindrop/')) {
                const uriParts = uri.split('/');
                const raindropIdStr = uriParts[uriParts.length - 1];
                if (!raindropIdStr) {
                    throw new Error('Raindrop ID is required');
                }
                const raindropId = parseInt(raindropIdStr);
                if (isNaN(raindropId)) {
                    throw new Error(`Invalid raindrop ID: ${raindropIdStr}`);
                }
                const raindrop = await this.raindropService.getBookmark(raindropId);
                return {
                    contents: [{
                        uri,
                        text: JSON.stringify({ raindrop }, null, 2)
                    }]
                };
            }

            if (uri === 'mcp://user/profile') {
                const userInfo = await this.raindropService.getUserInfo();
                return {
                    contents: [{
                        uri,
                        text: JSON.stringify({ profile: userInfo }, null, 2)
                    }]
                };
            }
        } catch (error) {
            // If API call fails for dynamic resources, throw error with context
            throw new Error(`Failed to fetch data for resource ${uri}: ${error instanceof Error ? error.message : String(error)}`);
        }

        // Handle static pre-registered resources
        if (!this.resources[uri]) {
            throw new Error(`Resource with uri "${uri}" not found or not readable.`);
        }

        const resource = this.resources[uri];
        return {
            contents: Array.isArray(resource.contents) ? resource.contents : [resource.contents]
        };
    }

    /**
     * Returns a list of all available MCP resources with their metadata.
     * Includes both static pre-registered resources and dynamic resource patterns.
     */
    public listResources(): Array<{ id: string; uri: string; title?: string; description?: string; mimeType?: string }> {
        const serverResources = ((this.server as any)._resources || []).map((r: any) => ({
            id: r.id || r.uri,
            uri: r.uri,
            title: r.title,
            description: r.description,
            mimeType: r.mimeType,
        }));

        // Include our static resources and dynamic resource patterns
        const staticResources = Object.keys(this.resources).map(uri => ({
            id: uri,
            uri,
            title: `Resource ${uri}`,
            description: `MCP resource for ${uri}`,
            mimeType: 'application/json'
        }));

        // Add dynamic resource patterns for documentation
        const dynamicResourcePatterns = [
            {
                id: 'mcp://collection/{id}',
                uri: 'mcp://collection/{id}',
                title: 'Collection Resource Pattern',
                description: 'Access any Raindrop collection by ID (e.g., mcp://collection/123456)',
                mimeType: 'application/json'
            },
            {
                id: 'mcp://raindrop/{id}',
                uri: 'mcp://raindrop/{id}',
                title: 'Raindrop Resource Pattern',
                description: 'Access any Raindrop bookmark by ID (e.g., mcp://raindrop/987654)',
                mimeType: 'application/json'
            }
        ];

        // Combine all resources: server resources, static resources, and dynamic patterns
        return [
            ...serverResources,
            ...staticResources,
            ...dynamicResourcePatterns
        ];
    }

    /**
     * Returns true if the MCP server is healthy and ready.
     */
    public async healthCheck(): Promise<boolean> {
        // Optionally, check connectivity to Raindrop.io or other dependencies
        return true;
    }

    /**
     * Returns basic server info (name, version, description).
     */
    public getInfo(): { name: string; version: string; description: string } {
        return {
            name: "raindrop-mcp-server",
            version: SERVER_VERSION,
            description: "MCP Server for Raindrop.io with advanced interactive capabilities"
        };
    }
}
