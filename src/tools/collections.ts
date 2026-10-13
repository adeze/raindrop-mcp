import { z } from "zod";
import { ValidationError } from "../types/mcpErrors.js";
import { CollectionManageInputSchema } from "../types/raindrop-zod.schemas.js";
import type { ToolHandlerContext } from "./common.js";
import {
  requireConfirmation,
  defineTool,
  makeCollectionLink,
  setIfDefined,
  textContent,
} from "./common.js";

const CollectionListInputSchema = z.object({
  skipCache: z
    .boolean()
    .optional()
    .describe("Force a fresh fetch from the API, bypassing the local cache"),
});

const CollectionListOutputSchema = z.object({
  count: z.number(),
  collections: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      count: z.number(),
      description: z.string().optional(),
    }),
  ),
});

const CollectionSummarySchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  parentId: z.number().optional(),
});

const CollectionManageOutputSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("delete"), deleted: z.literal(true) }),
  z.object({
    operation: z.enum(["create", "update"]),
    collection: CollectionSummarySchema,
  }),
]);

const collectionSummary = (collection: any) => ({
  id: collection._id,
  title: collection.title || "Untitled Collection",
  description: collection.description || undefined,
  color: collection.color || undefined,
  parentId: collection.parent?.$id,
});

type CollectionManageArgs = z.infer<typeof CollectionManageInputSchema> & {
  color?: string;
  description?: string;
};

const collectionListTool = defineTool({
  name: "collection_list",
  annotations: { readOnlyHint: true, destructiveHint: false },
  description: "Lists all Raindrop.io collections as a flat list.",
  inputSchema: CollectionListInputSchema,
  outputSchema: CollectionListOutputSchema,
  handler: async (
    args: z.infer<typeof CollectionListInputSchema>,
    { raindropService }: ToolHandlerContext,
  ) => {
    const collections = await raindropService.getCollections(args.skipCache);
    const content = [
      textContent(`Found ${collections.length} collections`),
      ...collections.map(makeCollectionLink),
    ];
    return {
      content,
      structuredContent: {
        count: collections.length,
        collections: collections.map((collection) => ({
          ...collectionSummary(collection),
          count: collection.count || 0,
        })),
      },
    };
  },
});

const getCollectionTreeTool = defineTool({
  name: "get_collection_tree",
  annotations: { readOnlyHint: true, destructiveHint: false },
  description:
    "Returns a hierarchical view of all collections with full breadcrumb paths.",
  inputSchema: z.object({
    skipCache: z
      .boolean()
      .optional()
      .describe("Force a fresh fetch from the API, bypassing the local cache"),
  }),
  handler: async (
    args: { skipCache?: boolean },
    { raindropService }: ToolHandlerContext,
  ) => {
    const tree = await raindropService.getCollectionTree(args.skipCache);

    const formatNode = (node: any, indent = 0): string => {
      let result =
        "  ".repeat(indent) +
        `- ${node.title} (ID: ${node._id}, Path: ${node.path}, Items: ${node.count || 0})\n`;
      if (node.children && node.children.length > 0) {
        node.children.forEach((child: any) => {
          result += formatNode(child, indent + 1);
        });
      }
      return result;
    };

    let resultText = "Collection Hierarchy:\n";
    tree.forEach((node) => {
      resultText += formatNode(node);
    });

    return {
      content: [textContent(resultText)],
    };
  },
});

const collectionManageTool = defineTool({
  name: "collection_manage",
  annotations: { readOnlyHint: false, destructiveHint: true },
  description:
    "Creates, updates, or deletes a collection. Use the operation parameter to specify the action.",
  inputSchema: CollectionManageInputSchema,
  outputSchema: CollectionManageOutputSchema,
  handler: async (
    args: CollectionManageArgs,
    { raindropService }: ToolHandlerContext,
  ) => {
    switch (args.operation) {
      case "create": {
        if (!args.title)
          throw new ValidationError("title is required for create");
        const collection = await raindropService.createCollection(args.title);
        return {
          content: [textContent(`Created collection: ${collection.title}`)],
          structuredContent: {
            operation: "create" as const,
            collection: collectionSummary(collection),
          },
        };
      }
      case "update": {
        if (!args.id) throw new ValidationError("id is required for update");
        const updatePayload: Record<string, unknown> = {};
        setIfDefined(updatePayload, "title", args.title);
        setIfDefined(updatePayload, "color", args.color);
        setIfDefined(updatePayload, "description", args.description);
        const collection = await raindropService.updateCollection(
          args.id,
          updatePayload as any,
        );
        return {
          content: [textContent(`Updated collection: ${collection.title}`)],
          structuredContent: {
            operation: "update" as const,
            collection: collectionSummary(collection),
          },
        };
      }
      case "delete": {
        requireConfirmation(args.confirm);
        if (!args.id) throw new ValidationError("id is required for delete");
        await raindropService.deleteCollection(args.id);
        return {
          content: [textContent(`Deleted collection ${args.id}`)],
          structuredContent: { operation: "delete" as const, deleted: true },
        };
      }
      default:
        throw new ValidationError(
          `Unsupported operation: ${String(args.operation)}`,
        );
    }
  },
});

export const collectionTools = [
  collectionListTool,
  getCollectionTreeTool,
  collectionManageTool,
];
