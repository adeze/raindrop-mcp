export class McpError extends Error {
  constructor(
    public code: string,
    message: string,
    public override cause?: unknown,
  ) {
    super(message);
    this.name = "McpError";
  }
}

export class NotFoundError extends McpError {
  constructor(message: string, cause?: unknown) {
    super("NOT_FOUND", message, cause);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends McpError {
  constructor(message: string, cause?: unknown) {
    super("VALIDATION_ERROR", message, cause);
    this.name = "ValidationError";
  }
}

export class AuthError extends McpError {
  constructor(message: string, cause?: unknown) {
    super("AUTH_ERROR", message, cause);
    this.name = "AuthError";
  }
}

export class RateLimitError extends McpError {
  constructor(message: string, cause?: unknown) {
    super("RATE_LIMITED", message, cause);
    this.name = "RateLimitError";
  }
}

export class UpstreamError extends McpError {
  constructor(message: string, cause?: unknown) {
    super("UPSTREAM_ERROR", message, cause);
    this.name = "UpstreamError";
  }
}

export type KnownMcpError =
  | NotFoundError
  | ValidationError
  | AuthError
  | RateLimitError
  | UpstreamError;
