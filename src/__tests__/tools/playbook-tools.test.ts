import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockServer, createTestConfig } from "../helpers.js";

vi.mock("../../utils/api-client.js", () => ({
  apiRequest: vi.fn(),
  streamAgentMessage: vi.fn(),
}));

import { registerPlaybookTools } from "../../tools/playbook-tools.js";
import { apiRequest, streamAgentMessage } from "../../utils/api-client.js";

const mockedApiRequest = vi.mocked(apiRequest);
const mockedStream = vi.mocked(streamAgentMessage);

describe("registerPlaybookTools", () => {
  const config = createTestConfig();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers list_playbooks and run_playbook tools", () => {
    const server = createMockServer();
    registerPlaybookTools(server as never, config);

    expect(server.tools.has("searchatlas_list_playbooks")).toBe(true);
    expect(server.tools.has("searchatlas_run_playbook")).toBe(true);
    expect(server.tools.size).toBe(2);
  });

  describe("searchatlas_list_playbooks", () => {
    it("calls API with default params", async () => {
      const server = createMockServer();
      registerPlaybookTools(server as never, config);

      mockedApiRequest.mockResolvedValue({ results: [] });

      const tool = server.tools.get("searchatlas_list_playbooks")!;
      await tool.handler({ page: 1, page_size: 20, filter: "all" });

      expect(mockedApiRequest).toHaveBeenCalledWith(
        config,
        "/api/playbooks/",
        { params: expect.objectContaining({ page: "1" }) }
      );
    });

    it("passes filter when not 'all'", async () => {
      const server = createMockServer();
      registerPlaybookTools(server as never, config);

      mockedApiRequest.mockResolvedValue({ results: [] });

      const tool = server.tools.get("searchatlas_list_playbooks")!;
      await tool.handler({ filter: "my", page: 1, page_size: 20 });

      const params = mockedApiRequest.mock.calls[0][2]!.params!;
      expect(params.filter).toBe("my");
    });

    it("omits filter when 'all'", async () => {
      const server = createMockServer();
      registerPlaybookTools(server as never, config);

      mockedApiRequest.mockResolvedValue({ results: [] });

      const tool = server.tools.get("searchatlas_list_playbooks")!;
      await tool.handler({ filter: "all", page: 1, page_size: 20 });

      const params = mockedApiRequest.mock.calls[0][2]!.params!;
      expect(params.filter).toBeUndefined();
    });

    it("passes optional agent_namespace and search", async () => {
      const server = createMockServer();
      registerPlaybookTools(server as never, config);

      mockedApiRequest.mockResolvedValue({ results: [] });

      const tool = server.tools.get("searchatlas_list_playbooks")!;
      await tool.handler({
        filter: "community",
        agent_namespace: "otto",
        search: "seo audit",
        page: 1,
        page_size: 10,
      });

      const params = mockedApiRequest.mock.calls[0][2]!.params!;
      expect(params.agent_namespace).toBe("otto");
      expect(params.search).toBe("seo audit");
      expect(params.filter).toBe("community");
      expect(params.page_size).toBe("10");
    });

    it("returns error on failure", async () => {
      const server = createMockServer();
      registerPlaybookTools(server as never, config);

      mockedApiRequest.mockRejectedValue(new Error("Timeout"));

      const tool = server.tools.get("searchatlas_list_playbooks")!;
      const result = await tool.handler({ page: 1, page_size: 20, filter: "all" }) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Timeout");
    });
  });

  describe("searchatlas_run_playbook", () => {
    it("streams to orchestrator endpoint by default", async () => {
      const server = createMockServer();
      registerPlaybookTools(server as never, config);

      mockedStream.mockResolvedValue("Playbook executed");

      const tool = server.tools.get("searchatlas_run_playbook")!;
      const result = await tool.handler({
        playbook_id: "pb-123",
        project_id: 42,
        message: "Run this playbook",
      }) as {
        content: Array<{ type: string; text: string }>;
      };

      expect(mockedStream).toHaveBeenCalledWith(
        config,
        "/api/agent/orchestrator/",
        expect.objectContaining({
          message: "Run this playbook",
          project_id: 42,
          playbook_id: "pb-123",
          plan_mode: false,
        })
      );
      expect(result.content[0].text).toBe("Playbook executed");
    });

    it("uses specified agent_namespace endpoint", async () => {
      const server = createMockServer();
      registerPlaybookTools(server as never, config);

      mockedStream.mockResolvedValue("ok");

      const tool = server.tools.get("searchatlas_run_playbook")!;
      await tool.handler({
        playbook_id: "pb-456",
        project_id: 1,
        message: "Run",
        agent_namespace: "otto",
      });

      expect(mockedStream).toHaveBeenCalledWith(
        config,
        "/api/agent/otto/",
        expect.anything()
      );
    });

    it("falls back to orchestrator for unknown namespace", async () => {
      const server = createMockServer();
      registerPlaybookTools(server as never, config);

      mockedStream.mockResolvedValue("ok");

      const tool = server.tools.get("searchatlas_run_playbook")!;
      await tool.handler({
        playbook_id: "pb-789",
        project_id: 1,
        message: "Run",
        agent_namespace: "nonexistent_agent",
      });

      expect(mockedStream).toHaveBeenCalledWith(
        config,
        "/api/agent/orchestrator/",
        expect.anything()
      );
    });

    it("uses default message when not provided", async () => {
      const server = createMockServer();
      registerPlaybookTools(server as never, config);

      mockedStream.mockResolvedValue("ok");

      const tool = server.tools.get("searchatlas_run_playbook")!;
      await tool.handler({
        playbook_id: "pb-123",
        project_id: 1,
      });

      const body = mockedStream.mock.calls[0][2];
      expect(body.message).toBe("Run this playbook");
    });

    it("returns error on stream failure", async () => {
      const server = createMockServer();
      registerPlaybookTools(server as never, config);

      mockedStream.mockRejectedValue(new Error("Stream failed"));

      const tool = server.tools.get("searchatlas_run_playbook")!;
      const result = await tool.handler({
        playbook_id: "pb-123",
        project_id: 1,
        message: "Run",
      }) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Stream failed");
    });

    it("uses content_genius endpoint for content_genius namespace", async () => {
      const server = createMockServer();
      registerPlaybookTools(server as never, config);

      mockedStream.mockResolvedValue("ok");

      const tool = server.tools.get("searchatlas_run_playbook")!;
      await tool.handler({
        playbook_id: "pb",
        project_id: 1,
        message: "Run",
        agent_namespace: "content_genius",
      });

      expect(mockedStream).toHaveBeenCalledWith(
        config,
        "/api/agent/content-genius/chat/",
        expect.anything()
      );
    });
  });
});
