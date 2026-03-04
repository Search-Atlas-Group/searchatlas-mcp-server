import { describe, it, expect } from "vitest";
import { sanitizeToken, validateToken } from "../../utils/token.js";
import { createTestJWT, createExpiredJWT } from "../helpers.js";

describe("sanitizeToken", () => {
  it("returns null for null/undefined", () => {
    expect(sanitizeToken(null)).toBeNull();
    expect(sanitizeToken(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(sanitizeToken("")).toBeNull();
    expect(sanitizeToken("   ")).toBeNull();
  });

  it("returns null for literal 'null' and 'undefined'", () => {
    expect(sanitizeToken("null")).toBeNull();
    expect(sanitizeToken("undefined")).toBeNull();
  });

  it("strips surrounding double quotes", () => {
    expect(sanitizeToken('"my-token"')).toBe("my-token");
  });

  it("strips surrounding single quotes", () => {
    expect(sanitizeToken("'my-token'")).toBe("my-token");
  });

  it("trims whitespace", () => {
    expect(sanitizeToken("  my-token  ")).toBe("my-token");
  });

  it("strips quotes and trims combined", () => {
    expect(sanitizeToken('  "my-token"  ')).toBe("my-token");
  });

  it("returns valid token as-is", () => {
    expect(sanitizeToken("abc123")).toBe("abc123");
  });

  it("handles non-matching quotes (not stripped)", () => {
    expect(sanitizeToken("'mixed\"")).toBe("'mixed\"");
  });
});

describe("validateToken", () => {
  it("returns invalid for empty/null input", () => {
    const result = validateToken(null);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("returns invalid for non-JWT string", () => {
    const result = validateToken("not-a-jwt");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("JWT");
  });

  it("returns invalid for 2-part token", () => {
    const result = validateToken("part1.part2");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("JWT");
  });

  it("returns invalid for 4-part token", () => {
    const result = validateToken("a.b.c.d");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("JWT");
  });

  it("returns valid for a well-formed JWT", () => {
    const token = createTestJWT();
    const result = validateToken(token);
    expect(result.valid).toBe(true);
    expect(result.token).toBe(token);
    expect(result.userId).toBe("42");
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it("extracts numeric user_id", () => {
    const token = createTestJWT({ user_id: 999 });
    const result = validateToken(token);
    expect(result.valid).toBe(true);
    expect(result.userId).toBe("999");
  });

  it("returns valid for JWT without exp claim", () => {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ user_id: "10" })).toString("base64url");
    const token = `${header}.${payload}.sig`;

    const result = validateToken(token);
    expect(result.valid).toBe(true);
    expect(result.expiresAt).toBeUndefined();
  });

  it("returns invalid for expired JWT", () => {
    const token = createExpiredJWT();
    const result = validateToken(token);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("expired");
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.token).toBe(token);
  });

  it("returns invalid for malformed base64 payload", () => {
    const result = validateToken("valid.!!!invalid-base64!!!.sig");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("malformed");
  });

  it("sanitizes quoted input before validation", () => {
    const token = createTestJWT();
    const result = validateToken(`"${token}"`);
    expect(result.valid).toBe(true);
    expect(result.token).toBe(token);
  });
});
