// External imports
import { OpenAI } from 'openai';
import { z } from 'zod';
import type { MCPResponse } from '../types/mcp';

// Internal imports

/**
 * Zod schema for OpenAI ChatGPT request
 */
export const chatRequestSchema = z.object({
  model: z.string().default('gpt-3.5-turbo'),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })).min(1, { message: "At least one message is required" }),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(1).max(4096).optional(),
});

/**
 * Zod schema for OpenAI ChatGPT response
 */
export const chatResponseSchema = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number(),
  choices: z.array(z.object({
    index: z.number(),
    message: z.object({
      role: z.string(),
      content: z.string(),
    }),
    finish_reason: z.string().optional(),
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }).optional(),
});

export interface ChatRequest extends z.infer<typeof chatRequestSchema> {}
export interface ChatResponse extends z.infer<typeof chatResponseSchema> {}

// Remove module-level cache
function getOpenAIClient(apiKey: string): OpenAI {
  // Always instantiate a new client to respect test mocks
  return new OpenAI({ apiKey });
}

// Defensive MCPError factory for protocol-compliant error responses
export function MCPError(message: string): { success: false; error: string } {
  return { success: false, error: message };
}

/**
 * Sends a chat message to OpenAI's ChatGPT API and returns the response.
 * @param request ChatRequest object
 * @param apiKey OpenAI API key
 * @returns ChatResponse object
 */
export async function sendChatMessage(
  request: ChatRequest,
  apiKey: string
): Promise<MCPResponse<ChatResponse> | { success: false; error: string }> {
  try {
    const validatedRequest = chatRequestSchema.parse(request);
    const openai = getOpenAIClient(apiKey);

    // Defensive: Ensure the client structure matches expectations
    if (
      !openai ||
      !('chat' in openai) ||
      !openai.chat ||
      !('completions' in openai.chat) ||
      !openai.chat.completions ||
      typeof openai.chat.completions.create !== 'function'
    ) {
      throw new Error(
        'OpenAI client is not properly initialized or does not match expected structure. ' +
        'Check your OpenAI library version and test mocks.'
      );
    }

    const response = await openai.chat.completions.create({
      model: validatedRequest.model,
      messages: validatedRequest.messages,
      temperature: validatedRequest.temperature,
      max_tokens: validatedRequest.max_tokens,
    });
    const validatedResponse = chatResponseSchema.parse(response);
    return { success: true, data: validatedResponse };
  } catch (error: any) {
    // Always return protocol-compliant error response
    return MCPError(`OpenAI API error: ${error?.message || error}`);
  }
}

/**
 * Documentation:
 * - Set your OpenAI API key in your environment and pass it to sendChatMessage.
 * - Uses official OpenAI library for API calls.
 * - Use MCPResponse and MCPError for protocol-compliant responses.
 * - See MCP protocol docs for stdio transport and tool integration.
 */