/**
 * Token sanitization and JWT validation utilities.
 *
 * - sanitizeToken()  — strips quotes, trims whitespace, rejects garbage
 * - validateToken()  — structural JWT check + expiry inspection
 */

export interface TokenValidationResult {
  valid: boolean;
  token?: string;
  error?: string;
  expiresAt?: Date;
  userId?: string;
}

/**
 * Strip surrounding quotes, trim whitespace, and reject obvious garbage
 * values (`null`, `undefined`, empty string) that slip through copy-paste.
 */
export function sanitizeToken(raw: string | undefined | null): string | null {
  if (raw == null) return null;

  let cleaned = String(raw).trim();

  // Strip surrounding single or double quotes (copy-paste artifact)
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Reject literal "null" / "undefined" / empty
  if (!cleaned || cleaned === "null" || cleaned === "undefined") {
    return null;
  }

  return cleaned;
}

/**
 * Validate a raw token string: sanitize it, check JWT structure,
 * decode the payload, and inspect the `exp` claim.
 */
export function validateToken(raw: string | undefined | null): TokenValidationResult {
  const token = sanitizeToken(raw);

  if (!token) {
    return { valid: false, error: "Token is empty or missing." };
  }

  // JWT must have exactly 3 dot-separated parts
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, error: "Not a valid JWT — expected header.payload.signature format." };
  }

  // Decode payload (middle part) — base64url → JSON
  try {
    const payloadB64 = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const payloadJson = Buffer.from(payloadB64, "base64").toString("utf-8");
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;

    const result: TokenValidationResult = { valid: true, token };

    // Extract user ID if present
    if (typeof payload.user_id === "string" || typeof payload.user_id === "number") {
      result.userId = String(payload.user_id);
    }

    // Check expiry
    if (typeof payload.exp === "number") {
      const expiresAt = new Date(payload.exp * 1000);
      result.expiresAt = expiresAt;

      if (expiresAt.getTime() < Date.now()) {
        return {
          valid: false,
          token,
          error: `Token expired on ${expiresAt.toLocaleDateString()} at ${expiresAt.toLocaleTimeString()}.`,
          expiresAt,
          userId: result.userId,
        };
      }
    }

    return result;
  } catch {
    return { valid: false, error: "Failed to decode JWT payload — token appears malformed." };
  }
}
