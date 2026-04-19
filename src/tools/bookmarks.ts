import { z } from "zod";
import { ValidationError } from "../types/mcpErrors.js";
import {
  BookmarkInputSchema,
  BookmarkOutputSchema,
} from "../types/raindrop-zod.schemas.js";
import type { ToolHandlerContext } from "./common.js";
import {
  defineTool,
  makeBookmarkLink,
  setIfDefined,
  textContent,
} from "./common.js";

const BookmarkSearchInputSchema = z.object({
  search: z.string().optional().describe("Full-text search query"),
  collection: z.number().optional().describe("Collection ID to search within"),
  tags: z.array(z.string()).optional().describe("Tags to filter by"),
  important: z.boolean().optional().describe("Filter by important bookmarks"),
  page: z.number().optional().describe("Page number for pagination"),
  perPage: z.number().optional().describe("Items per page (max 50)"),
  sort: z
    .string()
    .optional()
    .describe("Sort order (score, title, -created, created)"),
  tag: z.string().optional().describe("Single tag to filter by"),
  duplicates: z.boolean().optional().describe("Include duplicate bookmarks"),
  broken: z.boolean().optional().describe("Include broken links"),
  notag: z.boolean().optional().describe("Filter by items without tags"),
  highlight: z.boolean().optional().describe("Only bookmarks with highlights"),
  domain: z.string().optional().describe("Filter by domain"),
  createdStart: z
    .string()
    .optional()
    .describe("Filter by creation date (start, ISO 8601)"),
  createdEnd: z
    .string()
    .optional()
    .describe("Filter by creation date (end, ISO 8601)"),
  media: z
    .enum(["link", "article", "image", "video", "document", "audio"])
    .optional()
    .describe("Filter by media type"),
  skipCache: z
    .boolean()
    .optional()
    .describe("Force a fresh fetch from the API, bypassing the local cache"),
});

const BookmarkSearchOutputSchema = z.object({
  items: z.array(BookmarkOutputSchema),
  count: z.number(),
});

const BookmarkManageInputSchema = BookmarkInputSchema.extend({
  operation: z.enum(["create", "update", "delete"]),
  id: z.number().optional(),
});

const GetRaindropInputSchema = z.object({
  id: z.string().min(1, "Bookmark ID is required"),
  skipCache: z
    .boolean()
    .optional()
    .describe("Force a fresh fetch from the API, bypassing the local cache"),
});

const GetRaindropOutputSchema = z.object({
  item: BookmarkOutputSchema,
});

const ListRaindropsInputSchema = z.object({
  collectionId: z
    .number()
    .describe("Collection ID to list bookmarks from (use 0 for All)"),
  page: z.number().optional().describe("Page number for pagination"),
  perPage: z.number().optional().describe("Items per page (max 50)"),
  sort: z.string().optional().describe("Sort order"),
  skipCache: z
    .boolean()
    .optional()
    .describe("Force a fresh fetch from the API, bypassing the local cache"),
});

const ListRaindropsOutputSchema = z.object({
  items: z.array(BookmarkOutputSchema),
  count: z.number(),
});

const bookmarkSearchTool = defineTool({
  name: "bookmark_search",
  description:
    "Searches bookmarks with advanced filters, tags, and full-text search.",
  inputSchema: BookmarkSearchInputSchema,
  outputSchema: BookmarkSearchOutputSchema,
  handler: async (
    args: z.infer<typeof BookmarkSearchInputSchema>,
    { raindropService }: ToolHandlerContext,
  ) => {
    const query: Record<string, unknown> = {};
    setIfDefined(query, "search", args.search);
    setIfDefined(query, "collection", args.collection);
    setIfDefined(query, "tags", args.tags);
    setIfDefined(query, "important", args.important);
    setIfDefined(query, "page", args.page);
    setIfDefined(query, "perPage", args.perPage);
    setIfDefined(query, "sort", args.sort);
    setIfDefined(query, "tag", args.tag);
    setIfDefined(query, "duplicates", args.duplicates);
    setIfDefined(query, "broken", args.broken);
    setIfDefined(query, "notag", args.notag);
    setIfDefined(query, "highlight", args.highlight);
    setIfDefined(query, "domain", args.domain);
    setIfDefined(query, "createdStart", args.createdStart);
    setIfDefined(query, "createdEnd", args.createdEnd);
    setIfDefined(query, "media", args.media);

    const result = await raindropService.getBookmarks(
      query as any,
      args.skipCache,
    );

    const content = [textContent(`Found ${result.count} bookmarks`)];
    result.items.forEach((bookmark: any) => {
      content.push(makeBookmarkLink(bookmark));
    });

    return { content };
  },
});

