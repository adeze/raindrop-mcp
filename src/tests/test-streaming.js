#!/usr/bin/env node

/**
 * Test script for streaming capabilities
 * This script tests the streaming functionality without requiring actual API tokens
 */

import { createRaindropServer } from '../services/mcp.service.js';

async function testStreamingCapabilities() {
  console.log('🧪 Testing Streaming Capabilities\n');
  
  try {
    // Create the server instance
    const { server, cleanup } = createRaindropServer();
    
    console.log('✅ Server created successfully');
    
    // Test getting streaming capabilities
    const capabilities = await server.request({
      method: 'tools/call',
      params: {
        name: 'getStreamingCapabilities'
      }
    });
    
    console.log('✅ Streaming capabilities retrieved');
    console.log('📋 Capabilities:', JSON.stringify(capabilities, null, 2));
    
    // Test listing tools to see streaming tools
    const tools = await server.request({
      method: 'tools/list'
    });
    
    console.log('\n📋 Available Tools:');
    tools.tools?.forEach((tool: any) => {
      if (tool.name.includes('stream')) {
        console.log(`  🌊 ${tool.name}: ${tool.description}`);
      } else {
        console.log(`  🔧 ${tool.name}: ${tool.description}`);
      }
    });
    
    // Test listing resources to see streaming resources
    const resources = await server.request({
      method: 'resources/list'
    });
    
    console.log('\n📋 Available Resources:');
    resources.resources?.forEach((resource: any) => {
      if (resource.uri.includes('stream')) {
        console.log(`  🌊 ${resource.uri}: ${resource.description || 'Streaming resource'}`);
      } else {
        console.log(`  📄 ${resource.uri}: ${resource.description || 'Standard resource'}`);
      }
    });
    
    console.log('\n✅ All streaming tests passed!');
    console.log('\n📊 Summary:');
    console.log(`   - Regular tools: ${tools.tools?.filter((t: any) => !t.name.includes('stream')).length || 0}`);
    console.log(`   - Streaming tools: ${tools.tools?.filter((t: any) => t.name.includes('stream')).length || 0}`);
    console.log(`   - Regular resources: ${resources.resources?.filter((r: any) => !r.uri.includes('stream')).length || 0}`);
    console.log(`   - Streaming resources: ${resources.resources?.filter((r: any) => r.uri.includes('stream')).length || 0}`);
    
    await cleanup();
    
  } catch (error) {
    console.error('❌ Error testing streaming capabilities:', error);
    process.exit(1);
  }
}

// Run the test
testStreamingCapabilities().catch(console.error);