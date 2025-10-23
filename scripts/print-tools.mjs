import { RaindropMCPService } from "../build/services/raindropmcp.service.js";

const svc = new RaindropMCPService();
const server = svc.getServer();
const tools = (server)._tools || [];
for (const t of tools) {
  console.log(JSON.stringify({ name: t.name, type: t.inputSchema?.type, inputSchema: t.inputSchema }, null, 2));
}
