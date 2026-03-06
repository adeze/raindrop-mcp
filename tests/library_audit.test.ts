import { beforeEach, describe, expect, it, vi } from "vitest";
import { RaindropMCPService } from "../src/services/raindropmcp.service.js";

describe("Library Audit Tool", () => {
  let mcpService: RaindropMCPService;

  beforeEach(() => {
    // We can use the real service but we'll need to mock the underlying API calls
    // if we want to avoid real network requests.
    // For the "Red" phase, we just want to see it fail because the tool isn't registered.
    mcpService = new RaindropMCPService();
  });

  it("should have library_audit tool registered", async () => {
    const tools = await mcpService.listTools();
    const auditTool = tools.find(t => t.id === "library_audit");
    expect(auditTool).toBeDefined();
  });

  it("should return audit summary for broken and duplicate links", async () => {
    // This will fail because the tool is not implemented yet
    const result = await mcpService.callTool("library_audit", {});
    expect(result.content).toBeDefined();
    expect(result.content[0].text).toContain("Audit Results");
  });
});
