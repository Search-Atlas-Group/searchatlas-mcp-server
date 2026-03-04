import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiRequest, streamAgentMessage } from "../../utils/api-client.js";
import { ApiError, AuthError } from "../../utils/errors.js";
import { createTestConfig } from "../helpers.js";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("apiRequest", () => {
  const config = createTestConfig();

  it("makes a GET request with auth headers", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [] }),
    });

    const data = await apiRequest(config, "/api/agent/projects/");
    expect(mockFetch).toHaveBeenCalledOnce();

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/agent/projects/");
    expect(opts.method).toBe("GET");
    expect(opts.headers["Authorization"]).toContain("Bearer");
    expect(data).toEqual({ results: [] });
  });

  it("appends query params", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await apiRequest(config, "/api/test/", {
      params: { page: "1", search: "hello", empty: "" },
    });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("page=1");
    expect(url).toContain("search=hello");
    expect(url).not.toContain("empty=");
  });

  it("sends POST with JSON body", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 1 }),
    });

    await apiRequest(config, "/api/test/", {
      method: "POST",
      body: { domain: "example.com" },
    });

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.method).toBe("POST");
    expect(opts.body).toBe(JSON.stringify({ domain: "example.com" }));
  });

  it("throws AuthError on 401", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    await expect(apiRequest(config, "/api/test/")).rejects.toThrow(AuthError);
  });

  it("throws AuthError on 403", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403 });

    await expect(apiRequest(config, "/api/test/")).rejects.toThrow(AuthError);
  });

  it("throws ApiError on other non-ok status", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "Something broke",
    });

    await expect(apiRequest(config, "/api/test/")).rejects.toThrow(ApiError);
  });

  it("throws ApiError with statusText when text() fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      text: async () => { throw new Error("read error"); },
    });

    const err = await apiRequest(config, "/api/test/").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(502);
  });

  it("handles 204 No Content", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => { throw new Error("no json"); },
    });

    const data = await apiRequest(config, "/api/test/");
    expect(data).toBeUndefined();
  });

  it("uses apiKey header when no token", async () => {
    const apiKeyConfig = { apiUrl: "https://mcp.searchatlas.com", apiKey: "test-key" };
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await apiRequest(apiKeyConfig, "/api/test/");
    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers["X-API-Key"]).toBe("test-key");
  });
});

describe("streamAgentMessage", () => {
  const config = createTestConfig();

  function createSSEStream(chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });
  }

  it("sends POST and collects SSE response", async () => {
    const sseData = [
      'data: {"content":"Hello "}\n\n',
      'data: {"content":"World"}\n\n',
      'data: {"is_complete":true}\n\n',
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      body: createSSEStream(sseData),
    });

    const result = await streamAgentMessage(config, "/api/agent/orchestrator/", {
      message: "test",
    });

    expect(result).toBe("Hello World");

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body);
    expect(body.message).toBe("test");
    expect(body.stream).toBe(true);
    expect(body.session_id).toBeDefined();
    expect(body.user_id).toBeDefined();
  });

  it("throws AuthError on 401", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    await expect(
      streamAgentMessage(config, "/api/agent/test/", { message: "hi" })
    ).rejects.toThrow(AuthError);
  });

  it("throws AuthError on 403", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403 });

    await expect(
      streamAgentMessage(config, "/api/agent/test/", { message: "hi" })
    ).rejects.toThrow(AuthError);
  });

  it("throws ApiError on non-ok status", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Server Error",
      text: async () => "error details",
    });

    await expect(
      streamAgentMessage(config, "/api/agent/test/", { message: "hi" })
    ).rejects.toThrow(ApiError);
  });

  it("throws ApiError when body is null", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      body: null,
    });

    await expect(
      streamAgentMessage(config, "/api/agent/test/", { message: "hi" })
    ).rejects.toThrow("Response body is empty");
  });

  it("throws ApiError on SSE error chunk", async () => {
    const sseData = [
      'data: {"error":"Agent timeout"}\n\n',
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      body: createSSEStream(sseData),
    });

    await expect(
      streamAgentMessage(config, "/api/agent/test/", { message: "hi" })
    ).rejects.toThrow("Agent timeout");
  });

  it("ignores non-data SSE lines", async () => {
    const sseData = [
      ': comment\n\n',
      'event: ping\n\n',
      'data: {"content":"ok"}\n\n',
      'data: {"is_complete":true}\n\n',
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      body: createSSEStream(sseData),
    });

    const result = await streamAgentMessage(config, "/api/agent/test/", { message: "hi" });
    expect(result).toBe("ok");
  });

  it("handles chunked SSE messages split across reads", async () => {
    const sseData = [
      'data: {"content":"He',
      'llo"}\n\ndata: {"is_complete":true}\n\n',
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      body: createSSEStream(sseData),
    });

    const result = await streamAgentMessage(config, "/api/agent/test/", { message: "hi" });
    expect(result).toBe("Hello");
  });

  it("returns accumulated content when stream ends without is_complete", async () => {
    const sseData = [
      'data: {"content":"partial"}\n\n',
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      body: createSSEStream(sseData),
    });

    const result = await streamAgentMessage(config, "/api/agent/test/", { message: "hi" });
    expect(result).toBe("partial");
  });

  it("uses provided session_id and user_id", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      body: createSSEStream(['data: {"is_complete":true}\n\n']),
    });

    await streamAgentMessage(config, "/api/agent/test/", {
      message: "hi",
      session_id: "my-session",
      user_id: "my-user",
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.session_id).toBe("my-session");
    expect(body.user_id).toBe("my-user");
  });

  it("ignores malformed JSON in SSE data", async () => {
    const sseData = [
      'data: not-json\n\n',
      'data: {"content":"valid"}\n\n',
      'data: {"is_complete":true}\n\n',
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      body: createSSEStream(sseData),
    });

    const result = await streamAgentMessage(config, "/api/agent/test/", { message: "hi" });
    expect(result).toBe("valid");
  });
});
