#!/usr/bin/env bun
/**
 * Simple test to verify logging and diagnostics functionality
 */

import { createLogger } from '../src/utils/logger.js';
import { createOptimizedRaindropServer } from '../src/services/mcp-optimized.service.js';

async function testLogging() {
    console.log('Testing logging system...');
    
    const logger = createLogger('test');
    
    // Test different log levels
    logger.debug('This is a debug message');
    logger.info('This is an info message'); 
    logger.warn('This is a warning message');
    logger.error('This is an error message');
    
    // Test child logger
    const childLogger = logger.child('child-context');
    childLogger.info('This is from a child logger');
    
    console.log('✅ Logging test completed (check stderr for log output)');
}

async function testDiagnostics() {
    console.log('Testing diagnostics tool...');
    
    try {
        const { server, cleanup } = createOptimizedRaindropServer();
        
        console.log(`✅ MCP Server created successfully`);
        console.log(`✅ Server type: ${server.constructor.name}`);
        
        // Clean up
        await cleanup();
        console.log('✅ Diagnostics test completed');
        
    } catch (error) {
        console.error('❌ Diagnostics test failed:', error);
        process.exit(1);
    }
}

async function main() {
    console.log('🧪 Running logging and diagnostics tests...\n');
    
    await testLogging();
    console.log('');
    await testDiagnostics();
    
    console.log('\n🎉 All tests completed successfully!');
}

if (import.meta.main) {
    main().catch(console.error);
}