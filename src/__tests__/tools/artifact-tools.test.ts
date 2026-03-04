import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockServer, createTestConfig } from "../helpers.js";

vi.mock("../../utils/api-client.js", () => ({
  apiRequest: vi.fn(),
}));

import { registerArtifactTools } from "../../tools/artifact-tools.js";
import { apiRequest } from "../../utils/api-client.js";

const mockedApiRequest = vi.mocked(apiRequest);

describe("registerArtifactTools", () => {
  const config = createTestConfig();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers searchatlas_list_artifacts tool", () => {
    const server = createMockServer();
    registerArtifactTools(server as never, config);

    expect(server.tools.has("searchatlas_list_artifacts")).toBe(true);
    expect(server.tools.size).toBe(1);
  });

  it("calls API with default params", async () => {
    const server = createMockServer();
    registerArtifactTools(server as never, config);

    mockedApiRequest.mockResolvedValue({ artifacts: [] });

    const tool = server.tools.get("searchatlas_list_artifacts")!;
    await tool.handler({ page: 1, page_size: 20 });

    expect(mockedApiRequest).toHaveBeenCalledWith(
      config,
      "/api/agent/artifacts/",
      { params: expect.objectContaining({ page: "1" }) }
    );
  });

  it("passes all optional filters", async () => {
    const server = createMockServer();
    registerArtifactTools(server as never, config);

    mockedApiRequest.mockResolvedValue({ artifacts: [] });

    const tool = server.tools.get("searchatlas_list_artifacts")!;
    await tool.handler({
      page: 2,
      page_size: 50,
      type: "code",
      search: "my artifact",
      namespace: "otto",
    });

    const params = mockedApiRequest.mock.calls[0][2]!.params!;
    expect(params.page).toBe("2");
    expect(params.page_size).toBe("50");
    expect(params.type).toBe("code");
    expect(params.search).toBe("my artifact");
    expect(params.namespace).toBe("otto");
  });

  it("omits undefined optional params", async () => {
    const server = createMockServer();
    registerArtifactTools(server as never, config);

    mockedApiRequest.mockResolvedValue({ artifacts: [] });

    const tool = server.tools.get("searchatlas_list_artifacts")!;
    await tool.handler({ page: 1, page_size: 20 });

    const params = mockedApiRequest.mock.calls[0][2]!.params!;
    expect(params.type).toBeUndefined();
    expect(params.search).toBeUndefined();
    expect(params.namespace).toBeUndefined();
  });

  it("returns formatted JSON response", async () => {
    const server = createMockServer();
    registerArtifactTools(server as never, config);

    const mockData = { count: 1, artifacts: [{ artifact_id: "a1", title: "Test" }] };
    mockedApiRequest.mockResolvedValue(mockData);

    const tool = server.tools.get("searchatlas_list_artifacts")!;
    const result = await tool.handler({ page: 1, page_size: 20 }) as {
      content: Array<{ type: string; text: string }>;
    };

    expect(JSON.parse(result.content[0].text)).toEqual(mockData);
  });

  it("returns error on failure", async () => {
    const server = createMockServer();
    registerArtifactTools(server as never, config);

    mockedApiRequest.mockRejectedValue(new Error("Request failed"));

    const tool = server.tools.get("searchatlas_list_artifacts")!;
    const result = await tool.handler({ page: 1, page_size: 20 }) as {
      content: Array<{ type: string; text: string }>;
      isError: boolean;
    };

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Request failed");
  });
});
