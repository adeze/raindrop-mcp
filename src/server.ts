/** HTTP entry point for the Raindrop MCP server. */
import { createMcpHandler } from "@modelcontextprotocol/server";
import {
  hostHeaderValidation,
  originValidation,
  toNodeHandler,
} from "@modelcontextprotocol/node";
import { config } from "dotenv";
import http from "node:http";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { AuthorizationCode } from "simple-oauth2";
import pkg from "../package.json";
import { RaindropMCPService } from "./services/raindropmcp.service.js";
import { createLogger } from "./utils/logger.js";

config({ quiet: true });

const PORT = Number.parseInt(process.env.HTTP_PORT || "3002", 10);
const logger = createLogger("http");
const localHosts = ["localhost", "127.0.0.1", "[::1]"];
const parseHosts = (value: string | undefined) =>
  value
    ?.split(",")
    .map((host) => host.trim())
    .filter(Boolean) || [];
const allowedHosts = [...localHosts, ...parseHosts(process.env.ALLOWED_HOSTS)];
const allowedOrigins = [
  ...localHosts,
  ...parseHosts(process.env.ALLOWED_ORIGINS),
];
const validateHost = hostHeaderValidation(allowedHosts);
const validateOrigin = originValidation(allowedOrigins);
const oauthStates = new Map<string, number>();
const oauthStateLifetime = 600_000;

const oauthClient = new AuthorizationCode({
  client: {
    id: process.env.RAINDROP_CLIENT_ID,
    secret: process.env.RAINDROP_CLIENT_SECRET,
  },
  auth: {
    tokenHost: "https://raindrop.io",
    authorizePath: "/oauth/authorize",
    tokenPath: "/oauth/access_token",
  },
});

const mcpHandler = createMcpHandler(
  () => new RaindropMCPService().getServer(),
  {
    legacy: "stateless",
    responseMode: "auto",
    onerror: (error) => logger.error("MCP handler error", error),
  },
);
const nodeMcpHandler = toNodeHandler(mcpHandler, {
  onerror: (error) => logger.error("MCP Node adapter error", error),
});

const setCorsHeaders = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
) => {
  const origin = req.headers.origin;
  if (typeof origin === "string") {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, MCP-Protocol-Version, MCP-Param-*",
  );
};

const server = http.createServer(async (req, res) => {
  if (!validateHost(req, res) || !validateOrigin(req, res)) return;
  setCorsHeaders(req, res);

  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "healthy",
        service: "raindrop-mcp",
        version: pkg.version,
        protocolTarget: "2026-07-28",
        httpMode: "per-request",
      }),
    );
    return;
  }

  if (url.pathname === "/auth/raindrop" && req.method === "GET") {
    if (!process.env.RAINDROP_CLIENT_ID) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("RAINDROP_CLIENT_ID not set");
      return;
    }
    const redirectUri =
      process.env.RAINDROP_REDIRECT_URI ||
      `http://localhost:${PORT}/auth/raindrop/callback`;
    for (const [state, expires] of oauthStates) {
      if (expires <= Date.now()) oauthStates.delete(state);
    }
    if (oauthStates.size >= 256) {
      oauthStates.delete(oauthStates.keys().next().value!);
    }
    const state = randomBytes(32).toString("hex");
    oauthStates.set(state, Date.now() + oauthStateLifetime);
    res.writeHead(302, {
      "Set-Cookie": `raindrop_oauth_state=${state}; Path=/auth/raindrop; HttpOnly; SameSite=Lax; Max-Age=600${new URL(redirectUri).protocol === "https:" ? "; Secure" : ""}`,
      Location: oauthClient.authorizeURL({
        redirect_uri: redirectUri,
        scope: "read write",
        state,
      }),
    });
    res.end();
    return;
  }

  if (url.pathname === "/auth/raindrop/callback" && req.method === "GET") {
    const state = url.searchParams.get("state");
    const cookieState = req.headers.cookie
      ?.split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith("raindrop_oauth_state="))
      ?.slice("raindrop_oauth_state=".length);
    if (
      !state ||
      state !== cookieState ||
      (oauthStates.get(state) ?? 0) <= Date.now()
    ) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Invalid or expired OAuth state");
      return;
    }
    oauthStates.delete(state);
    res.setHeader(
      "Set-Cookie",
      "raindrop_oauth_state=; Path=/auth/raindrop; HttpOnly; SameSite=Lax; Max-Age=0",
    );
    res.setHeader("Cache-Control", "no-store");
    const code = url.searchParams.get("code");
    if (!code) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Missing code parameter");
      return;
    }
    const redirectUri =
      process.env.RAINDROP_REDIRECT_URI ||
      `http://localhost:${PORT}/auth/raindrop/callback`;
    try {
      const token = await oauthClient.getToken({
        code,
        redirect_uri: redirectUri,
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ access_token: token.token.access_token }));
    } catch {
      logger.error("OAuth token exchange failed");
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "OAuth token exchange failed" }));
    }
    return;
  }

  if (url.pathname === "/mcp") {
    await nodeMcpHandler(req, res);
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
});

export const startHttpServer = () =>
  server.listen(PORT, "127.0.0.1", () => {
    logger.info(`Raindrop MCP HTTP Server running on port ${PORT}`);
    logger.info(`MCP endpoint: http://localhost:${PORT}/mcp`);
  });

const shutdown = async () => {
  await mcpHandler.close();
  server.close(() => process.exit(0));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startHttpServer();
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}

export { server as app, mcpHandler };
