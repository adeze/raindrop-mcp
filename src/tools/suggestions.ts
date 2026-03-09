import { z } from "zod";
import type { ToolHandlerContext } from "./common.js";
import { defineTool, textContent } from "./common.js";

const GetSuggestionsInputSchema = z.object({
  url: z.string().url().optional().describe("URL to get suggestions for"),
  raindropId: z
    .number()
    .optional()
    .describe("Existing bookmark ID to get suggestions for"),
  useAi: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether to use MCP Sampling to ask the AI for refined advice"),
});

/**
 * Tool to get organization suggestions for a URL or existing bookmark.
 * Combines Raindrop.io's built-in suggestions with optional AI sampling.
 */
const getSuggestionsTool = defineTool({
  name: "get_suggestions",
  description:
    "Get AI-powered suggestions for tags and collections for a specific URL or existing bookmark.",
  inputSchema: GetSuggestionsInputSchema,
  handler: async (
    args: z.infer<typeof GetSuggestionsInputSchema>,
    { raindropService, mcpReq }: ToolHandlerContext,
  ) => {
    const target = args.raindropId || args.url;
    if (!target) {
      throw new Error("Either 'url' or 'raindropId' must be provided.");
    }

    // 1. Get base suggestions from Raindrop API
    const baseSuggestions = await raindropService.getSuggestions(target);

    let resultText = "Raindrop.io Suggestions:\n";
    if (baseSuggestions.item) {
      const item = baseSuggestions.item;
      if (item.tags && item.tags.length > 0) {
        resultText += `- Recommended Tags: ${item.tags.join(", ")}\n`;
      }
      if (item.collections && item.collections.length > 0) {
        resultText += `- Recommended Collections: ${item.collections.map((c: any) => `${c.title} (ID: ${c._id})`).join(", ")}\n`;
      }
    } else {
      resultText += "No specific suggestions found from Raindrop.io.\n";
    }

    // 2. Optional: Use MCP Sampling to get "Refined" advice from the assistant
    if (args.useAi && mcpReq) {
      try {
        const samplingResult = await mcpReq.requestSampling({
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Analyze this ${args.raindropId ? "bookmark" : "URL"} and provide 3-5 very specific, professional tags and the most logical category/collection for it. 
                ${args.raindropId ? `Bookmark ID: ${args.raindropId}` : `URL: ${args.url}`}
                Initial Suggestions: ${resultText}`,
              },
            },
          ],
          modelPreferences: {
            hints: [{ name: "claude-3-5-sonnet" }, { name: "gpt-4o" }],
          },
          systemPrompt:
            "You are an expert at information architecture and personal knowledge management. Provide concise, high-value organization advice.",
        });

        if (samplingResult && samplingResult.content) {
          const content = samplingResult.content;
          const advice =
            content.type === "text" ? content.text : JSON.stringify(content);
          resultText += `\nRefined AI Advice:\n${advice}`;
        }
      } catch (_err) {
        // Fallback gracefully if sampling is not supported by client or fails
        resultText +=
          "\n(Note: Refined AI advice was unavailable, using base suggestions only.)";
      }
    }

    return {
      content: [textContent(resultText)],
    };
  },
});

/**
 * Tool to suggest tags for a bookmark using AI sampling.
 */
const suggestTagsTool = defineTool({
  name: "suggest_tags",
  description:
    "Uses AI to suggest relevant tags based on bookmark metadata (title, URL, description).",
  inputSchema: z.object({
    url: z.string().url().describe("The URL of the bookmark"),
    title: z.string().describe("The title of the bookmark"),
    description: z.string().optional().describe("The description/excerpt"),
  }),
  handler: async (
    args: { url: string; title: string; description?: string },
    { mcpReq }: ToolHandlerContext,
  ) => {
    if (!mcpReq) {
      return {
        content: [
          textContent(
            "AI Sampling is not supported by the current client. Please provide tags manually.",
          ),
        ],
      };
    }

    try {
      const response = await mcpReq.requestSampling({
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please suggest 3-6 relevant, concise tags for this bookmark:
              Title: ${args.title}
              URL: ${args.url}
              Description: ${args.description || "N/A"}
              
              Return only a comma-separated list of tags.`,
            },
          },
        ],
        systemPrompt:
          "You are a helpful assistant that categorizes bookmarks. Suggest relevant, professional tags.",
      });

      const tags =
        response.content.type === "text"
          ? response.content.text
          : JSON.stringify(response.content);

      return {
        content: [
          textContent(`AI Suggested Tags for "${args.title}":\n${tags}`),
        ],
      };
    } catch (err: any) {
      return {
        content: [textContent(`Failed to get tag suggestions: ${err.message}`)],
      };
    }
  },
});

export const suggestionTools = [getSuggestionsTool, suggestTagsTool];
