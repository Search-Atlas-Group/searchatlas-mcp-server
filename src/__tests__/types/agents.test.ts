import { describe, it, expect } from "vitest";
import { AGENT_ENDPOINTS } from "../../types/agents.js";

describe("AGENT_ENDPOINTS", () => {
  it("has 10 agent endpoints", () => {
    expect(AGENT_ENDPOINTS).toHaveLength(10);
  });

  it("each endpoint has all required fields", () => {
    for (const agent of AGENT_ENDPOINTS) {
      expect(agent.toolName).toBeTruthy();
      expect(agent.displayName).toBeTruthy();
      expect(agent.description).toBeTruthy();
      expect(agent.endpoint).toBeTruthy();
      expect(agent.historyNamespace).toBeTruthy();
    }
  });

  it("all tool names are unique", () => {
    const names = AGENT_ENDPOINTS.map((a) => a.toolName);
    expect(new Set(names).size).toBe(names.length);
  });

  it("all endpoints start with /api/agent/", () => {
    for (const agent of AGENT_ENDPOINTS) {
      expect(agent.endpoint).toMatch(/^\/api\/agent\//);
    }
  });

  it("all tool names follow searchatlas_ prefix convention", () => {
    for (const agent of AGENT_ENDPOINTS) {
      expect(agent.toolName).toMatch(/^searchatlas_/);
    }
  });

  it("all history namespaces are unique", () => {
    const namespaces = AGENT_ENDPOINTS.map((a) => a.historyNamespace);
    expect(new Set(namespaces).size).toBe(namespaces.length);
  });

  it("includes the orchestrator agent", () => {
    const orchestrator = AGENT_ENDPOINTS.find((a) => a.toolName === "searchatlas_orchestrator");
    expect(orchestrator).toBeDefined();
    expect(orchestrator!.endpoint).toBe("/api/agent/orchestrator/");
  });

  it("includes the content genius agent", () => {
    const content = AGENT_ENDPOINTS.find((a) => a.toolName === "searchatlas_content");
    expect(content).toBeDefined();
    expect(content!.endpoint).toBe("/api/agent/content-genius/chat/");
    expect(content!.historyNamespace).toBe("content_genius");
  });
});
