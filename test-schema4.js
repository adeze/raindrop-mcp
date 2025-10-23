import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

console.log("Zod version:", (await import("zod/package.json")).default.version);
console.log("zod-to-json-schema version:", (await import("zod-to-json-schema/package.json")).default.version);

const schema1 = z.object({
    includeEnvironment: z.boolean().optional(),
});

console.log("\nSchema _def:");
console.log(schema1._def);

console.log("\nConverted:");
const json = zodToJsonSchema(schema1);
console.log(JSON.stringify(json, null, 2));

// Try a simpler test
const schema2 = z.object({ test: z.string() });
const json2 = zodToJsonSchema(schema2);
console.log("\nSimple schema:");
console.log(JSON.stringify(json2, null, 2));
