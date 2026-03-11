import { config } from "dotenv";

config();

const token = globalThis.process.env.RAINDROP_ACCESS_TOKEN?.trim();

if (!token) {
    globalThis.console.error("ERROR: RAINDROP_ACCESS_TOKEN is missing in environment/.env");
    globalThis.process.exit(1);
}

const endpoint = "https://api.raindrop.io/rest/v1/user";

try {
    const response = await globalThis.fetch(endpoint, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
        },
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok || !body?.result) {
        const reason = body?.errorMessage || `${response.status} ${response.statusText}`;
        globalThis.console.error(`AUTH CHECK FAILED: ${reason}`);
        globalThis.process.exit(1);
    }

    const user = body.user || {};
    const name = user.fullName || user.name || "unknown";
    const email = user.email || "unknown";

    globalThis.console.log("AUTH CHECK OK");
    globalThis.console.log(`User: ${name} <${email}>`);
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    globalThis.console.error(`AUTH CHECK FAILED: ${message}`);
    globalThis.process.exit(1);
}
