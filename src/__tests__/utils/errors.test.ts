import { describe, it, expect } from "vitest";
import { ApiError, AuthError, formatError } from "../../utils/errors.js";

describe("ApiError", () => {
  it("creates an error with status", () => {
    const err = new ApiError("Not found", 404, "Not Found");
    expect(err.message).toBe("Not found");
    expect(err.status).toBe(404);
    expect(err.statusText).toBe("Not Found");
    expect(err.name).toBe("ApiError");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it("works without statusText", () => {
    const err = new ApiError("Server error", 500);
    expect(err.statusText).toBeUndefined();
  });
});

describe("AuthError", () => {
  it("creates a 401 error with default message", () => {
    const err = new AuthError();
    expect(err.status).toBe(401);
    expect(err.statusText).toBe("Unauthorized");
    expect(err.name).toBe("AuthError");
    expect(err.message).toContain("Authentication failed");
    expect(err).toBeInstanceOf(ApiError);
  });

  it("accepts a custom message", () => {
    const err = new AuthError("Custom auth error");
    expect(err.message).toBe("Custom auth error");
    expect(err.status).toBe(401);
  });
});

describe("formatError", () => {
  it("formats ApiError with status code", () => {
    const err = new ApiError("Not found", 404);
    expect(formatError(err)).toBe("[404] Not found");
  });

  it("formats AuthError with status code", () => {
    const err = new AuthError();
    expect(formatError(err)).toMatch(/^\[401\]/);
  });

  it("formats regular Error", () => {
    const err = new Error("Something went wrong");
    expect(formatError(err)).toBe("Something went wrong");
  });

  it("formats string errors", () => {
    expect(formatError("a string error")).toBe("a string error");
  });

  it("formats number errors", () => {
    expect(formatError(42)).toBe("42");
  });

  it("formats null/undefined", () => {
    expect(formatError(null)).toBe("null");
    expect(formatError(undefined)).toBe("undefined");
  });
});
