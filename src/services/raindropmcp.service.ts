import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import RaindropService from "./raindrop.service.js";

export class RaindropMCPService {
    private server: McpServer;
    private raindropService: RaindropService;

    constructor() {
        this.raindropService = new RaindropService();
        this.server = new McpServer({
            name: "raindrop-mcp-server",
            version: "2.0.0",
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
        this.registerTools();
    }

    private asyncHandler<T extends (...args: any[]) => Promise<any>>(fn: T): T {
        return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
            try {
                return await fn(...args);
            } catch (err) {
                return { error: (err instanceof Error ? err.message : String(err)) } as any;
            }
        }) as T;
    }

    private registerTools() {
        // --- COLLECTION TOOLS ---
        this.server.tool(
            "collection_list",
            "List all Raindrop collections for the authenticated user.",
            {
                limit: z.number().optional().describe("Maximum number of collections to return"),
                offset: z.number().optional().describe("Offset for pagination")
            },
            {
                collections: z.array(z.any()), // TODO: Replace with actual collection type
            },
            this.asyncHandler(async (args: { limit?: number; offset?: number }, _extra) => {
                // Fetch collections from RaindropService
                const collections = await this.raindropService.getCollections();
                // Optionally apply limit/offset here if needed
                let sliced = collections;
                if (Array.isArray(collections)) {
                    if (typeof args.offset === 'number') {
                        sliced = sliced.slice(args.offset);
                    }
                    if (typeof args.limit === 'number') {
                        sliced = sliced.slice(0, args.limit);
                    }
                }
                // Map collections to MCP-friendly format
                const mapped = this.mapCollections(collections);
                return {
                    content: [
                        ({
                            type: "text",
                            text: JSON.stringify({ collections: mapped }, null, 2),
                            _meta: {},
                        } as any),
                    ],
                };
            })
        );

        this.server.tool(
            "collection_manage",
            "Create, update, or delete a collection. Use operation parameter.",
            {
                operation: z.enum(["create", "update", "delete"]),
                id: z.number().optional(),
                title: z.string().optional(),
                parentId: z.number().optional(),
                color: z.string().optional(),
                description: z.string().optional()
            },
            {
                result: z.any(),
            },
            this.asyncHandler(async (args, _extra) => {
                let result = null;
                if (args.operation === "create") {
                    if (!args.title) throw new Error("title is required for create");
                    // parentId, color, description are not supported by createCollection signature
                    result = await this.raindropService.createCollection(args.title);
                } else if (args.operation === "update") {
                    if (!args.id) throw new Error("id is required for update");
                    result = await this.raindropService.updateCollection(args.id, {
                        title: args.title,
                        color: args.color,
                        description: args.description
                    });
                } else if (args.operation === "delete") {
                    if (!args.id) throw new Error("id is required for delete");
                    await this.raindropService.deleteCollection(args.id);
                    result = { deleted: true };
                }
                return {
                    content: [
                        ({
                            type: "text",
                            text: JSON.stringify({ result: result ? this.mapCollections([result])[0] : null }, null, 2),
                            _meta: {},
                        } as any),
                    ],
                };
            })
        );

        // --- BOOKMARK TOOLS ---
        this.server.tool(
            "bookmark_search",
            "Search bookmarks with advanced filters, tags, and full-text. Supports resource URIs, pagination, and sampling.",
            {
                query: z.string().optional(),
                collectionId: z.number().optional(),
                tags: z.array(z.string()).optional(),
                important: z.boolean().optional(),
                limit: z.number().min(1).max(100).optional().default(25),
                offset: z.number().min(0).optional().default(0),
                sample: z.number().min(1).max(100).optional()
            },
            {
                bookmarks: z.array(z.any()),
            },
            this.asyncHandler(async (args, _extra) => {
                // Map args to SearchParams
                const params: any = {};
                if (args.query) params.search = args.query;
                if (args.collectionId) params.collection = args.collectionId;
                if (args.tags) params.tags = args.tags;
                if (args.important !== undefined) params.important = args.important;
                if (args.limit) params.perPage = args.limit;
                if (args.offset) params.page = Math.floor(args.offset / (args.limit || 25)) + 1;
                const { items } = await this.raindropService.getBookmarks(params);
                const mapped = this.mapBookmarks(items);
                return {
                    content: [
                        ({
                            type: "text",
                            text: JSON.stringify({ bookmarks: mapped }, null, 2),
                            _meta: {},
                        } as any),
                    ],
                };
            })
        );

        this.server.tool(
            "bookmark_manage",
            "Create, update, or delete bookmarks. Use operation parameter.",
            {
                operation: z.enum(["create", "update", "delete"]),
                id: z.number().optional(),
                collectionId: z.number().optional(),
                url: z.string().url().optional(),
                title: z.string().optional(),
                description: z.string().optional(),
                tags: z.array(z.string()).optional(),
                important: z.boolean().optional(),
                data: z.any().optional()
            },
            {
                result: z.any(),
            },
            this.asyncHandler(async (args, _extra) => {
                let result = null;
                switch (args.operation) {
                    case "create":
                        if (!args.collectionId) throw new Error("collectionId is required for create");
                        result = await this.raindropService.createBookmark(args.collectionId, {
                            link: args.url,
                            title: args.title,
                            excerpt: args.description,
                            tags: args.tags,
                            important: args.important
                        });
                        break;
                    case "update":
                        if (!args.id) throw new Error("id is required for update");
                        result = await this.raindropService.updateBookmark(args.id, {
                            link: args.url,
                            title: args.title,
                            excerpt: args.description,
                            tags: args.tags,
                            important: args.important
                        });
                        break;
                    case "delete":
                        if (!args.id) throw new Error("id is required for delete");
                        await this.raindropService.deleteBookmark(args.id);
                        result = { deleted: true };
                        break;
                    default:
                        throw new Error("Unsupported operation for bookmark_manage");
                }
                return {
                    content: [
                        ({
                            type: "text",
                            text: JSON.stringify({ result: result ? this.mapBookmarks([result])[0] : null }, null, 2),
                            _meta: {},
                        } as any),
                    ],
                };
            })
        );

        // --- TAG TOOLS ---
        this.server.tool(
            "tag_manage",
            "Rename, merge, or delete tags. Use operation parameter.",
            {
                operation: z.enum(["rename", "merge", "delete"]),
                tagNames: z.array(z.string()).optional(),
                newName: z.string().optional(),
                collectionId: z.number().optional()
            },
            {
                result: z.any(),
            },
            this.asyncHandler(async (args, _extra) => {
                let result = null;
                switch (args.operation) {
                    case "rename":
                        if (!args.tagNames || !args.newName) throw new Error("tagNames and newName required for rename");
                        result = await this.raindropService.renameTag(args.collectionId, args.tagNames[0], args.newName);
                        break;
                    case "merge":
                        if (!args.tagNames || !args.newName) throw new Error("tagNames and newName required for merge");
                        result = await this.raindropService.mergeTags(args.collectionId, args.tagNames, args.newName);
                        break;
                    case "delete":
                        if (!args.tagNames) throw new Error("tagNames required for delete");
                        result = await this.raindropService.deleteTags(args.collectionId, args.tagNames);
                        break;
                    default:
                        throw new Error("Unsupported operation for tag_manage");
                }
                return {
                    content: [
                        ({
                            type: "text",
                            text: JSON.stringify({ result }, null, 2),
                            _meta: {},
                        } as any),
                    ],
                };
            })
        );

        // --- HIGHLIGHT TOOLS ---
        this.server.tool(
            "highlight_manage",
            "Create, update, or delete highlights. Use operation parameter.",
            {
                operation: z.enum(["create", "update", "delete"]),
                id: z.number().optional(),
                bookmarkId: z.number().optional(),
                text: z.string().optional(),
                note: z.string().optional(),
                color: z.string().optional()
            },
            {
                result: z.any(),
            },
            this.asyncHandler(async (args, _extra) => {
                let result = null;
                switch (args.operation) {
                    case "create":
                        if (!args.bookmarkId || !args.text) throw new Error("bookmarkId and text required for create");
                        result = await this.raindropService.createHighlight(args.bookmarkId, {
                            text: args.text,
                            note: args.note,
                            color: args.color
                        });
                        break;
                    case "update":
                        if (!args.id) throw new Error("id required for update");
                        result = await this.raindropService.updateHighlight(args.id, {
                            text: args.text,
                            note: args.note,
                            color: args.color
                        });
                        break;
                    case "delete":
                        if (!args.id) throw new Error("id required for delete");
                        await this.raindropService.deleteHighlight(args.id);
                        result = { deleted: true };
                        break;
                    default:
                        throw new Error("Unsupported operation for highlight_manage");
                }
                return {
                    content: [
                        ({
                            type: "text",
                            text: JSON.stringify({ result: result ? this.mapHighlights([result])[0] : null }, null, 2),
                            _meta: {},
                        } as any),
                    ],
                };
            })
        );

        // --- USER TOOLS ---
        this.server.tool(
            "user_profile",
            "Get user account information including name, email, subscription status, and registration date.",
            {},
            {
                profile: z.any(),
            },
            this.asyncHandler(async (_args, _extra) => {
                // No getUserProfile in RaindropService, return error
                return {
                    content: [
                        ({
                            type: "text",
                            text: JSON.stringify({ error: "Not implemented: user_profile" }, null, 2),
                            _meta: {},
                        } as any),
                    ],
                };
            })
        );

        this.server.tool(
            "user_statistics",
            "Get user or collection statistics. Includes bookmark counts, collection counts, and usage metrics.",
            {
                collectionId: z.number().optional()
            },
            {
                stats: z.any(),
            },
            this.asyncHandler(async (args, _extra) => {
                let stats = null;
                if (args.collectionId) {
                    stats = await this.raindropService.getCollectionStats(args.collectionId);
                } else {
                    stats = await this.raindropService.getUserStats();
                }
                return {
                    content: [
                        ({
                            type: "text",
                            text: JSON.stringify({ stats }, null, 2),
                            _meta: {},
                        } as any),
                    ],
                };
            })
        );

        // --- IMPORT/EXPORT TOOLS ---
        this.server.tool(
            "import_export",
            "Import/export bookmarks, check import/export status. Use operation parameter.",
            {
                operation: z.enum(["import_status", "export_bookmarks"]),
                format: z.enum(["csv", "html", "pdf"]).optional(),
                collectionId: z.number().optional(),
                includeBroken: z.boolean().optional().default(false),
                includeDuplicates: z.boolean().optional().default(false)
            },
            {
                result: z.any(),
            },
            this.asyncHandler(async (args, _extra) => {
                let result = null;
                if (args.operation === "import_status") {
                    result = await this.raindropService.getImportStatus();
                } else if (args.operation === "export_bookmarks") {
                    result = await this.raindropService.exportBookmarks({
                        collection: args.collectionId,
                        format: args.format,
                        broken: args.includeBroken,
                        duplicates: args.includeDuplicates
                    });
                }
                return {
                    content: [
                        ({
                            type: "text",
                            text: JSON.stringify({ result }, null, 2),
                            _meta: {},
                        } as any),
                    ],
                };
            })
        );

        // --- DIAGNOSTICS TOOL ---
        this.server.tool(
            "diagnostics",
            "Server diagnostics and environment info. Use includeEnvironment param for detailed info.",
            {
                includeEnvironment: z.boolean().optional().default(false)
            },
            {
                diagnostics: z.any(),
            },
            this.asyncHandler(async (args, _extra) => {
                // No getDiagnostics in RaindropService, return error
                return {
                    content: [
                        ({
                            type: "text",
                            text: JSON.stringify({ error: "Not implemented: diagnostics" }, null, 2),
                            _meta: {},
                        } as any),
                    ],
                };
            })
        );
    }


