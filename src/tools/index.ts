import { bookmarkTools } from "./bookmarks.js";
import { bulkTools } from "./bulk.js";
import { collectionTools } from "./collections.js";
import { createDiagnosticsTool } from "./diagnostics.js";
import { highlightTools } from "./highlights.js";
import { tagTools } from "./tags.js";
import type { ToolConfig } from "./common.js";

export type { ToolConfig, ToolHandlerContext, McpContent } from "./common.js";

export const buildToolConfigs = (options: { serverVersion: string }) => {
  let toolConfigs: ToolConfig<any, any>[] = [];
  const getEnabledToolNames = () => toolConfigs.map((tool) => tool.name);

  const diagnosticsTool = createDiagnosticsTool(
    options.serverVersion,
    getEnabledToolNames,
  );

  toolConfigs = [
    diagnosticsTool,
    ...collectionTools,
    ...bookmarkTools,
    ...tagTools,
    ...highlightTools,
    ...bulkTools,
  ];

  return { toolConfigs, getEnabledToolNames };
};
