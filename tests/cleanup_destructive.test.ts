import { beforeEach, describe, expect, it } from "vitest";
import { RaindropMCPService } from "../src/services/raindropmcp.service.js";

describe("Destructive Cleanup Tools Confirmation", () => {
  let mcpService: RaindropMCPService;

  beforeEach(() => {
    mcpService = new RaindropMCPService();
  });

  describe("empty_trash", () => {
    it("should request confirmation when confirm is false", async () => {
      const result = await mcpService.callTool("empty_trash", { confirm: false });
      expect(result.content[0].text).toContain("To permanently empty it, call this tool again with 'confirm: true'");
    });

    it("should request confirmation when confirm is omitted", async () => {
      const result = await mcpService.callTool("empty_trash", {});
      expect(result.content[0].text).toContain("To permanently empty it, call this tool again with 'confirm: true'");
    });
  });

  describe("cleanup_collections", () => {
    it("should request confirmation when confirm is false", async () => {
      const result = await mcpService.callTool("cleanup_collections", { confirm: false });
      expect(result.content[0].text).toContain("Call this tool again with 'confirm: true' to proceed");
    });

    it("should request confirmation when confirm is omitted", async () => {
      const result = await mcpService.callTool("cleanup_collections", {});
      expect(result.content[0].text).toContain("Call this tool again with 'confirm: true' to proceed");
    });
  });
});
