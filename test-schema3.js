import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const DiagnosticsInputSchema = z.object({
    includeEnvironment: z.boolean().optional().describe('Include environment info'),
});

// Try without the name parameter
const json1 = zodToJsonSchema(DiagnosticsInputSchema);
console.log("Without name parameter:");
console.log(JSON.stringify(json1, null, 2));

// Try with different options
const json2 = zodToJsonSchema(DiagnosticsInputSchema, { $refStrategy: 'none' });
console.log("\nWith $refStrategy: 'none':");
console.log(JSON.stringify(json2, null, 2));
