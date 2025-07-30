import express from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createOptimizedRaindropServer } from './services/mcp-optimized.service.js';
import { createLogger } from './utils/logger.js';
import { config } from 'dotenv';

config(); // Load .env file

const PORT = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : 3002;
const logger = createLogger('http-optimized');

/**
 * HTTP Server with Optimized Raindrop MCP Service
 * 
 * This server uses the optimized MCP service with:
 * - Consolidated tools (24 vs 37)
 * - AI-friendly descriptions and parameters
 * - Consistent naming conventions
 * - Enhanced error handling
 * 
 * Compare with the original HTTP server on port 3001 to see the differences.
 */

// Track active sessions and transports for monitoring
const activeSessions = new Map();
const sessionMetadata = new Map();
const transports: Record<string, StreamableHTTPServerTransport> = {};

// Helper function to check if request is an initialization request
function isInitializeRequest(body: any): boolean {
    return body && body.method === 'initialize' && body.jsonrpc === '2.0';
}

// Start HTTP server with CORS and session management
const app = express();

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }

    next();
});

// JSON parsing middleware
app.use(express.json());

// Health check endpoint with session information
app.get('/health', (req, res) => {
    const sessions = Array.from(sessionMetadata.values());

    res.json({
        status: 'healthy',
        service: 'raindrop-mcp-optimized',
        version: '2.0.0',
        port: PORT,
        activeSessions: sessions.length,
        sessions,
        optimizations: {
            toolCount: 24,
            originalToolCount: 37,
            reduction: '35%',
            features: [
                'Consolidated tools with operation parameters',
                'AI-friendly descriptions and examples',
                'Consistent naming conventions',
                'Enhanced parameter documentation',
                'Standardized resource URI patterns',
                'Improved error handling with suggestions'
            ]
        }
    });
});

// API documentation endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Raindrop MCP HTTP Server (Optimized)',
        version: '2.0.0',
        description: 'Optimized Model Context Protocol server for Raindrop.io with enhanced AI-friendly tools',
        endpoints: {
            '/': 'This documentation',
            '/health': 'Health check with session info and optimization details',
            '/mcp': 'MCP protocol endpoint (POST only)'
        },
        optimizations: {
            tools: {
                original: 37,
                optimized: 24,
                improvement: '35% reduction in tool count'
            },
            categories: [
                'Collections (7 tools)',
                'Bookmarks (6 tools)',
                'Tags (2 tools)',
                'Highlights (4 tools)',
                'User (2 tools)',
                'Import/Export (3 tools)'
            ],
            features: [
                'Hierarchical tool naming (category_action pattern)',
                'Rich contextual descriptions with use cases',
                'Comprehensive parameter documentation',
                'Smart tool consolidation with operation parameters',
                'Standardized resource URI patterns (raindrop://type/scope)',
                'Enhanced error messages with actionable suggestions'
            ]
        },
        usage: {
            'MCP Inspector': `npx @modelcontextprotocol/inspector http://localhost:${PORT}/mcp`,
            'Direct API': `POST http://localhost:${PORT}/mcp`,
            'Compare with original': `Original server on port 3001, optimized on port ${PORT}`
        }
    });
});

// MCP endpoint with proper session handling
app.all('/mcp', async (req, res) => {
    try {
        // Check for existing session ID
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        let transport: StreamableHTTPServerTransport;

        if (sessionId && transports[sessionId]) {
            // Reuse existing transport
            transport = transports[sessionId];
            logger.debug(`Reusing optimized session: ${sessionId}`);
        } else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
            // New initialization request
            logger.info('Creating new optimized Streamable HTTP session');
            const { server, cleanup } = createOptimizedRaindropServer();

            transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => randomUUID(),
                onsessioninitialized: (sessionId) => {
                    transports[sessionId] = transport;
                    sessionMetadata.set(sessionId, {
                        id: sessionId,
                        created: new Date().toISOString(),
                        uptime: 0
                    });
                    logger.info(`New optimized Streamable HTTP session initialized: ${sessionId}`);
                }
            });

            // Clean up transport when closed
            transport.onclose = () => {
                if (transport.sessionId) {
                    delete transports[transport.sessionId];
                    sessionMetadata.delete(transport.sessionId);
                    logger.info(`Optimized Streamable HTTP session cleaned up: ${transport.sessionId}`);
                }
                // Cleanup is handled per session, not globally
            };

            // Connect to the MCP server
            await server.connect(transport);
        } else {
            // Invalid request
            logger.warn('Invalid optimized MCP request: missing session ID or invalid initialization');
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

        // Handle the request through transport
        await transport.handleRequest(req, res, req.body);
    } catch (error) {
        logger.error('Error handling optimized Streamable HTTP request:', error);
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

// Start server
const serverInstance = app.listen(PORT, () => {
    logger.info(`Optimized Raindrop MCP HTTP Server running on port ${PORT}`);
    logger.info(`MCP Inspector: npx @modelcontextprotocol/inspector http://localhost:${PORT}/mcp`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`Documentation: http://localhost:${PORT}/`);
    logger.info(`Optimizations: 24 tools (vs 37 original), enhanced AI-friendly interface`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down optimized HTTP server...');

    // Close all active sessions
    logger.info(`Closing ${Object.keys(transports).length} active optimized sessions`);

    // Clean up all transports
    Object.values(transports).forEach(transport => {
        try {
            transport.close();
        } catch (error) {
            logger.error('Error closing transport:', error);
        }
    });

    sessionMetadata.clear();

    // Close server
    serverInstance.close(() => {
        logger.info('Optimized HTTP server stopped');
        process.exit(0);
    });
});

export { app, activeSessions, transports };
