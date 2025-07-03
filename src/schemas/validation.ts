import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { AnyToolResponseSchema } from "./output.js";

/**
 * Tool Output Validation Utilities
 * 
 * Provides functions to validate tool outputs and generate schema metadata
 * for MCP tools. This ensures consistent response structure and enables
 * automatic validation and documentation of tool outputs.
 */

/**
 * Validates a tool output against the appropriate schema
 * @param output - The output to validate
 * @param schema - Optional specific schema to validate against
 * @returns The validated output
 * @throws Error if validation fails
 */
export function validateToolOutput<T>(
  output: unknown,
  schema?: z.ZodSchema<T>
): T {
  try {
    if (schema) {
      return schema.parse(output);
    }
    return AnyToolResponseSchema.parse(output) as T;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Tool output validation failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Generates JSON schema metadata for a zod schema
 * @param schema - The zod schema to convert
 * @param title - Optional title for the schema
 * @returns JSON schema object
 */
export function generateSchemaMetadata(
  schema: z.ZodSchema,
  title?: string
): Record<string, any> {
  return zodToJsonSchema(schema, {
    name: title,
    errorMessages: true,
    markdownDescription: true
  });
}

/**
 * Creates enhanced tool metadata with output schema information
 * @param outputSchema - The output schema for the tool
 * @param category - The category of the tool (e.g., 'collections', 'bookmarks')
 * @param isStreaming - Whether the tool supports streaming output
 * @returns Enhanced metadata object
 */
export function createToolMetadata(
  outputSchema: z.ZodSchema,
  category: string,
  isStreaming: boolean = false
): Record<string, any> {
  const metadata: Record<string, any> = {
    category,
    outputSchema: generateSchemaMetadata(outputSchema, `${category}Output`),
    hasValidation: true
  };

  if (isStreaming) {
    metadata.streaming = {
      supported: true,
      chunkSchema: generateSchemaMetadata(
        z.object({
          type: z.literal("text"),
          text: z.string(),
          metadata: z.object({
            chunkIndex: z.number(),
            isComplete: z.boolean(),
            totalChunks: z.number().optional()
          })
        })
      )
    };
  }

  return metadata;
}

/**
 * Wrapper function that validates tool output and handles errors gracefully
 * @param fn - The tool function to wrap
 * @param schema - The output schema to validate against
 * @returns Wrapped function with validation
 */
export function withOutputValidation<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  schema: z.ZodSchema<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const result = await fn(...args);
    return validateToolOutput(result, schema);
  };
}

/**
 * Creates a validated tool handler with automatic output validation
 * @param handler - The original tool handler
 * @param outputSchema - The schema to validate outputs against
 * @returns A wrapped handler with validation
 */
export function createValidatedToolHandler<T extends Record<string, any>, R>(
  handler: (params: T) => Promise<R>,
  outputSchema: z.ZodSchema<R>
): (params: T) => Promise<R> {
  return withOutputValidation(handler, outputSchema);
}

/**
 * Utility to safely create tool response with validation
 * @param content - The content array
 * @param metadata - Optional metadata
 * @param schema - Optional schema to validate against
 * @returns Validated tool response
 */
export function createToolResponse<T>(
  content: Array<{
    type: "text";
    text: string;
    metadata?: Record<string, any>;
  }>,
  metadata?: Record<string, any>,
  schema?: z.ZodSchema<T>
): T {
  const response = {
    content,
    ...(metadata && { metadata })
  };

  if (schema) {
    return validateToolOutput(response, schema);
  }

  return response as T;
}