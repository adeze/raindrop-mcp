import { z } from "zod";
import { ValidationError } from "../types/mcpErrors.js";
import { TagInputSchema } from "../types/raindrop-zod.schemas.js";
import type { ToolHandlerContext } from "./common.js";
import { requireConfirmation, defineTool, textContent } from "./common.js";

const TagOutputSchema = z.object({
  operation: z.enum(["rename", "merge", "delete"]),
  tags: z.array(z.string()),
  replacement: z.string().optional(),
  success: z.literal(true),
});

const tagManageTool = defineTool({
  name: "tag_manage",
  annotations: { readOnlyHint: false, destructiveHint: true },
  description:
    "Renames, merges, or deletes tags. Use the operation parameter to specify the action.",
  inputSchema: TagInputSchema,
  outputSchema: TagOutputSchema,
  handler: async (
    args: z.infer<typeof TagInputSchema>,
    { raindropService }: ToolHandlerContext,
  ) => {
    switch (args.operation) {
      case "rename": {
        if (!args.tagNames || !args.newName)
          throw new ValidationError("tagNames and newName required for rename");
        const [primaryTag] = args.tagNames;
        if (!primaryTag)
          throw new ValidationError("tagNames must include at least one value");
        await raindropService.renameTag(
          args.collectionId,
          primaryTag,
          args.newName!,
        );
        return {
          content: [
            textContent(`Renamed tag ${primaryTag} to ${args.newName}`),
          ],
          structuredContent: {
            operation: "rename" as const,
            tags: [primaryTag],
            replacement: args.newName,
            success: true,
          },
        };
      }
      case "merge": {
        if (!args.tagNames || !args.newName)
          throw new ValidationError("tagNames and newName required for merge");
        await raindropService.mergeTags(
          args.collectionId,
          args.tagNames,
          args.newName!,
        );
        return {
          content: [
            textContent(
              `Merged ${args.tagNames.length} tags into ${args.newName}`,
            ),
          ],
          structuredContent: {
            operation: "merge" as const,
            tags: args.tagNames,
            replacement: args.newName,
            success: true,
          },
        };
      }
      case "delete": {
        requireConfirmation(args.confirm);
        if (!args.tagNames)
          throw new ValidationError("tagNames required for delete");
        await raindropService.deleteTags(args.collectionId, args.tagNames);
        return {
          content: [textContent(`Deleted ${args.tagNames.length} tags`)],
          structuredContent: {
            operation: "delete" as const,
            tags: args.tagNames,
            success: true,
          },
        };
      }
      default:
        throw new ValidationError(
          `Unsupported operation: ${String(args.operation)}`,
        );
    }
  },
});

export const tagTools = [tagManageTool];
