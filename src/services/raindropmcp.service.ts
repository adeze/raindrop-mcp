import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
    GetPromptRequestSchema,
    ListPromptsRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema,
    SubscribeRequestSchema,
    UnsubscribeRequestSchema,
    type Prompt,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import pkg from "../../package.json";
import { buildToolConfigs } from "../tools/index.js";
import {
    NotFoundError,
    UpstreamError,
    ValidationError,
} from "../types/mcpErrors.js";
import RaindropService from "./raindrop.service.js";

const SERVER_VERSION = pkg.version;

// Build tool configurations from modularized tool definitions
const { toolConfigs, getEnabledToolNames } = buildToolConfigs({
  serverVersion: SERVER_VERSION,
});

// --- MCP Server class ---
/**
 * Main MCP server implementation for Raindrop.io.
 * Wraps the MCP SDK server and exposes Raindrop tools/resources.
 * @see {@link https://github.com/modelcontextprotocol/typescript-sdk | MCP TypeScript SDK}
 * @see McpServer
 */
export class RaindropMCPService {
  private server: McpServer;
  public raindropService: RaindropService;
  private resources: Record<string, any> = {};
  private resourceSubscriptions: Set<string> = new Set(); // Track resource subscriptions
  private prompts: Array<
    Prompt & {
      messages?: Array<{ role: string; content: string }>;
    }
  > = [
    {
      name: "organize_by_topic",
      description:
        "Analyze titles/excerpts and suggest collections + tags for organization.",
      messages: [
        {
          role: "system",
          content:
            "You are a bookmarking assistant that organizes Raindrop.io items by topic and intent. Propose concise collection moves and tag sets.",
        },
        {
          role: "user",
          content:
            "Given a list of bookmarks, propose a target collection and 3-6 tags per item.",
        },
      ],
    },
    {
      name: "find_duplicates",
      description:
        "Identify potential duplicate bookmarks using URL + title similarity.",
      messages: [
        {
          role: "system",
          content:
            "You detect duplicate bookmarks. Consider URL normalization, title similarity, and canonical forms. Return suspected duplicate pairs.",
        },
      ],
    },
    {
      name: "export_markdown",
      description:
        "Render bookmarks as Markdown list with title, link, tags, and excerpt.",
      messages: [
        {
          role: "system",
          content:
            "Format bookmarks as markdown bullet list: [Title](URL) — excerpt — tags: tag1, tag2.",
        },
      ],
    },
  ];

  /**
   * Expose the MCP server instance for external control (e.g., connect, close).
   */
  public getServer() {
    return this.server;
  }

  /**
   * Expose a cleanup method for graceful shutdown (no-op by default).
   * Extend as needed for resource cleanup.
   */
  public async cleanup() {
    // Add any additional cleanup logic here if needed
  }

  /**
   * Returns the MCP manifest and server capabilities for host integration and debugging.
   * Uses the SDK's getManifest() method if available, otherwise builds a manifest from registered tools/resources.
   */
  public async getManifest(): Promise<unknown> {
    if (typeof (this.server as any).getManifest === "function") {
      return (this.server as any).getManifest();
    }
    // Fallback: build manifest manually
    return {
      name: "raindrop-mcp",
      version: SERVER_VERSION,
      description:
        "MCP Server for Raindrop.io with advanced interactive capabilities",
      capabilities: (this.server as any).capabilities,
      tools: await this.listTools(),
      // Optionally add resources, schemas, etc.
    };
  }

  constructor() {
    try {
      this.raindropService = new RaindropService();
      this.server = new McpServer({
        name: "raindrop-mcp",
        version: SERVER_VERSION,
        description:
          "MCP Server for Raindrop.io with advanced interactive capabilities",
      });

      // CRITICAL: Register capabilities FIRST before registering handlers
      // The SDK needs to know what capabilities are enabled before setting handlers
      this.server.server.registerCapabilities({
        logging: {},
        resources: { subscribe: true, listChanged: true },
        prompts: { listChanged: true },
        tools: { listChanged: true },
        experimental: {
          elicitation: {
            supported: true,
            description:
              "Destructive and ambiguous actions require confirmation or clarification.",
          },
        },
      });

      this.registerDeclarativeTools();
      this.registerResources();
      this.registerResourceHandlers();
      this.registerPromptHandlers();
    } catch (err) {
      console.error("Failed to initialize RaindropMCPService:", err);
      throw err;
    }
  }

