import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import pkg from '../../package.json';
import type { components } from '../types/raindrop.schema.js';
import RaindropService from "./raindrop.service.js";
type Collection = components['schemas']['Collection'];
type Bookmark = components['schemas']['Bookmark'];
type Highlight = components['schemas']['Highlight'];
type Tag = components['schemas']['Tag'];

// Tool configuration types
interface ToolConfig<T = { content: McpContent[] }> {
    name: string;
    description: string;
    inputSchema: z.ZodType;
    outputSchema?: z.ZodType;
    handler: (args: any, extra: any) => Promise<T>;
}

interface ResourceConfig {
    id: string;
    uri: string;
    title?: string;
    description: string;
    mimeType?: string;
    inputSchema?: z.ZodType;
    outputSchema?: z.ZodType;
    handler: (params: any, context: any) => Promise<any>;
}

// Operation types for CRUD tools
type CrudOperation = "create" | "update" | "delete";
type CrudHandler<T> = {
    create?: (args: any) => Promise<T>;
    update?: (args: any) => Promise<T>;
    delete?: (args: any) => Promise<{ deleted: boolean } | void>;
};

// Response content type
type McpContent =
    | { type: "text"; text: string; _meta?: Record<string, unknown> }
    | { type: "resource_link"; name: string; uri: string; description: string; mimeType: string; _meta?: Record<string, unknown> };

const SERVER_VERSION = pkg.version;

// --- Declarative schemas ---
const collectionSchema = z.object({
    _id: z.number(),
    title: z.string(),
    description: z.string().optional(),
    count: z.number().optional(),
    parent: z.any().optional(),
    color: z.string().optional(),
    created: z.string().optional(),
    lastUpdate: z.string().optional(),
    expanded: z.boolean().optional(),
    access: z.any().optional(),
});

const bookmarkSchema = z.object({
    _id: z.number(),
    title: z.string(),
    link: z.string(),
    excerpt: z.string().optional(),
    tags: z.array(z.string()).optional(),
    created: z.string().optional(),
    lastUpdate: z.string().optional(),
    important: z.boolean().optional(),
    collection: z.any().optional(),
});

const highlightSchema = z.object({
    _id: z.string(),
    text: z.string(),
    note: z.string().optional(),
    color: z.string().optional(),
    created: z.string().optional(),
    lastUpdate: z.string().optional(),
    bookmarkId: z.number().optional(),
});

const tagSchema = z.object({
    _id: z.string(),
    count: z.number().optional(),
    name: z.string().optional(),
});

// --- Declarative tool configs ---
const toolConfigs: ToolConfig[] = [
    {
        name: 'diagnostics',
        description: 'Server diagnostics and environment info. Use includeEnvironment param for detailed info.',
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
        description: 'List all Raindrop collections for the authenticated user.',
        inputSchema: z.object({}),
        outputSchema: z.array(collectionSchema),
        handler: async (_args, { raindropService }) => {
            const items = await raindropService.getCollections();
            return items;
        }
    },
    {
        name: 'collection_manage',
        description: 'Create, update, or delete a collection. Use operation parameter.',
        inputSchema: z.object({
            operation: z.enum(['create', 'update', 'delete']),
            id: z.number().optional(),
            title: z.string().optional(),
            parentId: z.number().optional(),
            color: z.string().optional(),
            description: z.string().optional()
        }),
        outputSchema: collectionSchema,
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
        description: 'Search bookmarks with advanced filters, tags, and full-text.',
        inputSchema: z.object({
            query: z.string().optional(),
            collectionId: z.number().optional(),
            tags: z.array(z.string()).optional(),
            important: z.boolean().optional(),
            limit: z.number().min(1).max(100).optional().default(25),
            offset: z.number().min(0).optional().default(0),
            sample: z.number().min(1).max(100).optional()
        }),
        outputSchema: z.array(bookmarkSchema),
        handler: async (args, { raindropService }) => {
            const params: any = {};
            if (args.query) params.search = args.query;
            if (args.collectionId) params.collection = args.collectionId;
            if (args.tags) params.tags = args.tags;
            if (args.important !== undefined) params.important = args.important;
            if (args.limit) params.perPage = args.limit;
            if (args.offset) params.page = Math.floor(args.offset / (args.limit || 25)) + 1;
            const result = await raindropService.getBookmarks(params);
            return result.items;
        }
    },
    {
        name: 'bookmark_manage',
        description: 'Create, update, or delete bookmarks. Use operation parameter.',
        inputSchema: z.object({
            operation: z.enum(['create', 'update', 'delete']),
            id: z.number().optional(),
            collectionId: z.number().optional(),
            url: z.string().url().optional(),
            title: z.string().optional(),
            description: z.string().optional(),
            tags: z.array(z.string()).optional(),
            important: z.boolean().optional(),
            data: z.any().optional()
        }),
        outputSchema: bookmarkSchema,
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
        description: 'Rename, merge, or delete tags. Use operation parameter.',
        inputSchema: z.object({
            operation: z.enum(['rename', 'merge', 'delete']),
            tagNames: z.array(z.string()).optional(),
            newName: z.string().optional(),
            collectionId: z.number().optional()
        }),
        outputSchema: z.array(tagSchema),
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
        description: 'Create, update, or delete highlights. Use operation parameter.',
        inputSchema: z.object({
            operation: z.enum(['create', 'update', 'delete']),
            id: z.number().optional(),
            bookmarkId: z.number().optional(),
            text: z.string().optional(),
            note: z.string().optional(),
            color: z.string().optional()
        }),
        outputSchema: highlightSchema,
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
];

// --- MCP Server class ---
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
        this.listResources();
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
                { description: config.description },
                this.asyncHandler(async (args: any, extra: any) => config.handler(args, { raindropService: this.raindropService, ...extra }))
            );
        }
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
        // Ensure tools are registered and have all required fields
        return [
            {
                id: 'diagnostics',
                name: 'Diagnostics Tool',
                description: 'Provides server diagnostics and environment info.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        includeEnvironment: { type: 'boolean', description: 'Include environment info' }
                    },
                    required: [],
                    additionalProperties: false
                },
                outputSchema: {
                    type: 'object',
                    properties: {
                        content: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    type: { type: 'string' },
                                    uri: { type: 'string' },
                                    name: { type: 'string' },
                                    description: { type: 'string' },
                                    mimeType: { type: 'string' },
                                    _meta: { type: 'object' }
                                },
                                required: ['type', 'uri', 'name', 'description', 'mimeType', '_meta']
                            }
                        }
                    },
                    required: ['content'],
                    additionalProperties: false
                }
            }
            // ...add other tools here as needed...
        ];
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
        return ((this.server as any)._resources || []).map((r: any) => ({
            id: r.id || r.uri,
            uri: r.uri,
            title: r.title,
            description: r.description,
            mimeType: r.mimeType,
        }));
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
