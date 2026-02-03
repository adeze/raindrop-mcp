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
      type: "resource_link";
      name: string;
      uri: string;
      description: string;
      mimeType: string;
      _meta?: Record<string, unknown>;
    };

export const defineTool = <I, O>(config: ToolConfig<I, O>) => config;

export const textContent = (text: string): McpContent => ({
  type: "text",
  text,
});

export const makeCollectionLink = (collection: any): McpContent => ({
  type: "resource_link",
  uri: `mcp://collection/${collection._id}`,
  name: collection.title || "Untitled Collection",
  description:
    collection.description ||
    `Collection with ${collection.count || 0} bookmarks`,
  mimeType: "application/json",
});

export const makeBookmarkLink = (bookmark: any): McpContent => ({
  type: "resource_link",
  uri: `mcp://raindrop/${bookmark._id}`,
  name: bookmark.title || "Untitled",
  description: bookmark.excerpt || "No description",
  mimeType: "application/json",
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
