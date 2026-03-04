import { describe, it, expect } from "vitest";
import { getAuthHeaders } from "../../utils/auth.js";

describe("getAuthHeaders", () => {
  it("includes Content-Type header always", () => {
    const headers = getAuthHeaders({ apiUrl: "https://example.com" });
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("uses Bearer token when token is provided", () => {
    const headers = getAuthHeaders({
      apiUrl: "https://example.com",
      token: "my-jwt-token",
    });
    expect(headers["Authorization"]).toBe("Bearer my-jwt-token");
    expect(headers["X-API-Key"]).toBeUndefined();
  });

  it("uses X-API-Key when only apiKey is provided", () => {
    const headers = getAuthHeaders({
      apiUrl: "https://example.com",
      apiKey: "my-api-key",
    });
    expect(headers["X-API-Key"]).toBe("my-api-key");
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("prefers token over apiKey when both are present", () => {
    const headers = getAuthHeaders({
      apiUrl: "https://example.com",
      token: "my-jwt",
      apiKey: "my-key",
    });
    expect(headers["Authorization"]).toBe("Bearer my-jwt");
    expect(headers["X-API-Key"]).toBeUndefined();
  });

  it("returns only Content-Type when no auth credentials", () => {
    const headers = getAuthHeaders({ apiUrl: "https://example.com" });
    expect(Object.keys(headers)).toEqual(["Content-Type"]);
  });
});
