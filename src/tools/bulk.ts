import { z } from "zod";
import type { ToolHandlerContext } from "./common.js";
import { defineTool } from "./common.js";

const BulkEditRaindropsInputSchema = z.object({
  collectionId: z
    .number()
    .describe("Source collection ID where raindrops are currently located"),
  operation: z
    .enum(["update", "remove", "move"])
    .default("update")
    .describe("Action to perform"),
  toCollectionId: z
    .number()
    .optional()
    .describe("Target collection ID for 'move' operation"),
  ids: z
    .array(z.number())
    .optional()
    .describe(
      "Array of raindrop IDs. If omitted for update, all in collection may be affected. Required for remove and move.",
    ),
  important: z.boolean().optional().describe("Mark as favorite (true/false)"),
  tags: z
    .array(z.string())
    .optional()
    .describe("Tags to set. Empty array removes all tags."),
});

const bulkEditRaindropsTool = defineTool({
  name: "bulk_edit_raindrops",
  description:
    "Bulk update, move, or remove bookmarks in a specific collection.",
  inputSchema: BulkEditRaindropsInputSchema,
  handler: async (
    args: z.infer<typeof BulkEditRaindropsInputSchema>,
    { raindropService }: ToolHandlerContext,
  ) => {
    if (args.operation === "remove") {
      if (!args.ids || args.ids.length === 0) {
        throw new Error("IDs are required for remove operation");
      }
      const success = await raindropService.batchDeleteBookmarksInCollection(
        args.collectionId,
        args.ids,
      );
      return {
        content: [
          {
            type: "text",
            text: success
              ? `Successfully removed ${args.ids.length} bookmarks.`
              : "Failed to remove bookmarks.",
          },
        ],
      };
    }

    if (args.operation === "move") {
      if (!args.ids || args.ids.length === 0) {
        throw new Error("IDs are required for move operation");
      }
      if (args.toCollectionId === undefined) {
        throw new Error("toCollectionId is required for move operation");
      }

      // Moving is essentially a batch update of the collection ID
      const success = await raindropService.batchUpdateBookmarks(args.ids, {
        collection: args.toCollectionId,
      });

      return {
        content: [
          {
            type: "text",
            text: success
              ? `Successfully moved ${args.ids.length} bookmarks to collection ${args.toCollectionId}.`
              : "Failed to move bookmarks.",
          },
        ],
      };
    }

    // Default: update
    const updates: any = {
      ids: args.ids || [],
    };
    if (args.important !== undefined) updates.important = args.important;
    if (args.tags) updates.tags = args.tags;

    const success = await raindropService.batchUpdateBookmarksInCollection(
      args.collectionId,
      updates,
    );

    return {
      content: [
        {
          type: "text",
          text: success
            ? `Bulk update in collection ${args.collectionId} successful.`
            : "Bulk update failed.",
        },
      ],
    };
  },
});

export const bulkTools = [bulkEditRaindropsTool];
