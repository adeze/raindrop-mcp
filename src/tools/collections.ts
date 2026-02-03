import { z } from "zod";
import { ValidationError } from "../types/mcpErrors.js";
import {
    CollectionManageInputSchema,
    CollectionOutputSchema,
} from "../types/raindrop-zod.schemas.js";
import type { ToolHandlerContext } from "./common.js";
import {
    defineTool,
    makeCollectionLink,
    setIfDefined,
    textContent,
} from "./common.js";

const CollectionListInputSchema = z.object({});

const CollectionListOutputSchema = z.object({
  content: z.array(
    z.object({
      type: z.string(),
      name: z.string().optional(),
      uri: z.string().optional(),
      description: z.string().optional(),
      mimeType: z.string().optional(),
      text: z.string().optional(),
    }),
  ),
});

type CollectionManageArgs = z.infer<typeof CollectionManageInputSchema> & {
  color?: string;
  description?: string;
};

const collectionListTool = defineTool({
  name: "collection_list",
  description: "Lists all Raindrop.io collections.",
  inputSchema: CollectionListInputSchema,
  outputSchema: CollectionListOutputSchema,
  handler: async (
    _args: z.infer<typeof CollectionListInputSchema>,
    { raindropService }: ToolHandlerContext,
  ) => {
    const collections = await raindropService.getCollections();
    const content = [
      textContent(`Found ${collections.length} collections`),
      ...collections.map(makeCollectionLink),
    ];
    return { content };
  },
});

const collectionManageTool = defineTool({
  name: "collection_manage",
  description:
    "Creates, updates, or deletes a collection. Use the operation parameter to specify the action.",
  inputSchema: CollectionManageInputSchema,
  outputSchema: CollectionOutputSchema,
  handler: async (
    args: CollectionManageArgs,
    { raindropService }: ToolHandlerContext,
  ) => {
    switch (args.operation) {
      case "create": {
        if (!args.title)
          throw new ValidationError("title is required for create");
        return raindropService.createCollection(args.title);
      }
      case "update": {
        if (!args.id) throw new ValidationError("id is required for update");
        const updatePayload: Record<string, unknown> = {};
        setIfDefined(updatePayload, "title", args.title);
        setIfDefined(updatePayload, "color", args.color);
        setIfDefined(updatePayload, "description", args.description);
        return raindropService.updateCollection(args.id, updatePayload as any);
      }
      case "delete": {
        if (!args.id) throw new ValidationError("id is required for delete");
        await raindropService.deleteCollection(args.id);
        return { deleted: true };
      }
      default:
        throw new ValidationError(
          `Unsupported operation: ${String(args.operation)}`,
        );
    }
  },
});

export const collectionTools = [collectionListTool, collectionManageTool];
