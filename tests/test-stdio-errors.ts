#!/usr/bin/env node
/**
 * Test STDIO Error Handling and Shutdown
 * 
 * This script validates error handling and graceful shutdown scenarios
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testErrorHandling() {
    console.log('🧪 Testing STDIO Error Handling');
    console.log('=' .repeat(40));
    
    // Test 1: Missing environment variable
    console.log('📋 Test 1: Missing RAINDROP_ACCESS_TOKEN');
    
    return new Promise((resolve, reject) => {
        const serverProcess = spawn('npx', ['tsx', join(__dirname, '../src/index.ts')], {
            env: { 
                ...process.env,
                RAINDROP_ACCESS_TOKEN: undefined // Remove the token
            },
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stderrData = '';
        let stdoutData = '';
        
        serverProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });
        
        serverProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });
        
        serverProcess.on('exit', (code) => {
            console.log(`📊 Server exited with code: ${code}`);
            
            if (code !== 0) {
                console.log('✅ Server correctly exited with error code');
            } else {
                console.log('⚠️ Expected non-zero exit code for missing token');
            }
            
            console.log(`📤 STDOUT (${stdoutData.length} chars):`);
            if (stdoutData.length > 0) {
                console.log('⚠️ Unexpected stdout output during error:', stdoutData.substring(0, 200));
            } else {
                console.log('✅ No stdout output during error (correct)');
            }
            
            console.log(`📥 STDERR (${stderrData.length} chars):`);
            if (stderrData.length > 0) {
                console.log('✅ Error logged to stderr as expected');
                if (stderrData.includes('RAINDROP_ACCESS_TOKEN')) {
                    console.log('✅ Error message mentions missing token');
                }
                // Show first 500 chars of error
                console.log('Error details:', stderrData.substring(0, 500));
            } else {
                console.log('❌ No stderr output (expected error message)');
            }
            
            resolve({ code, stdoutData, stderrData });
        });
        
        // Give it a moment to start and fail
        setTimeout(() => {
            if (!serverProcess.killed) {
                serverProcess.kill('SIGTERM');
            }
        }, 3000);
    });
}

async function testShutdownSignals() {
    console.log('\n🧪 Testing Shutdown Signals');
    console.log('=' .repeat(40));
    
    for (const signal of ['SIGTERM', 'SIGINT']) {
        console.log(`\n📋 Testing ${signal} signal`);
        
        await new Promise((resolve) => {
            const serverProcess = spawn('npx', ['tsx', join(__dirname, '../src/index.ts')], {
                env: { 
                    ...process.env,
                    RAINDROP_ACCESS_TOKEN: 'dummy-token-for-test'
                },
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let stderrData = '';
            
            serverProcess.stderr.on('data', (data) => {
                stderrData += data.toString();
            });
            
            serverProcess.on('exit', (code) => {
                console.log(`📊 Server exited with code: ${code} after ${signal}`);
                
                if (code === 0) {
                    console.log('✅ Clean exit after signal');
                } else {
                    console.log(`⚠️ Exit code ${code} (may be expected for signal)`);
                }
                
                if (stderrData.includes(`Received ${signal}`)) {
                    console.log('✅ Graceful shutdown message found');
                } else {
                    console.log('⚠️ Graceful shutdown message not found');
                    console.log('Stderr content:', stderrData.substring(0, 300));
                }
                
                resolve(null);
            });
            
            // Give server time to start, then send signal
            setTimeout(() => {
                console.log(`📤 Sending ${signal} signal...`);
                serverProcess.kill(signal);
            }, 1500);
            
            // Force kill if it hangs
            setTimeout(() => {
                if (!serverProcess.killed) {
                    console.log('⏰ Force killing hung process');
                    serverProcess.kill('SIGKILL');
                    resolve(null);
                }
            }, 5000);
        });
    }
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
    (async () => {
        try {
            await testErrorHandling();
            await testShutdownSignals();
            console.log('\n🎉 All error handling tests completed');
        } catch (error) {
            console.error('❌ Test failed:', error.message);
            process.exit(1);
        }
    })();
}

export { testErrorHandling, testShutdownSignals };