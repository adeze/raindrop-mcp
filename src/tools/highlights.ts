import { z } from "zod";
import { ValidationError } from "../types/mcpErrors.js";
import { HighlightInputSchema } from "../types/raindrop-zod.schemas.js";
import type { ToolHandlerContext } from "./common.js";
import {
  requireConfirmation,
  defineTool,
  setIfDefined,
  textContent,
} from "./common.js";

const HighlightManageInputSchema = HighlightInputSchema.extend({
  operation: z.enum(["create", "update", "delete"]),
  id: z.number().optional(),
});

const HighlightOutputSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("delete"), deleted: z.literal(true) }),
  z.object({
    operation: z.enum(["create", "update"]),
    highlight: z.object({ id: z.string().optional(), text: z.string() }),
  }),
]);

const highlightManageTool = defineTool({
  name: "highlight_manage",
  annotations: { readOnlyHint: false, destructiveHint: true },
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
        const highlight = await raindropService.createHighlight(
          args.bookmarkId,
          createPayload as any,
        );
        return {
          content: [textContent("Created highlight")],
          structuredContent: {
            operation: "create" as const,
            highlight: { id: highlight._id, text: highlight.text },
          },
        };
      }
      case "update": {
        if (!args.id) throw new ValidationError("id required for update");
        const updatePayload: Record<string, unknown> = {};
        setIfDefined(updatePayload, "text", args.text);
        setIfDefined(updatePayload, "note", args.note);
        setIfDefined(updatePayload, "color", args.color);
        const highlight = await raindropService.updateHighlight(
          args.id,
          updatePayload as any,
        );
        return {
          content: [textContent("Updated highlight")],
          structuredContent: {
            operation: "update" as const,
            highlight: { id: highlight._id, text: highlight.text || args.text },
          },
        };
      }
      case "delete": {
        requireConfirmation(args.confirm);
        if (!args.id) throw new ValidationError("id required for delete");
        await raindropService.deleteHighlight(args.id);
        return {
          content: [textContent(`Deleted highlight ${args.id}`)],
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

export const highlightTools = [highlightManageTool];
