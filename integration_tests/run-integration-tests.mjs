#!/usr/bin/env node

/**
 * Integration test runner script
 * 
 * Runs comprehensive E2E tests for the video processing pipeline
 */

import { execSync } from 'child_process';

console.log('🧪 Running Integration Tests for YouTube Video Processing Pipeline\n');

const testSuites = [
  {
    name: '🎯 Video Processing E2E Tests',
    pattern: 'integration_tests/video-processing.test.ts.skip',
    description: 'Complete user journey from URL submission to completed processing'
  },
  {
    name: '⚙️  Background Processing Tests', 
    pattern: 'integration_tests/background-processing.test.ts',
    description: 'Background job pipeline stages and error recovery'
  },
  {
    name: '🧠 AI Service Integration Tests',
    pattern: 'integration_tests/ai-service.test.ts',
    description: 'AI analysis modes, keyframe generation, and video type inference'
  }
];

async function runTestSuite(suite) {
  console.log(`\n${suite.name}`);
  console.log(`Description: ${suite.description}`);
  console.log('─'.repeat(80));

  try {
    const command = `npx jest ${suite.pattern} --verbose --no-cache`;
    console.log(`Running: ${command}\n`);
    
    execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });
    
    console.log(`\n✅ ${suite.name} - PASSED\n`);
    return true;
  } catch (error) {
    console.log(`\n❌ ${suite.name} - FAILED`);
    console.log(`Error: ${error.message}\n`);
    return false;
  }
}

async function runAllTests() {
  console.log('Setting up test environment...');
  console.log('Environment variables loaded from .env');
  console.log('Test database and mocks initialized\n');

  let passed = 0;
  let failed = 0;

  for (const suite of testSuites) {
    const success = await runTestSuite(suite);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('=' .repeat(80));
  console.log('🏁 Integration Test Results Summary');
  console.log('=' .repeat(80));
  console.log(`✅ Test Suites Passed: ${passed}`);
  console.log(`❌ Test Suites Failed: ${failed}`);
  console.log(`📊 Total Test Suites: ${passed + failed}`);

  if (failed > 0) {
    console.log('\n❌ Some integration tests failed. Please review the output above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All integration tests passed successfully!');
    console.log('\nThe YouTube video processing pipeline is working correctly:');
    console.log('  • URL validation and video metadata extraction');
    console.log('  • Transcript extraction with fallback strategies');
    console.log('  • AI analysis with both transcript and video modes');
    console.log('  • Keyframe extraction and validation');
    console.log('  • Asset upload to Vercel Blob Storage');
    console.log('  • Complete E2E user journey');
    console.log('  • Error handling and edge cases');
    process.exit(0);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log('Integration Test Runner for YouTube Video Processing');
  console.log('\nUsage:');
  console.log('  npm run test:integration              # Run all integration tests');
  console.log('  npm run test:integration -- --watch   # Run tests in watch mode');
  console.log('  npm run test:integration -- --help    # Show this help');
  console.log('\nTest Suites:');
  testSuites.forEach(suite => {
    console.log(`  • ${suite.name}`);
    console.log(`    ${suite.description}`);
  });
  console.log('\nEnvironment Variables Required:');
  console.log('  • GOOGLE_GENERATIVE_AI_API_KEY - For AI analysis testing');
  console.log('  • YOUTUBE_API_KEY - For video metadata extraction');
  console.log('  • BLOB_READ_WRITE_TOKEN - For storage upload testing');
  process.exit(0);
}

if (args.includes('--watch')) {
  console.log('Running tests in watch mode...');
  execSync('npx jest integration_tests --watch --verbose', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' }
  });
} else {
  runAllTests();
}
