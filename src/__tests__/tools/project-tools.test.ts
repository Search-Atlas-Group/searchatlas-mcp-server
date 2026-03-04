import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockServer, createTestConfig } from "../helpers.js";

vi.mock("../../utils/api-client.js", () => ({
  apiRequest: vi.fn(),
}));

import { registerProjectTools } from "../../tools/project-tools.js";
import { apiRequest } from "../../utils/api-client.js";

const mockedApiRequest = vi.mocked(apiRequest);

describe("registerProjectTools", () => {
  const config = createTestConfig();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers list_projects and create_project tools", () => {
    const server = createMockServer();
    registerProjectTools(server as never, config);

    expect(server.tools.has("searchatlas_list_projects")).toBe(true);
    expect(server.tools.has("searchatlas_create_project")).toBe(true);
    expect(server.tools.size).toBe(2);
  });

  describe("searchatlas_list_projects", () => {
    it("calls API with pagination params", async () => {
      const server = createMockServer();
      registerProjectTools(server as never, config);

      const mockData = { count: 1, next: null, previous: null, results: [{ id: 1, domain: "example.com" }] };
      mockedApiRequest.mockResolvedValue(mockData);

      const tool = server.tools.get("searchatlas_list_projects")!;
      const result = await tool.handler({ page: 2, page_size: 10 }) as {
        content: Array<{ type: string; text: string }>;
      };

      expect(mockedApiRequest).toHaveBeenCalledWith(
        config,
        "/api/agent/projects/",
        { params: { page: "2", page_size: "10" } }
      );
      expect(JSON.parse(result.content[0].text)).toEqual(mockData);
    });

    it("includes search param when provided", async () => {
      const server = createMockServer();
      registerProjectTools(server as never, config);

      mockedApiRequest.mockResolvedValue({ results: [] });

      const tool = server.tools.get("searchatlas_list_projects")!;
      await tool.handler({ page: 1, page_size: 20, search: "test.com" });

      const params = mockedApiRequest.mock.calls[0][2]!.params!;
      expect(params.search).toBe("test.com");
    });

    it("uses default pagination values", async () => {
      const server = createMockServer();
      registerProjectTools(server as never, config);

      mockedApiRequest.mockResolvedValue({ results: [] });

      const tool = server.tools.get("searchatlas_list_projects")!;
      await tool.handler({});

      const params = mockedApiRequest.mock.calls[0][2]!.params!;
      expect(params.page).toBe("1");
      expect(params.page_size).toBe("20");
    });

    it("returns error on API failure", async () => {
      const server = createMockServer();
      registerProjectTools(server as never, config);

      mockedApiRequest.mockRejectedValue(new Error("API down"));

      const tool = server.tools.get("searchatlas_list_projects")!;
      const result = await tool.handler({ page: 1, page_size: 20 }) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("API down");
    });
  });

  describe("searchatlas_create_project", () => {
    it("sends POST with domain and country_code", async () => {
      const server = createMockServer();
      registerProjectTools(server as never, config);

      const mockProject = { id: 1, domain: "example.com", customer_id: "c1" };
      mockedApiRequest.mockResolvedValue(mockProject);

      const tool = server.tools.get("searchatlas_create_project")!;
      const result = await tool.handler({ domain: "example.com", country_code: "GB" }) as {
        content: Array<{ type: string; text: string }>;
      };

      expect(mockedApiRequest).toHaveBeenCalledWith(
        config,
        "/api/agent/projects/",
        {
          method: "POST",
          body: { domain: "example.com", country_code: "GB", competitors: [] },
        }
      );
      expect(JSON.parse(result.content[0].text)).toEqual(mockProject);
    });

    it("uses default country_code US", async () => {
      const server = createMockServer();
      registerProjectTools(server as never, config);

      mockedApiRequest.mockResolvedValue({ id: 1 });

      const tool = server.tools.get("searchatlas_create_project")!;
      await tool.handler({ domain: "test.com" });

      const body = mockedApiRequest.mock.calls[0][2]!.body as Record<string, unknown>;
      expect(body.country_code).toBe("US");
    });

    it("returns error on API failure", async () => {
      const server = createMockServer();
      registerProjectTools(server as never, config);

      mockedApiRequest.mockRejectedValue(new Error("Conflict"));

      const tool = server.tools.get("searchatlas_create_project")!;
      const result = await tool.handler({ domain: "test.com", country_code: "US" }) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Conflict");
    });
  });
});