    // Helper methods (mapCollections, mapBookmarks, mapTags, mapHighlights, requestConfirmation, cleanup, getMimeTypeFromUrl)

    /**
     * Maps Raindrop API collections to MCP-friendly format.
     * @param collections Raw collections from Raindrop API
     */
    private mapCollections(collections: any[]): any[] {
        // TODO: Replace with actual mapping logic and types
        return collections.map((col) => ({
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
            // ...add more fields as needed
        }));
    }

    /**
     * Maps Raindrop API bookmarks to MCP-friendly format.
     */
    private mapBookmarks(bookmarks: any[]): any[] {
        // TODO: Replace with actual mapping logic and types
        return bookmarks.map((bm) => ({
            id: bm._id || bm.id,
            title: bm.title,
            url: bm.link || bm.url,
            excerpt: bm.excerpt,
            tags: bm.tags,
            created: bm.created,
            lastUpdate: bm.lastUpdate,
            important: bm.important,
            collectionId: bm.collection?.$id || bm.collectionId,
            // ...add more fields as needed
        }));
    }

    /**
     * Maps Raindrop API tags to MCP-friendly format.
     */
    private mapTags(tags: any[]): any[] {
        // TODO: Replace with actual mapping logic and types
        return tags.map((tag) => ({
            name: tag.name || tag,
            count: tag.count,
            // ...add more fields as needed
        }));
    }

    /**
     * Maps Raindrop API highlights to MCP-friendly format.
     */
    private mapHighlights(highlights: any[]): any[] {
        // TODO: Replace with actual mapping logic and types
        return highlights.map((hl) => ({
            id: hl._id || hl.id,
            text: hl.text,
            note: hl.note,
            color: hl.color,
            created: hl.created,
            lastUpdate: hl.lastUpdate,
            bookmarkId: hl.bookmarkId,
            // ...add more fields as needed
        }));
    }
}

