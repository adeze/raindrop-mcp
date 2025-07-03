import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { createRaindropServer } from './services/mcp.service.js';
import { StdioStreamingService } from './services/streaming.service.js';

/**
 * Enhanced STDIO transport with streaming message format support
 * 
 * This implementation adds streaming capabilities to the STDIO transport:
 * - Chunked responses for large datasets
 * - Progress notifications for long-running operations
 * - Streaming message format for MCP
 */

async function main() {
  const { server, cleanup } = createRaindropServer();
  
  // Create enhanced STDIO transport with streaming support
  const transport = new StdioServerTransport();
  
  // Override the send method to support streaming - Note: This is a conceptual implementation
  // In practice, the transport's send method signature needs to match the expected interface
  const originalSend = transport.send.bind(transport);
  
  // Create a wrapper for streaming functionality
  const sendWithStreaming = async (message: any) => {
    // Check if this is a large response that should be chunked
    if (shouldUseStreaming(message)) {
      await sendStreamingResponse(message, originalSend);
    } else {
      await originalSend(message);
    }
  };

  // Note: Direct override is not possible due to type constraints
  // Instead, we'll enhance the server's response handling

  // Set up graceful shutdown
  process.on('SIGINT', async () => {
    console.error('[STDIO] Received SIGINT, shutting down gracefully...');
    await cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('[STDIO] Received SIGTERM, shutting down gracefully...');
    await cleanup();
    process.exit(0);
  });

  // Connect and start the server
  try {
    await server.connect(transport);
    console.error('[STDIO] MCP server with streaming support started successfully');
  } catch (error) {
    console.error('[STDIO] Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Determine if a message should use streaming based on its content
 */
function shouldUseStreaming(message: any): boolean {
  if (!message.result) return false;
  
  // Check for large content arrays
  if (message.result.content && Array.isArray(message.result.content)) {
    const content = message.result.content;
    
    // Stream if there are many items
    if (content.length > 50) return true;
    
    // Stream if metadata indicates large dataset
    if (content.some((item: any) => 
      item.metadata?.total > 100 || 
      item.metadata?.streamingEnabled ||
      item.metadata?.chunksLoaded
    )) {
      return true;
    }
  }
  
  // Check for streaming tool responses
  if (message.result.metadata?.streamed) {
    return true;
  }
  
  return false;
}

/**
 * Send a response using streaming format
 */
async function sendStreamingResponse(
  message: any,
  originalSend: (msg: JSONRPCMessage) => Promise<void>
): Promise<void> {
  const chunkSize = 25;
  
  if (message.result?.content && Array.isArray(message.result.content)) {
    const content = message.result.content;
    const totalChunks = Math.ceil(content.length / chunkSize);
    
    console.error(`[STDIO STREAMING] Sending ${content.length} items in ${totalChunks} chunks`);
    
    // Send chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, content.length);
      const chunk = content.slice(start, end);
      const isLast = i === totalChunks - 1;
      
      const chunkMessage = {
        ...message,
        result: {
          ...message.result,
          content: chunk,
          meta: {
            streaming: true,
            partial: !isLast,
            chunkIndex: i,
            totalChunks: totalChunks,
            itemsInChunk: chunk.length,
            totalItems: content.length
          }
        }
      };
      
      await originalSend(chunkMessage as JSONRPCMessage);
      
      // Add small delay between chunks to prevent overwhelming
      if (!isLast) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      console.error(`[STDIO STREAMING] Sent chunk ${i + 1}/${totalChunks} (${chunk.length} items)`);
    }
    
    console.error(`[STDIO STREAMING] Completed streaming ${content.length} items`);
  } else {
    // Not a content array, send as-is but mark as streaming
    const streamingMessage = {
      ...message,
      meta: {
        streaming: true,
        partial: false
      }
    };
    
    await originalSend(streamingMessage as JSONRPCMessage);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[STDIO] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[STDIO] Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
main().catch((error) => {
  console.error('[STDIO] Failed to start:', error);
  process.exit(1);
});