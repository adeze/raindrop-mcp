import { z } from "zod";
import { ValidationError } from "../types/mcpErrors.js";
import {
    TagInputSchema,
    TagOutputSchema,
} from "../types/raindrop-zod.schemas.js";
import type { ToolHandlerContext } from "./common.js";
import { defineTool } from "./common.js";

const tagManageTool = defineTool({
  name: "tag_manage",
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
        return raindropService.renameTag(
          args.collectionId,
          primaryTag,
          args.newName!,
        );
      }
      case "merge": {
        if (!args.tagNames || !args.newName)
          throw new ValidationError("tagNames and newName required for merge");
        return raindropService.mergeTags(
          args.collectionId,
          args.tagNames,
          args.newName!,
        );
      }
      case "delete": {
        if (!args.tagNames)
          throw new ValidationError("tagNames required for delete");
        return raindropService.deleteTags(args.collectionId, args.tagNames);
      }
      default:
        throw new ValidationError(
          `Unsupported operation: ${String(args.operation)}`,
        );
    }
  },
});

export const tagTools = [tagManageTool];
