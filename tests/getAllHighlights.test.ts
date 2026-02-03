import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import RaindropService from "../src/services/raindrop.service.js";

config();

describe(".env configuration", () => {
  it("should load RAINDROP_ACCESS_TOKEN from environment variables", () => {
    const accessToken = process.env.RAINDROP_ACCESS_TOKEN;
    expect(accessToken).toBeDefined();
    expect(typeof accessToken).toBe("string");
  });
});

describe("Raindrop Highlights API", () => {
  it("fetches highlights from the API using RaindropService", async () => {
    if (!process.env.RAINDROP_ACCESS_TOKEN) {
      console.warn("Skipping test: RAINDROP_ACCESS_TOKEN not set");
      return;
    }

    const service = new RaindropService();
    const highlights = await service.getAllHighlights();

    expect(highlights).toBeDefined();
    expect(Array.isArray(highlights)).toBe(true);
    // Highlights array may be empty if user has no highlights
  });
});
