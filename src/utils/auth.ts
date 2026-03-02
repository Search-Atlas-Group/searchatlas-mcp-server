/**
 * Auth header builder
 * Constructs the correct authentication headers based on available credentials.
 */

import type { Config } from "../config.js";

export function getAuthHeaders(config: Config): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.token) {
    headers["Authorization"] = `Bearer ${config.token}`;
  } else if (config.apiKey) {
    headers["X-API-Key"] = config.apiKey;
  }

  return headers;
}
