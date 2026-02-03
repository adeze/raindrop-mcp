import { z } from "zod";
import RaindropService from "../services/raindrop.service.js";

export interface ToolHandlerContext {
  raindropService: RaindropService;
  [key: string]: unknown;
}

export interface ToolConfig<I = unknown, O = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  outputSchema?: z.ZodTypeAny;
  handler: (args: I, context: ToolHandlerContext) => Promise<O>;
  execution?: {
    taskSupport?: "supported" | "forbidden";
  };
}

export type McpContent =
  | { type: "text"; text: string; _meta?: Record<string, unknown> }
  | {
      type: "resource";
      resource: {
        uri: string;
        mimeType?: string;
        text?: string;
      };
    };

export const defineTool = <I, O>(config: ToolConfig<I, O>) => config;

export const textContent = (text: string): McpContent => ({
  type: "text",
  text,
});

export const makeCollectionLink = (collection: any): McpContent => ({
  type: "resource",
  resource: {
    uri: `mcp://collection/${collection._id}`,
    mimeType: "application/json",
    text: JSON.stringify(
      {
        _id: collection._id,
        title: collection.title || "Untitled Collection",
        count: collection.count || 0,
        description: collection.description,
      },
      null,
      2,
    ),
  },
});

export const makeBookmarkLink = (bookmark: any): McpContent => ({
  type: "resource",
  resource: {
    uri: `mcp://raindrop/${bookmark._id}`,
    mimeType: "application/json",
    text: JSON.stringify(
      {
        _id: bookmark._id,
        title: bookmark.title || "Untitled",
        link: bookmark.link,
        excerpt: bookmark.excerpt,
        tags: bookmark.tags,
      },
      null,
      2,
    ),
  },
});

export const setIfDefined = (
  target: Record<string, unknown>,
  key: string,
  value: unknown,
) => {
  if (value !== undefined) {
    target[key] = value;
  }
  return target;
};
