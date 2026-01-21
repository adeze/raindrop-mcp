import { z } from "zod";
import { defineTool } from "./common.js";
import type { ToolHandlerContext } from "./common.js";

const BulkEditRaindropsInputSchema = z.object({
  collectionId: z.number().describe("Collection to update raindrops in"),
  ids: z
    .array(z.number())
    .optional()
    .describe(
      "Array of raindrop IDs to update. If omitted, all in collection are updated.",
    ),
  important: z.boolean().optional().describe("Mark as favorite (true/false)"),
  tags: z
    .array(z.string())
    .optional()
    .describe("Tags to set. Empty array removes all tags."),
  media: z
    .array(z.string())
    .optional()
    .describe("Media URLs to set. Empty array removes all media."),
  cover: z
    .string()
    .optional()
    .describe("Cover URL. Use <screenshot> for auto screenshot."),
  collection: z
    .object({ $id: z.number() })
    .optional()
    .describe("Move to another collection."),
  nested: z.boolean().optional().describe("Include nested collections."),
});

const BulkEditRaindropsOutputSchema = z.object({
  content: z.array(
    z.object({
      type: z.string(),
      text: z.string(),
    }),
  ),
});

const bulkEditRaindropsTool = defineTool({
  name: "bulk_edit_raindrops",
  description:
    "Bulk update tags, favorite status, media, cover, or move bookmarks to another collection.",
  inputSchema: BulkEditRaindropsInputSchema,
  outputSchema: BulkEditRaindropsOutputSchema,
  handler: async (
    args: z.infer<typeof BulkEditRaindropsInputSchema>,
    _context?: ToolHandlerContext,
  ) => {
    const body: Record<string, unknown> = {};
    if (args.ids) body.ids = args.ids;
    if (args.important !== undefined) body.important = args.important;
    if (args.tags) body.tags = args.tags;
    if (args.media) body.media = args.media;
    if (args.cover) body.cover = args.cover;
    if (args.collection) body.collection = args.collection;
    if (args.nested !== undefined) body.nested = args.nested;

    const url = `https://api.raindrop.io/rest/v1/raindrops/${args.collectionId}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as {
      result: boolean;
      errorMessage?: string;
      modified?: number;
    };
    if (!result.result) {
      throw new Error(result.errorMessage || "Bulk edit failed");
    }

    return {
      content: [
        {
          type: "text",
          text: `Updated ${result.modified ?? "unknown number of"} raindrops in collection ${args.collectionId}`,
        },
      ],
    };
  },
});

export const bulkTools = [bulkEditRaindropsTool];
