import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockServer, createTestConfig } from "../helpers.js";

vi.mock("../../utils/api-client.js", () => ({
  streamAgentMessage: vi.fn(),
}));

import { registerAgentTools } from "../../tools/agent-tools.js";
import { streamAgentMessage } from "../../utils/api-client.js";
import { AGENT_ENDPOINTS } from "../../types/agents.js";

const mockedStream = vi.mocked(streamAgentMessage);

describe("registerAgentTools", () => {
  const config = createTestConfig();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers one tool per agent endpoint", () => {
    const server = createMockServer();
    registerAgentTools(server as never, config);

    expect(server.tools.size).toBe(AGENT_ENDPOINTS.length);
    for (const agent of AGENT_ENDPOINTS) {
      expect(server.tools.has(agent.toolName)).toBe(true);
    }
  });

  it("each tool has the correct description", () => {
    const server = createMockServer();
    registerAgentTools(server as never, config);

    for (const agent of AGENT_ENDPOINTS) {
      const tool = server.tools.get(agent.toolName)!;
      expect(tool.description).toBe(agent.description);
    }
  });

  it("orchestrator tool streams message and returns content", async () => {
    const server = createMockServer();
    registerAgentTools(server as never, config);

    mockedStream.mockResolvedValue("Agent response text");

    const tool = server.tools.get("searchatlas_orchestrator")!;
    const result = await tool.handler({ message: "Hello", plan_mode: false }) as {
      content: Array<{ type: string; text: string }>;
    };

    expect(mockedStream).toHaveBeenCalledWith(
      config,
      "/api/agent/orchestrator/",
      expect.objectContaining({ message: "Hello", plan_mode: false })
    );
    expect(result.content[0].text).toBe("Agent response text");
  });

  it("passes project_id and playbook_id when provided", async () => {
    const server = createMockServer();
    registerAgentTools(server as never, config);

    mockedStream.mockResolvedValue("ok");

    const tool = server.tools.get("searchatlas_orchestrator")!;
    await tool.handler({
      message: "test",
      project_id: 42,
      playbook_id: "abc-123",
      plan_mode: true,
    });

    expect(mockedStream).toHaveBeenCalledWith(
      config,
      "/api/agent/orchestrator/",
      expect.objectContaining({
        message: "test",
        project_id: 42,
        playbook_id: "abc-123",
        plan_mode: true,
      })
    );
  });

  it("omits project_id and playbook_id when not provided", async () => {
    const server = createMockServer();
    registerAgentTools(server as never, config);

    mockedStream.mockResolvedValue("ok");

    const tool = server.tools.get("searchatlas_orchestrator")!;
    await tool.handler({ message: "test", plan_mode: false });

    const body = mockedStream.mock.calls[0][2];
    expect(body.project_id).toBeUndefined();
    expect(body.playbook_id).toBeUndefined();
  });

  it("returns error when stream fails", async () => {
    const server = createMockServer();
    registerAgentTools(server as never, config);

    mockedStream.mockRejectedValue(new Error("Network error"));

    const tool = server.tools.get("searchatlas_orchestrator")!;
    const result = await tool.handler({ message: "test", plan_mode: false }) as {
      content: Array<{ type: string; text: string }>;
      isError: boolean;
    };

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Network error");
  });

  it("uses correct endpoint for each agent", async () => {
    const server = createMockServer();
    registerAgentTools(server as never, config);

    mockedStream.mockResolvedValue("ok");

    for (const agent of AGENT_ENDPOINTS) {
      const tool = server.tools.get(agent.toolName)!;
      await tool.handler({ message: "test", plan_mode: false });

      const lastCall = mockedStream.mock.calls[mockedStream.mock.calls.length - 1];
      expect(lastCall[1]).toBe(agent.endpoint);
    }
  });
});
