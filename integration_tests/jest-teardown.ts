import { client } from '@/db';

let isClientClosed = false;

export async function teardownDatabase() {
  if (!isClientClosed) {
    try {
      await client.end();
      isClientClosed = true;
    } catch (error) {
      // Ignore errors during cleanup
      console.warn('Database client cleanup warning:', error);
    }
  }
}

// Ensure cleanup happens on process exit
process.on('beforeExit', teardownDatabase);
process.on('SIGINT', teardownDatabase);
process.on('SIGTERM', teardownDatabase);