const bookmarkManageTool = defineTool({
  name: "bookmark_manage",
  description:
    "Creates, updates, or deletes bookmarks. Use the operation parameter to specify the action.",
  inputSchema: BookmarkManageInputSchema,
  outputSchema: BookmarkOutputSchema,
  handler: async (
    args: z.infer<typeof BookmarkManageInputSchema>,
    { raindropService }: ToolHandlerContext,
  ) => {
    switch (args.operation) {
      case "create": {
        if (!args.collectionId)
          throw new Error("collectionId is required for create");
        const createPayload: Record<string, unknown> = {
          link: args.url,
          title: args.title,
        };
        setIfDefined(createPayload, "excerpt", args.description);
        setIfDefined(createPayload, "tags", args.tags);
        setIfDefined(createPayload, "important", args.important);
        return raindropService.createBookmark(
          args.collectionId,
          createPayload as any,
        );
      }
      case "update": {
        if (!args.id) throw new ValidationError("id is required for update");
        const updatePayload: Record<string, unknown> = {
          link: args.url,
          title: args.title,
        };
        setIfDefined(updatePayload, "excerpt", args.description);
        setIfDefined(updatePayload, "tags", args.tags);
        setIfDefined(updatePayload, "important", args.important);
        // Raindrop API expects collection moves as a nested object.
        // See: https://developer.raindrop.io/v1/raindrops/single#update-raindrop
        if (args.collectionId !== undefined) {
          updatePayload.collection = { $id: args.collectionId };
        }
        return raindropService.updateBookmark(args.id, updatePayload as any);
      }
      case "delete": {
        if (!args.id) throw new ValidationError("id is required for delete");
        await raindropService.deleteBookmark(args.id);
        return { deleted: true };
      }
      default:
        throw new ValidationError(
          `Unsupported operation: ${String(args.operation)}`,
        );
    }
  },
});

const getRaindropTool = defineTool({
  name: "get_raindrop",
  description: "Fetch a single Raindrop.io bookmark by ID.",
  inputSchema: GetRaindropInputSchema,
  outputSchema: GetRaindropOutputSchema,
  handler: async (
    args: z.infer<typeof GetRaindropInputSchema>,
    { raindropService }: ToolHandlerContext,
  ) => {
    const bookmark = await raindropService.getBookmark(
      parseInt(args.id),
      args.skipCache,
    );
    return { content: [makeBookmarkLink(bookmark)] };
  },
});

const listRaindropsTool = defineTool({
  name: "list_raindrops",
  description: "List Raindrop.io bookmarks for a collection with pagination.",
  inputSchema: ListRaindropsInputSchema,
  outputSchema: ListRaindropsOutputSchema,
  handler: async (
    args: z.infer<typeof ListRaindropsInputSchema>,
    { raindropService }: ToolHandlerContext,
  ) => {
    const result = await raindropService.getBookmarks(
      {
        collection: args.collectionId,
        page: args.page,
        perPage: args.perPage || 50,
        sort: args.sort,
      },
      args.skipCache,
    );

    const content = [
      textContent(
        `Page ${args.page || 0} - Found ${result.items.length} bookmarks (Total: ${result.count})`,
      ),
    ];
    result.items.forEach((bookmark: any) =>
      content.push(makeBookmarkLink(bookmark)),
    );

    return { content };
  },
});

export const bookmarkTools = [
  bookmarkSearchTool,
  bookmarkManageTool,
  getRaindropTool,
  listRaindropsTool,
];
