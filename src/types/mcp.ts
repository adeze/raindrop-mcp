// MCP protocol response types

export interface MCPResponse<T> {
  success: true;
  data: T;
}

export interface MCPErrorResponse {
  success: false;
  error: string;
}

/**
 * Returns a standardized MCP error response
 * @param error Error message
 */
export function MCPError(error: string): MCPErrorResponse {
  return {
    success: false,
    error,
  };
}
