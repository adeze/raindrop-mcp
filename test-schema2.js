import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const DiagnosticsInputSchema = z.object({
    includeEnvironment: z.boolean().optional().describe('Include environment info'),
});

function toObjectJsonSchema(schema) {
    try {
        const json = zodToJsonSchema(schema, { name: 'input' });
        console.log("Raw zodToJsonSchema output:");
        console.log(JSON.stringify(json, null, 2));
        
        if (json && typeof json === 'object') {
            // zod-to-json-schema wraps in { $ref, definitions, $schema }
            // Extract the actual schema from definitions.input
            if (json.$ref === '#/definitions/input' && json.definitions?.input) {
                const actualSchema = json.definitions.input;
                console.log("\nExtracted schema from definitions.input:");
                console.log(JSON.stringify(actualSchema, null, 2));
                return actualSchema;
            }
        }
    } catch (e) {
        console.error("Error:", e);
    }
    return { type: 'object', properties: {}, additionalProperties: true };
}

const result = toObjectJsonSchema(DiagnosticsInputSchema);
console.log("\nFinal result:");
console.log(JSON.stringify(result, null, 2));
