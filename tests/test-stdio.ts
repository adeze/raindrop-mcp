#!/usr/bin/env node
/**
 * Test STDIO Transport Implementation
 * 
 * This script validates that:
 * 1. No extraneous stdout output occurs
 * 2. Only MCP protocol messages go to stdout
 * 3. All logging goes to stderr
 * 4. Graceful shutdown works properly
 */

import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const TIMEOUT_MS = 5000;
const RAINDROP_TOKEN = process.env.RAINDROP_ACCESS_TOKEN || 'dummy-token-for-testing';

async function testStdioTransport() {
    console.log('🧪 Testing STDIO Transport Implementation');
    console.log('=' .repeat(50));
    
    // Create log files for output capture
    const stdoutFile = '/tmp/stdio-test-stdout.log';
    const stderrFile = '/tmp/stdio-test-stderr.log';
    
    const stdoutStream = createWriteStream(stdoutFile);
    const stderrStream = createWriteStream(stderrFile);
    
    console.log('📋 Test Plan:');
    console.log('1. Start STDIO server with tsx');
    console.log('2. Send MCP initialize message');
    console.log('3. Verify stdout contains only MCP protocol messages');
    console.log('4. Verify stderr contains logging/diagnostics');
    console.log('5. Test graceful shutdown with SIGTERM');
    console.log('');
    
    return new Promise((resolve, reject) => {
        // Start the STDIO server
        const serverProcess = spawn('npx', ['tsx', join(__dirname, '../src/index.ts')], {
            env: { 
                ...process.env, 
                RAINDROP_ACCESS_TOKEN: RAINDROP_TOKEN 
            },
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Capture stdout and stderr
        let stdoutData = '';
        let stderrData = '';
        
        serverProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
            stdoutStream.write(data);
        });
        
        serverProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
            stderrStream.write(data);
        });
        
        serverProcess.on('error', (error) => {
            console.error('❌ Failed to start server:', error.message);
            reject(error);
        });
        
        // Give server time to start
        setTimeout(() => {
            console.log('📤 Sending MCP initialize message...');
            
            // Send MCP initialize message
            const initMessage = {
                jsonrpc: '2.0',
                id: 1,
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    capabilities: {},
                    clientInfo: {
                        name: 'stdio-test-client',
                        version: '1.0.0'
                    }
                }
            };
            
            serverProcess.stdin.write(JSON.stringify(initMessage) + '\n');
            
            // Wait for response then test shutdown
            setTimeout(() => {
                console.log('🛑 Testing graceful shutdown (SIGTERM)...');
                serverProcess.kill('SIGTERM');
                
                // Wait for shutdown
                setTimeout(() => {
                    console.log('📊 Analyzing Results:');
                    console.log('');
                    
                    // Analyze stdout - should only contain MCP protocol messages
                    console.log(`📤 STDOUT (${stdoutData.length} chars):`);
                    if (stdoutData.length === 0) {
                        console.log('⚠️  No stdout output (may indicate server startup issue)');
                    } else {
                        // Check if stdout looks like JSON-RPC
                        try {
                            const lines = stdoutData.trim().split('\n').filter(line => line.trim());
                            let validJsonRpc = true;
                            
                            for (const line of lines) {
                                const parsed = JSON.parse(line);
                                if (!parsed.jsonrpc || parsed.jsonrpc !== '2.0') {
                                    validJsonRpc = false;
                                    console.log(`❌ Invalid JSON-RPC message: ${line}`);
                                    break;
                                }
                            }
                            
                            if (validJsonRpc) {
                                console.log('✅ All stdout output is valid JSON-RPC 2.0');
                                console.log(`   Found ${lines.length} MCP protocol message(s)`);
                            }
                        } catch (error) {
                            console.log('❌ STDOUT contains invalid JSON:', stdoutData.substring(0, 200));
                        }
                    }
                    
                    // Analyze stderr - should contain logging
                    console.log('');
                    console.log(`📥 STDERR (${stderrData.length} chars):`);
                    if (stderrData.length === 0) {
                        console.log('⚠️ No stderr output (expected some diagnostic messages)');
                    } else {
                        console.log('✅ Stderr contains diagnostic output as expected');
                        if (stderrData.includes('Received SIGTERM, shutting down gracefully')) {
                            console.log('✅ Graceful shutdown message found');
                        } else {
                            console.log('⚠️ Expected graceful shutdown message not found');
                        }
                        if (stderrData.includes('Shutdown complete')) {
                            console.log('✅ Shutdown completion message found');
                        }
                    }
                    
                    // Clean up
                    stdoutStream.end();
                    stderrStream.end();
                    
                    console.log('');
                    console.log('📁 Full logs saved to:');
                    console.log(`   STDOUT: ${stdoutFile}`);
                    console.log(`   STDERR: ${stderrFile}`);
                    
                    resolve({
                        stdoutLength: stdoutData.length,
                        stderrLength: stderrData.length,
                        stdoutContent: stdoutData,
                        stderrContent: stderrData
                    });
                }, 2000);
            }, 1000);
        }, 1000);
        
        // Overall timeout
        setTimeout(() => {
            console.log('⏰ Test timeout - killing server');
            serverProcess.kill('SIGKILL');
            reject(new Error('Test timeout'));
        }, TIMEOUT_MS);
    });
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
    testStdioTransport()
        .then((result) => {
            console.log('');
            console.log('🎉 STDIO Transport Test Complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Test failed:', error.message);
            process.exit(1);
        });
}

export { testStdioTransport };