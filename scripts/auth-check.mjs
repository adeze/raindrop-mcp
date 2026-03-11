import { config } from "dotenv";

config();

const token = process.env.RAINDROP_ACCESS_TOKEN?.trim();

if (!token) {
    console.error("ERROR: RAINDROP_ACCESS_TOKEN is missing in environment/.env");
    process.exit(1);
}

const endpoint = "https://api.raindrop.io/rest/v1/user";

try {
    const response = await fetch(endpoint, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
        },
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok || !body?.result) {
        const reason = body?.errorMessage || `${response.status} ${response.statusText}`;
        console.error(`AUTH CHECK FAILED: ${reason}`);
        process.exit(1);
    }

    const user = body.user || {};
    const name = user.fullName || user.name || "unknown";
    const email = user.email || "unknown";

    console.log("AUTH CHECK OK");
    console.log(`User: ${name} <${email}>`);
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`AUTH CHECK FAILED: ${message}`);
    process.exit(1);
}