  private asyncHandler<T extends (...args: any[]) => Promise<any>>(fn: T): T {
    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      try {
        return await fn(...args);
      } catch (err) {
        if (err instanceof Error) throw err;
        throw new Error(String(err));
      }
    }) as T;
  }

  private registerDeclarativeTools() {
    for (const config of toolConfigs) {
      this.server.registerTool(
        config.name,
        {
          title: config.name
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          description: config.description,
          inputSchema: (config.inputSchema as z.ZodObject<any>).shape,
        },
        this.asyncHandler(async (args: any, extra: any) =>
          config.handler(args, {
            raindropService: this.raindropService,
            ...extra,
          }),
        ),
      );
    }
  }

  private registerResources() {
    // Register static resources only (user profile and diagnostics)
    this.resources["mcp://user/profile"] = {
      contents: [
        {
          uri: "mcp://user/profile",
          text: JSON.stringify(
            { profile: "User profile information from Raindrop.io" },
            null,
            2,
          ),
        },
      ],
    };

    this.resources["diagnostics://server"] = {
      contents: [
        {
          uri: "diagnostics://server",
          text: JSON.stringify(
            {
              diagnostics: "Server diagnostics and environment info",
              version: SERVER_VERSION,
              timestamp: new Date().toISOString(),
            },
            null,
            2,
          ),
        },
      ],
    };

    // Note: Collection and raindrop resources are now handled dynamically
    // in readResource() method - no pre-registration needed
  }

  private registerResourceHandlers() {
    this.server.server.setRequestHandler(
      ListResourcesRequestSchema,
      this.asyncHandler(async () => ({
        resources: this.listResources(),
      })),
    );

    this.server.server.setRequestHandler(
      ReadResourceRequestSchema,
      this.asyncHandler(async (request: any) => {
        const contents = await this.readResource(request.params.uri);
        return { contents };
      }),
    );

    // Add resource subscription handlers for protocol 2025-11-25
    this.server.server.setRequestHandler(
      SubscribeRequestSchema,
      this.asyncHandler(async (request: any) => {
        const { uri } = request.params;
        this.resourceSubscriptions.add(uri);
        return {}; // Empty object indicates successful subscription
      }),
    );

    this.server.server.setRequestHandler(
      UnsubscribeRequestSchema,
      this.asyncHandler(async (request: any) => {
        const { uri } = request.params;
        this.resourceSubscriptions.delete(uri);
        return {}; // Empty object indicates successful unsubscription
      }),
    );
  }

  private registerPromptHandlers() {
    this.server.server.setRequestHandler(
      ListPromptsRequestSchema,
      this.asyncHandler(async () => ({
        prompts: this.prompts,
      })),
    );

    this.server.server.setRequestHandler(
      GetPromptRequestSchema,
      this.asyncHandler(async (request: any) => {
        const prompt = this.prompts.find((p) => p.name === request.params.name);
        if (!prompt)
          throw new NotFoundError(`Prompt ${request.params.name} not found`);
        return { prompt };
      }),
    );
  }

  /**
   * Returns a list of all registered MCP tools with their metadata.
   */
  public async listTools(): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      inputSchema: unknown;
      outputSchema: unknown;
    }>
  > {
    // Return all registered tools from the MCP server, ensuring each has a description
    const tools = ((this.server as any)._tools || []).map((tool: any) => ({
      id: tool.id || tool.name,
      name: tool.name,
      description: tool.description || "",
      inputSchema: tool.inputSchema || {},
      outputSchema: tool.outputSchema || {},
    }));

    // Also include tools from our toolConfigs if the server's _tools is empty
    if (tools.length === 0) {
      return toolConfigs.map((config) => ({
        id: config.name,
        name: config.name
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        description: config.description,
        inputSchema: config.inputSchema,
        outputSchema: config.outputSchema || {},
      }));
    }

    return tools.filter((tool: any) => tool.description);
  }

  /**
   * Call a registered tool by its ID with the given input.
   * @param toolId - The tool's ID
   * @param input - Input object for the tool
   * @returns Tool response
   */
  public async callTool(toolId: string, input: any): Promise<any> {
    const tool = (this.server as any)._tools?.find((t: any) => t.id === toolId);
    if (!tool || typeof tool.handler !== "function") {
      throw new Error(`Tool with id "${toolId}" not found or has no handler.`);
    }
    // Defensive: ensure input is always an object
    return await tool.handler(input ?? {}, {});
  }

  /**
   * Reads an MCP resource by URI using the public API.
   * Supports both static pre-registered resources and dynamic resources.
   *
   * @param uri - The resource URI to read.
   * @returns The resource contents as an array of objects with uri and text.
   * @throws Error if the resource is not found or not readable.
   */
  public async readResource(
    uri: string,
  ): Promise<Array<{ uri: string; text: string }>> {
    if (!uri) {
      throw new ValidationError("Resource URI is required");
    }

    try {
      if (uri.startsWith("mcp://collection/")) {
        const collectionIdStr = uri.split("/").pop();
        if (!collectionIdStr) {
          throw new ValidationError("Collection ID is required");
        }

        const collectionId = Number.parseInt(collectionIdStr, 10);
        if (Number.isNaN(collectionId)) {
          throw new ValidationError(
            `Invalid collection ID: ${collectionIdStr}`,
          );
        }

        const collection =
          await this.raindropService.getCollection(collectionId);
        return [
          {
            uri,
            text: JSON.stringify({ collection }, null, 2),
          },
        ];
      }

      if (uri.startsWith("mcp://raindrop/")) {
        const raindropIdStr = uri.split("/").pop();
        if (!raindropIdStr) {
          throw new ValidationError("Raindrop ID is required");
        }

        const raindropId = Number.parseInt(raindropIdStr, 10);
        if (Number.isNaN(raindropId)) {
          throw new ValidationError(`Invalid raindrop ID: ${raindropIdStr}`);
        }

        const raindrop = await this.raindropService.getBookmark(raindropId);
        return [
          {
            uri,
            text: JSON.stringify({ raindrop }, null, 2),
          },
        ];
      }

      if (uri === "mcp://user/profile") {
        const userInfo = await this.raindropService.getUserInfo();
        return [
          {
            uri,
            text: JSON.stringify({ profile: userInfo }, null, 2),
          },
        ];
      }
    } catch (error) {
      if (
        error instanceof ValidationError ||
        error instanceof NotFoundError ||
        error instanceof UpstreamError
      ) {
        throw error;
      }

      throw new UpstreamError(
        `Failed to fetch data for resource ${uri}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const resource = this.resources[uri] as
      | { contents: Array<{ uri: string; text: string }> }
      | undefined;
    if (resource?.contents) {
      return resource.contents;
    }

    throw new NotFoundError(
      `Resource with uri "${uri}" not found or not readable.`,
    );
  }

  /**
   * Returns a list of all available MCP resources with their metadata.
   * Includes both static pre-registered resources and dynamic resource patterns.
   */
  public listResources(): Array<{
    id: string;
    uri: string;
    title?: string;
    description?: string;
    mimeType?: string;
  }> {
    const serverResources = ((this.server as any)._resources || []).map(
      (r: any) => ({
        id: r.id || r.uri,
        uri: r.uri,
        title: r.title,
        description: r.description,
        mimeType: r.mimeType,
      }),
    );

    // Include our static resources and dynamic resource patterns
    const staticResources = Object.keys(this.resources).map((uri) => ({
      id: uri,
      uri,
      title: `Resource ${uri}`,
      description: `MCP resource for ${uri}`,
      mimeType: "application/json",
    }));

    // Add dynamic resource patterns for documentation
    const dynamicResourcePatterns = [
      {
        id: "mcp://collection/{id}",
        uri: "mcp://collection/{id}",
        title: "Collection Resource Pattern",
        description:
          "Access any Raindrop collection by ID (e.g., mcp://collection/123456)",
        mimeType: "application/json",
      },
      {
        id: "mcp://raindrop/{id}",
        uri: "mcp://raindrop/{id}",
        title: "Raindrop Resource Pattern",
        description:
          "Access any Raindrop bookmark by ID (e.g., mcp://raindrop/987654)",
        mimeType: "application/json",
      },
    ];

    // Combine all resources: server resources, static resources, and dynamic patterns
    return [...serverResources, ...staticResources, ...dynamicResourcePatterns];
  }

  /**
   * Returns true if the MCP server is healthy and ready.
   */
  public async healthCheck(): Promise<boolean> {
    // Optionally, check connectivity to Raindrop.io or other dependencies
    return true;
  }

  /**
   * Returns basic server info (name, version, description).
   */
  public getInfo(): { name: string; version: string; description: string } {
    return {
      name: "raindrop-mcp-server",
      version: SERVER_VERSION,
      description:
        "MCP Server for Raindrop.io with advanced interactive capabilities",
    };
  }
}
