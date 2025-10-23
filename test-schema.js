import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const DiagnosticsInputSchema = z.object({
    includeEnvironment: z.boolean().optional().describe('Include environment info'),
});

const json = zodToJsonSchema(DiagnosticsInputSchema, { name: 'input' });
console.log(JSON.stringify(json, null, 2));
