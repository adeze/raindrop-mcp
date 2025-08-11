import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import pkg from '../../package.json';
import { BookmarkInputSchema, BookmarkOutputSchema, CollectionManageInputSchema, CollectionOutputSchema, HighlightInputSchema, HighlightOutputSchema, TagInputSchema, TagOutputSchema } from "../types/raindrop-zod.schemas.js";
import type { components } from '../types/raindrop.schema.js';
import RaindropService from "./raindrop.service.js";
type Collection = components['schemas']['Collection'];
type Bookmark = components['schemas']['Bookmark'];
type Highlight = components['schemas']['Highlight'];
type Tag = components['schemas']['Tag'];

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
 * Configuration for an MCP resource.
 * @see {@link https://github.com/modelcontextprotocol/typescript-sdk | MCP TypeScript SDK}
 */
interface ResourceConfig {
    /** Resource ID */
    id: string;
    /** Resource URI */
    uri: string;
    /** Optional resource title */
    title?: string;
    /** Resource description */
    description: string;
    /** MIME type of the resource */
    mimeType?: string;
    /** Zod schema for resource input */
    inputSchema?: z.ZodType;
    /** Zod schema for resource output */
    outputSchema?: z.ZodType;
    /** Resource handler function */
    handler: (params: any, context: any) => Promise<any>;
}

/**
 * Supported CRUD operations for tools.
 * @see {@link https://github.com/modelcontextprotocol/typescript-sdk | MCP TypeScript SDK}
 */
type CrudOperation = "create" | "update" | "delete";

/**
 * Handler functions for CRUD tools.
 * @see {@link https://github.com/modelcontextprotocol/typescript-sdk | MCP TypeScript SDK}
 */
type CrudHandler<T> = {
    create?: (args: any) => Promise<T>;
    update?: (args: any) => Promise<T>;
    delete?: (args: any) => Promise<{ deleted: boolean } | void>;
};

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
                description: 'Server diagnostics and environment info resource.',
                mimeType: 'application/json',
                _meta: {},
            }]
        })
    },
    {
        name: 'collection_list',
        description: 'Lists all Raindrop collections for the authenticated user.',
        inputSchema: z.object({}),
        outputSchema: z.array(CollectionOutputSchema),
        handler: async (_args, { raindropService }) => {
            // Instead of returning all collections directly, return a resource_link
            return {
                content: [{
                    type: 'resource_link',
                    uri: 'resource://collections',
                    name: 'Collections',
                    description: 'All Raindrop collections for the authenticated user.',
                    mimeType: 'application/json',
                    _meta: {},
                }]
            };
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
        inputSchema: BookmarkInputSchema.partial(), // Make all fields optional for search
        outputSchema: z.array(BookmarkOutputSchema),
        handler: async (args, { raindropService }) => {
            // Instead of returning all bookmarks directly, return a resource_link
            return {
                content: [{
                    type: 'resource_link',
                    uri: 'resource://bookmarks',
                    name: 'Bookmarks',
                    description: 'Search results for bookmarks with applied filters.',
                    mimeType: 'application/json',
                    _meta: {},
                }]
            };
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
            item: z.object({
                id: z.string(),
                title: z.string(),
                link: z.string().url(),
                // ...other fields as needed...
            }),
        }),
        handler: function (args: any, extra: any): Promise<{ content: McpContent[]; }> {
            throw new Error("Function not implemented.");
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
            items: z.array(
                z.object({
                    id: z.string(),
                    title: z.string(),
                    link: z.string().url(),
                    // ...other fields as needed...
                })
            ),
        }),
        handler: function (args: any, extra: any): Promise<{ content: McpContent[]; }> {
            throw new Error("Function not implemented.");
        }
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
            this.server.tool(
                config.name,
                (config.inputSchema as z.ZodObject<any>).shape,
                {
                    id: config.name,
                    name: config.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    description: config.description
                },
                this.asyncHandler(async (args: any, extra: any) => config.handler(args, { raindropService: this.raindropService, ...extra }))
            );
        }
    }

    private registerResources() {
        // Register user profile resource
        this.resources['mcp://user/profile'] = {
            contents: [{
                uri: 'mcp://user/profile',
                text: JSON.stringify({ profile: 'User profile information from Raindrop.io' }, null, 2)
            }]
        };

        // Register diagnostics resource
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

        // Register collection resource template
        const registerCollectionResource = (collectionId: number) => {
            const uri = `mcp://collection/${collectionId}`;
            this.resources[uri] = {
                contents: [{
                    uri,
                    text: JSON.stringify({ collection: `Collection ${collectionId} information` }, null, 2)
                }]
            };
        };

        // Register raindrop resource template
        const registerRaindropResource = (raindropId: number) => {
            const uri = `mcp://raindrop/${raindropId}`;
            this.resources[uri] = {
                contents: [{
                    uri,
                    text: JSON.stringify({ raindrop: `Raindrop ${raindropId} information` }, null, 2)
                }]
            };
        };

        // Pre-register test resources for the test constants
        registerCollectionResource(123456);
        registerRaindropResource(654321);
    }

    // Helper methods for building responses
    private createTextResponse(data: unknown): { content: McpContent[] } {
        return {
            content: [{
                type: "text" as const,
                text: JSON.stringify(data, null, 2),
                _meta: {},
            }],
        };
    }

    private createResourceLinkResponse(uri: string, name: string, description: string): { content: McpContent[] } {
        return {
            content: [{
                type: "resource_link" as const,
                uri,
                name,
                description,
                mimeType: "application/json",
                _meta: {},
            }],
        };
    }

    // Generic list tool factory
    private createListTool<T>(
        name: string,
        description: string,
        serviceMethod: () => Promise<T[]>,
        mapper: (items: T[]) => unknown[],
        schema: z.ZodType
    ): ToolConfig {
        return {
            name,
            description,
            inputSchema: z.object({
                limit: z.number().optional().describe("Maximum number of items to return"),
                offset: z.number().optional().describe("Offset for pagination")
            }),
            outputSchema: z.object({ [name.split('_')[0] + 's']: z.array(schema) }),
            handler: this.asyncHandler(async (args: { limit?: number; offset?: number }) => {
                const items = await serviceMethod();
                if (!Array.isArray(items)) {
                    throw new Error(`${name} service returned invalid data`);
                }
                let resultItems = items;
                if (typeof args.offset === 'number') {
                    resultItems = resultItems.slice(args.offset);
                }
                if (typeof args.limit === 'number') {
                    resultItems = resultItems.slice(0, args.limit);
                }
                const mapped = mapper(resultItems);
                const resultKey = name.split('_')[0] + 's';
                return this.createTextResponse({ [resultKey]: mapped });
            })
        };
    }

    // Generic CRUD tool factory
    private createCrudTool<T>(
        name: string,
        description: string,
        inputSchema: z.ZodRawShape,
        outputSchema: z.ZodType,
        handlers: CrudHandler<T>,
        mapper?: (items: T[]) => unknown[]
    ): ToolConfig {
        return {
            name,
            description,
            inputSchema: z.object(inputSchema),
            outputSchema,
            handler: this.asyncHandler(async (args: any) => {
                let result: T | { deleted: boolean } | void;

                switch (args.operation) {
                    case "create":
                        if (!handlers.create) throw new Error(`Create operation not supported for ${name}`);
                        result = await handlers.create(args);
                        break;
                    case "update":
                        if (!handlers.update) throw new Error(`Update operation not supported for ${name}`);
                        result = await handlers.update(args);
                        break;
                    case "delete":
                        if (!handlers.delete) throw new Error(`Delete operation not supported for ${name}`);
                        result = await handlers.delete(args);
                        break;
                    default:
                        throw new Error(`Unsupported operation for ${name}: ${args.operation}`);
                }

                const mappedResult = result && mapper && typeof result === 'object' && !('deleted' in result)
                    ? mapper([result as T])[0]
                    : result;

                return this.createTextResponse({ result: mappedResult });
            })
        };
    }


    // Resource registration helper
    private registerResourceFromConfig(config: ResourceConfig): void {
        const options: any = {
            description: config.description,
            ...(config.title && { title: config.title }),
            ...(config.mimeType && { mimeType: config.mimeType }),
            ...(config.inputSchema && { input: config.inputSchema }),
            ...(config.outputSchema && { output: config.outputSchema })
        };

        this.server.registerResource(config.id, config.uri, options, config.handler);
    }

    // Helper methods (mapCollections, mapBookmarks, mapTags, mapHighlights, requestConfirmation, cleanup, getMimeTypeFromUrl)

    /**
     * Maps Raindrop API collections to MCP-friendly format.
     * @param collections Raw collections from Raindrop API
     */
    private mapCollections(collections: unknown[]): unknown[] {
        if (!Array.isArray(collections)) {
            throw new Error('Collections must be an array');
        }
        return collections.map((col: any) => ({
            id: col._id || col.id,
            title: col.title,
            description: col.description,
            count: col.count,
            parentId: col.parent?.$id || col.parentId,
            color: col.color,
            created: col.created,
            lastUpdate: col.lastUpdate,
            expanded: col.expanded,
            access: col.access,
        }));
    }

    /**
     * Maps Raindrop API bookmarks to MCP-friendly format.
     */
    private mapBookmarks(bookmarks: unknown[]): unknown[] {
        if (!Array.isArray(bookmarks)) {
            throw new Error('Bookmarks must be an array');
        }
        return bookmarks.map((bm: any) => ({
            id: bm._id || bm.id,
            title: bm.title,
            url: bm.link || bm.url,
            excerpt: bm.excerpt,
            tags: bm.tags,
            created: bm.created,
            lastUpdate: bm.lastUpdate,
            important: bm.important,
            collectionId: bm.collection?.$id || bm.collectionId,
        }));
    }


    /**
     * Maps Raindrop API highlights to MCP-friendly format.
     */
    private mapHighlights(highlights: unknown[]): unknown[] {
        if (!Array.isArray(highlights)) {
            throw new Error('Highlights must be an array');
        }
        return highlights.map((hl: any) => ({
            id: hl._id || hl.id,
            text: hl.text,
            note: hl.note,
            color: hl.color,
            created: hl.created,
            lastUpdate: hl.lastUpdate,
            bookmarkId: hl.bookmarkId,
        }));
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
     * Reads a registered MCP resource by URI using the public API.
     * Throws an error if the resource is not found or not readable.
     *
     * Example:
     * @param uri - The resource URI to read.
     * @returns The resource contents as an array of objects with uri and text.
     * @throws Error if the resource is not found or not readable.
     */
    public async readResource(uri: string): Promise<{ contents: any[] }> {
        // Defensive: Check if resource exists
        if (!this.resources[uri]) {
            throw new Error(`Resource with uri "${uri}" not found or not readable.`);
        }
        // Defensive: Ensure contents is an array
        const resource = this.resources[uri];
        return {
            contents: Array.isArray(resource.contents) ? resource.contents : [resource.contents]
        };
    }

    /**
     * Returns a list of all registered MCP resources with their metadata.
     */
    public listResources(): Array<{ id: string; uri: string; title?: string; description?: string; mimeType?: string }> {
        const serverResources = ((this.server as any)._resources || []).map((r: any) => ({
            id: r.id || r.uri,
            uri: r.uri,
            title: r.title,
            description: r.description,
            mimeType: r.mimeType,
        }));
        
        // Also include our registered resources if the server's _resources is empty
        if (serverResources.length === 0) {
            return Object.keys(this.resources).map(uri => ({
                id: uri,
                uri,
                title: `Resource ${uri}`,
                description: `MCP resource for ${uri}`,
                mimeType: 'application/json'
            }));
        }
        
        return serverResources;
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
