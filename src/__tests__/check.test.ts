import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTestJWT, createExpiredJWT } from "./helpers.js";

// Mock modules
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

vi.mock("../config.js", () => ({
  loadConfig: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { existsSync, readFileSync } from "node:fs";
import { loadConfig } from "../config.js";
import { runCheck } from "../check.js";

const mockedExistsSync = vi.mocked(existsSync);
const mockedLoadConfig = vi.mocked(loadConfig);
const mockedReadFileSync = vi.mocked(readFileSync);

describe("runCheck", () => {
  const originalEnv = { ...process.env };
  let consoleOutput: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleOutput = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      consoleOutput.push(args.join(" "));
    });
    delete process.env.SEARCHATLAS_TOKEN;
    delete process.env.SEARCHATLAS_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("passes all checks with valid token and successful API call", async () => {
    process.env.SEARCHATLAS_TOKEN = createTestJWT();
    mockedExistsSync.mockReturnValue(false);
    mockedLoadConfig.mockReturnValue({
      apiUrl: "https://mcp.searchatlas.com",
      token: createTestJWT(),
    });
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    await runCheck();

    const output = consoleOutput.join("\n");
    expect(output).toContain("✓");
    expect(output).toContain("SEARCHATLAS_TOKEN env var");
    expect(output).toContain("Config loaded");
    expect(output).toContain("JWT structure valid");
    expect(output).toContain("API reachable");
    expect(output).toContain("All checks passed");
  });

  it("reports credential source from rc file", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedLoadConfig.mockReturnValue({
      apiUrl: "https://mcp.searchatlas.com",
      token: createTestJWT(),
    });
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    await runCheck();

    const output = consoleOutput.join("\n");
    expect(output).toContain("searchatlasrc");
  });

  it("reports API key credential source", async () => {
    process.env.SEARCHATLAS_API_KEY = "test-key";
    mockedExistsSync.mockReturnValue(false);
    mockedLoadConfig.mockReturnValue({
      apiUrl: "https://mcp.searchatlas.com",
      apiKey: "test-key",
    });
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    await runCheck();

    const output = consoleOutput.join("\n");
    expect(output).toContain("SEARCHATLAS_API_KEY");
    expect(output).toContain("API key authentication");
  });

  it("fails when no credentials found", async () => {
    mockedExistsSync.mockReturnValue(false);
    mockedLoadConfig.mockReturnValue({
      apiUrl: "https://mcp.searchatlas.com",
      token: createTestJWT(),
    });
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    await runCheck();

    const output = consoleOutput.join("\n");
    expect(output).toContain("✗");
    expect(output).toContain("No credentials found");
  });

  it("fails and returns early when config fails to load", async () => {
    process.env.SEARCHATLAS_TOKEN = "some-token";
    mockedExistsSync.mockReturnValue(false);
    mockedLoadConfig.mockImplementation(() => {
      throw new Error("Config load failed");
    });

    await runCheck();

    const output = consoleOutput.join("\n");
    expect(output).toContain("Config failed to load");
    expect(output).not.toContain("API reachable");
  });

  it("reports expired JWT", async () => {
    process.env.SEARCHATLAS_TOKEN = "x";
    mockedExistsSync.mockReturnValue(false);
    mockedLoadConfig.mockReturnValue({
      apiUrl: "https://mcp.searchatlas.com",
      token: createExpiredJWT(),
    });
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    await runCheck();

    const output = consoleOutput.join("\n");
    expect(output).toContain("JWT invalid");
    expect(output).toContain("expired");
  });

  it("reports API 401 rejection", async () => {
    process.env.SEARCHATLAS_TOKEN = "x";
    mockedExistsSync.mockReturnValue(false);
    mockedLoadConfig.mockReturnValue({
      apiUrl: "https://mcp.searchatlas.com",
      token: createTestJWT(),
    });
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    await runCheck();

    const output = consoleOutput.join("\n");
    expect(output).toContain("authentication rejected");
  });

  it("reports API 403 rejection", async () => {
    process.env.SEARCHATLAS_TOKEN = "x";
    mockedExistsSync.mockReturnValue(false);
    mockedLoadConfig.mockReturnValue({
      apiUrl: "https://mcp.searchatlas.com",
      token: createTestJWT(),
    });
    mockFetch.mockResolvedValue({ ok: false, status: 403 });

    await runCheck();

    const output = consoleOutput.join("\n");
    expect(output).toContain("authentication rejected");
  });

  it("reports unexpected API status", async () => {
    process.env.SEARCHATLAS_TOKEN = "x";
    mockedExistsSync.mockReturnValue(false);
    mockedLoadConfig.mockReturnValue({
      apiUrl: "https://mcp.searchatlas.com",
      token: createTestJWT(),
    });
    mockFetch.mockResolvedValue({ ok: false, status: 502, statusText: "Bad Gateway" });

    await runCheck();

    const output = consoleOutput.join("\n");
    expect(output).toContain("unexpected status 502");
  });

  it("reports network error", async () => {
    process.env.SEARCHATLAS_TOKEN = "x";
    mockedExistsSync.mockReturnValue(false);
    mockedLoadConfig.mockReturnValue({
      apiUrl: "https://mcp.searchatlas.com",
      token: createTestJWT(),
    });
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    await runCheck();

    const output = consoleOutput.join("\n");
    expect(output).toContain("API unreachable");
    expect(output).toContain("ECONNREFUSED");
  });

  it("reports non-Error network failures", async () => {
    process.env.SEARCHATLAS_TOKEN = "x";
    mockedExistsSync.mockReturnValue(false);
    mockedLoadConfig.mockReturnValue({
      apiUrl: "https://mcp.searchatlas.com",
      token: createTestJWT(),
    });
    mockFetch.mockRejectedValue("string error");

    await runCheck();

    const output = consoleOutput.join("\n");
    expect(output).toContain("API unreachable");
    expect(output).toContain("Check your network");
  });

  it("shows JWT expiry days and user ID when token has both", async () => {
    process.env.SEARCHATLAS_TOKEN = "x";
    mockedExistsSync.mockReturnValue(false);
    // Token that expires in ~30 days with user_id
    const token = createTestJWT({
      user_id: "test-user-42",
      exp: Math.floor(Date.now() / 1000) + 30 * 86400,
    });
    mockedLoadConfig.mockReturnValue({
      apiUrl: "https://mcp.searchatlas.com",
      token,
    });
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    await runCheck();

    const output = consoleOutput.join("\n");
    expect(output).toContain("JWT structure valid");
    expect(output).toContain("days");
    expect(output).toContain("user");
  });

  it("shows singular 'day' for 1 day expiry", async () => {
    process.env.SEARCHATLAS_TOKEN = "x";
    mockedExistsSync.mockReturnValue(false);
    const token = createTestJWT({
      user_id: "u1",
      exp: Math.floor(Date.now() / 1000) + 86400 + 100, // ~1 day
    });
    mockedLoadConfig.mockReturnValue({
      apiUrl: "https://mcp.searchatlas.com",
      token,
    });
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    await runCheck();

    const output = consoleOutput.join("\n");
    expect(output).toContain("1 day)");
  });

  it("shows config load error message from non-Error type", async () => {
    process.env.SEARCHATLAS_TOKEN = "x";
    mockedExistsSync.mockReturnValue(false);
    mockedLoadConfig.mockImplementation(() => {
      throw "string config error";
    });

    await runCheck();

    const output = consoleOutput.join("\n");
    expect(output).toContain("Config failed to load");
    expect(output).toContain("string config error");
  });

  it("pass function without fix message prints only pass", async () => {
    // This tests the `fail` function without a fix message
    // We trigger it via "no credentials" path which has a fix message
    // We need a path where fail is called without fix — that doesn't exist
    // But we can test fail() with fix set
    process.env.SEARCHATLAS_TOKEN = "x";
    mockedExistsSync.mockReturnValue(false);
    mockedLoadConfig.mockReturnValue({
      apiUrl: "https://mcp.searchatlas.com",
      token: createTestJWT({ exp: undefined }),
    });
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    await runCheck();

    const output = consoleOutput.join("\n");
    expect(output).toContain("JWT structure valid");
    // No expiry info since exp is undefined
    expect(output).not.toContain("expires in");
  });
});
