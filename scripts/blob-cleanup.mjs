#!/usr/bin/env node

import { list, del } from '@vercel/blob';

async function cleanupBlobs() {
  try {
    console.log('📦 Fetching blob list...');

    // List all blobs
    const listResult = await list({
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    if (!listResult.blobs || listResult.blobs.length === 0) {
      console.log('ℹ️  No blobs found in storage.');
      return;
    }

    console.log(`📊 Found ${listResult.blobs.length} blobs to delete:`);
    listResult.blobs.forEach((blob, index) => {
      console.log(`  ${index + 1}. ${blob.pathname} (${(blob.size / 1024).toFixed(2)} KB)`);
    });

    console.log('\n🗑️  Deleting blobs...');

    // Delete all blobs
    const blobUrls = listResult.blobs.map(blob => blob.url);

    if (blobUrls.length > 0) {
      await del(blobUrls, {
        token: process.env.BLOB_READ_WRITE_TOKEN
      });

      console.log('✅ All blobs deleted successfully!');
    }

  } catch (error) {
    console.error('❌ Error during blob cleanup:', error.message);
    if (error.message.includes('token')) {
      console.error('   Make sure BLOB_READ_WRITE_TOKEN is set correctly.');
    }
    process.exit(1);
  }
}

// Check if required environment variable is set
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('❌ Error: BLOB_READ_WRITE_TOKEN environment variable is not set.');
  process.exit(1);
}

// Run cleanup
cleanupBlobs();