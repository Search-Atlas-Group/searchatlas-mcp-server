import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockServer, createTestConfig } from "../helpers.js";

vi.mock("../../utils/api-client.js", () => ({
  apiRequest: vi.fn(),
}));

import { registerConversationTools } from "../../tools/conversation-tools.js";
import { apiRequest } from "../../utils/api-client.js";

const mockedApiRequest = vi.mocked(apiRequest);

describe("registerConversationTools", () => {
  const config = createTestConfig();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers searchatlas_list_conversations tool", () => {
    const server = createMockServer();
    registerConversationTools(server as never, config);

    expect(server.tools.has("searchatlas_list_conversations")).toBe(true);
    expect(server.tools.size).toBe(1);
  });

  it("calls API with default params", async () => {
    const server = createMockServer();
    registerConversationTools(server as never, config);

    mockedApiRequest.mockResolvedValue({ results: [] });

    const tool = server.tools.get("searchatlas_list_conversations")!;
    await tool.handler({ page: 1, page_size: 20 });

    expect(mockedApiRequest).toHaveBeenCalledWith(
      config,
      "/api/agent/sessions/",
      { params: expect.objectContaining({ page: "1" }) }
    );
  });

  it("passes optional filters", async () => {
    const server = createMockServer();
    registerConversationTools(server as never, config);

    mockedApiRequest.mockResolvedValue({ results: [] });

    const tool = server.tools.get("searchatlas_list_conversations")!;
    await tool.handler({
      agent_namespace: "otto",
      page: 2,
      page_size: 10,
      search: "test query",
    });

    const params = mockedApiRequest.mock.calls[0][2]!.params!;
    expect(params.agent_namespace).toBe("otto");
    expect(params.page).toBe("2");
    expect(params.page_size).toBe("10");
    expect(params.search).toBe("test query");
  });

  it("returns JSON stringified data", async () => {
    const server = createMockServer();
    registerConversationTools(server as never, config);

    const mockData = { results: [{ id: 1, title: "Test session" }] };
    mockedApiRequest.mockResolvedValue(mockData);

    const tool = server.tools.get("searchatlas_list_conversations")!;
    const result = await tool.handler({ page: 1, page_size: 20 }) as {
      content: Array<{ type: string; text: string }>;
    };

    expect(JSON.parse(result.content[0].text)).toEqual(mockData);
  });

  it("returns error on failure", async () => {
    const server = createMockServer();
    registerConversationTools(server as never, config);

    mockedApiRequest.mockRejectedValue(new Error("Server error"));

    const tool = server.tools.get("searchatlas_list_conversations")!;
    const result = await tool.handler({ page: 1, page_size: 20 }) as {
      content: Array<{ type: string; text: string }>;
      isError: boolean;
    };

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Server error");
  });

  it("omits optional params when not provided", async () => {
    const server = createMockServer();
    registerConversationTools(server as never, config);

    mockedApiRequest.mockResolvedValue({ results: [] });

    const tool = server.tools.get("searchatlas_list_conversations")!;
    await tool.handler({ page: 1 });

    const params = mockedApiRequest.mock.calls[0][2]!.params!;
    expect(params.agent_namespace).toBeUndefined();
    expect(params.search).toBeUndefined();
    expect(params.page_size).toBeUndefined();
  });
});
