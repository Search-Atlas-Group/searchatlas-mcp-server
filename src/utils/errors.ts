/**
 * Error types and MCP-friendly formatter
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class AuthError extends ApiError {
  constructor(
    message = "Authentication failed. Your token may be expired or invalid.\n\n" +
      "To fix this, run:\n" +
      "  npx searchatlas-mcp-server login"
  ) {
    super(message, 401, "Unauthorized");
    this.name = "AuthError";
  }
}

/** Format any error into an MCP-safe text response. */
export function formatError(error: unknown): string {
  if (error instanceof ApiError) {
    return `[${error.status}] ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
