import { beforeEach, describe, expect, it } from "vitest";
import { RaindropMCPService } from "../src/services/raindropmcp.service.js";

describe("Diagnostics Health Stats", () => {
  let mcpService: RaindropMCPService;

  beforeEach(() => {
    mcpService = new RaindropMCPService();
  });

  it("should include detailed library health in diagnostics tool output", async () => {
    const result = await mcpService.callTool("diagnostics", {});
    expect(result.content).toBeDefined();
    
    const content = result.content[0];
    expect(content.type).toBe("resource");
    expect(content.resource.uri).toBe("diagnostics://server");

    const diagnostics = JSON.parse(content.resource.text);
    expect(diagnostics.libraryHealth).toBeDefined();
    
    // Core stats
    expect(diagnostics.libraryHealth.totalBookmarks).toBeDefined();
    expect(diagnostics.libraryHealth.totalCollections).toBeDefined();
    
    // Enhanced health metrics
    expect(diagnostics.libraryHealth.brokenCount).toBeDefined();
    expect(diagnostics.libraryHealth.duplicateCount).toBeDefined();
    expect(diagnostics.libraryHealth.untaggedCount).toBeDefined();
    
    console.log("Diagnostics Health Data:", JSON.stringify(diagnostics.libraryHealth, null, 2));
  });
});
