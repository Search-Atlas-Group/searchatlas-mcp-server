import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockServer, createTestConfig } from "../helpers.js";

vi.mock("../../tools/agent-tools.js", () => ({
  registerAgentTools: vi.fn(),
}));
vi.mock("../../tools/project-tools.js", () => ({
  registerProjectTools: vi.fn(),
}));
vi.mock("../../tools/conversation-tools.js", () => ({
  registerConversationTools: vi.fn(),
}));
vi.mock("../../tools/artifact-tools.js", () => ({
  registerArtifactTools: vi.fn(),
}));
vi.mock("../../tools/playbook-tools.js", () => ({
  registerPlaybookTools: vi.fn(),
}));

import { registerAllTools } from "../../tools/register-all.js";
import { registerAgentTools } from "../../tools/agent-tools.js";
import { registerProjectTools } from "../../tools/project-tools.js";
import { registerConversationTools } from "../../tools/conversation-tools.js";
import { registerArtifactTools } from "../../tools/artifact-tools.js";
import { registerPlaybookTools } from "../../tools/playbook-tools.js";

describe("registerAllTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls all tool registration functions", () => {
    const server = createMockServer();
    const config = createTestConfig();

    registerAllTools(server as never, config);

    expect(registerAgentTools).toHaveBeenCalledWith(server, config);
    expect(registerProjectTools).toHaveBeenCalledWith(server, config);
    expect(registerConversationTools).toHaveBeenCalledWith(server, config);
    expect(registerArtifactTools).toHaveBeenCalledWith(server, config);
    expect(registerPlaybookTools).toHaveBeenCalledWith(server, config);
  });

  it("calls each registration function exactly once", () => {
    const server = createMockServer();
    const config = createTestConfig();

    registerAllTools(server as never, config);

    expect(registerAgentTools).toHaveBeenCalledTimes(1);
    expect(registerProjectTools).toHaveBeenCalledTimes(1);
    expect(registerConversationTools).toHaveBeenCalledTimes(1);
    expect(registerArtifactTools).toHaveBeenCalledTimes(1);
    expect(registerPlaybookTools).toHaveBeenCalledTimes(1);
  });
});
