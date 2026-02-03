import { z } from "zod";
import { ValidationError } from "../types/mcpErrors.js";
import {
    HighlightInputSchema,
    HighlightOutputSchema,
} from "../types/raindrop-zod.schemas.js";
import type { ToolHandlerContext } from "./common.js";
import { defineTool, setIfDefined } from "./common.js";

const HighlightManageInputSchema = HighlightInputSchema.extend({
  operation: z.enum(["create", "update", "delete"]),
  id: z.number().optional(),
});

const highlightManageTool = defineTool({
  name: "highlight_manage",
  description:
    "Creates, updates, or deletes highlights. Use the operation parameter to specify the action.",
  inputSchema: HighlightManageInputSchema,
  outputSchema: HighlightOutputSchema,
  handler: async (
    args: z.infer<typeof HighlightManageInputSchema>,
    { raindropService }: ToolHandlerContext,
  ) => {
    switch (args.operation) {
      case "create": {
        if (!args.bookmarkId || !args.text)
          throw new ValidationError("bookmarkId and text required for create");
        const createPayload: Record<string, unknown> = { text: args.text };
        setIfDefined(createPayload, "note", args.note);
        setIfDefined(createPayload, "color", args.color);
        return raindropService.createHighlight(
          args.bookmarkId,
          createPayload as any,
        );
      }
      case "update": {
        if (!args.id) throw new ValidationError("id required for update");
        const updatePayload: Record<string, unknown> = {};
        setIfDefined(updatePayload, "text", args.text);
        setIfDefined(updatePayload, "note", args.note);
        setIfDefined(updatePayload, "color", args.color);
        return raindropService.updateHighlight(args.id, updatePayload as any);
      }
      case "delete": {
        if (!args.id) throw new ValidationError("id required for delete");
        await raindropService.deleteHighlight(args.id);
        return { deleted: true };
      }
      default:
        throw new ValidationError(
          `Unsupported operation: ${String(args.operation)}`,
        );
    }
  },
});

export const highlightTools = [highlightManageTool];
