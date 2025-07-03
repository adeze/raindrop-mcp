import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js"; // @deprecated See below
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { config } from 'dotenv';
import express from "express";
import { randomUUID } from "node:crypto";
import { createRaindropServer } from './services/mcp.service.js';

config(); // Load .env file

/**
 * Backwards-compatible HTTP server that supports both:
 * - Modern Streamable HTTP transport (recommended)
 * - Legacy SSE transport (for backwards compatibility)
 */

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use((req, res, next) => {
    // CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, MCP-Session-Id, MCP-Protocol-Version');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }

    // Add MCP protocol version header
    res.header('MCP-Protocol-Version', '2024-11-05');

    next();
});

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`, {
        sessionId: req.headers['mcp-session-id'],
        contentType: req.headers['content-type'],
        userAgent: req.headers['user-agent']
    });
    next();
});

// Store transports for each session type
const transports = {
    streamable: {} as Record<string, StreamableHTTPServerTransport>,
    /**
     * @deprecated The SSE transport is deprecated in MCP. Use Streamable HTTP instead.
     * This property is retained for legacy client compatibility only.
     */
    sse: {} as Record<string, SSEServerTransport>
};

// Modern Streamable HTTP endpoint (recommended)
app.all('/mcp', async (req, res) => {
    try {
        // Check for existing session ID
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        let transport: StreamableHTTPServerTransport;

        if (sessionId && transports.streamable[sessionId]) {
            // Reuse existing transport
            transport = transports.streamable[sessionId];
            console.log(`Reusing session: ${sessionId}`);
        } else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
            // New initialization request
            console.log('Creating new Streamable HTTP session');
            const { server, cleanup } = createRaindropServer();

            transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => randomUUID(),
                onsessioninitialized: (sessionId) => {
                    transports.streamable[sessionId] = transport;
                    console.log(`✅ New Streamable HTTP session initialized: ${sessionId}`);
                }
            });

            // Clean up transport when closed
            transport.onclose = () => {
                if (transport.sessionId) {
                    delete transports.streamable[transport.sessionId];
                    console.log(`🧹 Streamable HTTP session cleaned up: ${transport.sessionId}`);
                }
                cleanup();
            };

            // Connect to the MCP server
            await server.connect(transport);
        } else {
            // Invalid request
            console.warn('Invalid MCP request: missing session ID or invalid initialization');
            res.status(400).json({
                jsonrpc: '2.0',
                error: {
                    code: -32000,
                    message: 'Bad Request: No valid session ID provided or missing initialization',
                },
                id: null,
            });
            return;
        }

        // Handle the request
        await transport.handleRequest(req, res, req.body);
    } catch (error) {
        console.error('Error handling Streamable HTTP request:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error',
                },
                id: null,
            });
        }
    }
});

// Legacy SSE endpoint for backwards compatibility
/**
 * @deprecated The SSE transport is deprecated in MCP. Use Streamable HTTP instead.
 * This endpoint is retained for legacy client compatibility only.
 */
app.get('/sse', async (req, res) => {
    try {
        console.log("📡 Establishing SSE connection (legacy mode)");
        const { server, cleanup } = createRaindropServer();

        const transport = new SSEServerTransport('/messages', res);
        const sessionId = randomUUID();
        transports.sse[sessionId] = transport;

        // Set session ID in response headers for client tracking
        res.setHeader('X-Session-Id', sessionId);

        res.on("close", () => {
            delete transports.sse[sessionId];
            cleanup();
            console.log(`🧹 SSE session closed: ${sessionId}`);
        });

        res.on("error", (error) => {
            console.error(`SSE connection error for session ${sessionId}:`, error);
            delete transports.sse[sessionId];
            cleanup();
        });

        await server.connect(transport);
        console.log(`✅ SSE session connected: ${sessionId}`);
    } catch (error) {
        console.error('Error establishing SSE connection:', error);
        if (!res.headersSent) {
            res.status(500).send('Failed to establish SSE connection');
        }
    }
});

// Legacy message endpoint for older SSE clients
/**
 * @deprecated The SSE transport is deprecated in MCP. Use Streamable HTTP instead.
 * This endpoint is retained for legacy client compatibility only.
 */
app.post('/messages', async (req, res) => {
    try {
        const sessionId = req.query.sessionId as string || req.headers['x-session-id'] as string;

        if (!sessionId) {
            res.status(400).json({
                jsonrpc: '2.0',
                error: {
                    code: -32000,
                    message: 'Missing sessionId parameter or X-Session-Id header',
                },
                id: null,
            });
            return;
        }

        const transport = transports.sse[sessionId];

        if (transport) {
            console.log(`📨 Handling SSE message for session: ${sessionId}`);
            await transport.handlePostMessage(req, res, req.body);
        } else {
            console.warn(`No SSE transport found for session: ${sessionId}`);
            res.status(400).json({
                jsonrpc: '2.0',
                error: {
                    code: -32000,
                    message: `No transport found for sessionId: ${sessionId}`,
                },
                id: null,
            });
        }
    } catch (error) {
        console.error('Error handling SSE message:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error',
                },
                id: null,
            });
        }
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    const streamableSessions = Object.keys(transports.streamable).length;
    const sseSessions = Object.keys(transports.sse).length;

    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        server: 'raindrop-mcp',
        version: '1.0.0',
        protocol: {
            version: '2024-11-05',
            transports: ['streamable-http', 'sse']
        },
        sessions: {
            streamable: streamableSessions,
            sse: sseSessions,
            total: streamableSessions + sseSessions
        },
        endpoints: {
            streamableHttp: '/mcp',
            legacySse: '/sse',
            legacyMessages: '/messages',
            health: '/health'
        }
    });
});

// Root endpoint with API documentation
app.get('/', (req, res) => {
    res.json({
        name: 'Raindrop MCP Server',
        description: 'Model Context Protocol server for Raindrop.io bookmarking service',
        version: '1.0.0',
        protocols: {
            'streamable-http': {
                endpoint: '/mcp',
                methods: ['GET', 'POST', 'DELETE'],
                description: 'Modern MCP transport with session management'
            },
            'sse-legacy': {
                endpoints: {
                    connect: '/sse',
                    messages: '/messages'
                },
                description: 'Legacy SSE transport for backwards compatibility (deprecated)'
            },
            'http-optimized': {
                endpoint: '/mcp',
                description: 'Optimized HTTP transport (see src/http-server-optimized.ts)'
            }
        },
        documentation: 'https://github.com/adeze/raindrop-mcp',
        health: '/health'
    });
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', error);
    if (!res.headersSent) {
        res.status(500).json({
            jsonrpc: '2.0',
            error: {
                code: -32603,
                message: 'Internal server error',
            },
            id: null,
        });
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully');
    // Close all active transports
    Object.values(transports.streamable).forEach(transport => transport.close());
    Object.values(transports.sse).forEach(transport => transport.close());
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully');
    // Close all active transports
    Object.values(transports.streamable).forEach(transport => transport.close());
    Object.values(transports.sse).forEach(transport => transport.close());
    process.exit(0);
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
    console.log('🚀 Raindrop MCP Server started successfully!');
    console.log(`📡 Streamable HTTP (recommended): http://localhost:${PORT}/mcp`);
    console.log(`📡 Legacy SSE: http://localhost:${PORT}/sse`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`📚 API docs: http://localhost:${PORT}/`);
    console.log(`🔧 Protocol version: 2024-11-05`);
});

// Handle server errors
server.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
});

export { app, server };
