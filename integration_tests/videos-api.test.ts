import { describe, expect, test, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/videos/[id]/route';
import { db } from '@/db';
import { videoSummary, user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { teardownDatabase } from './jest-teardown';

// Mock auth for testing
jest.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: jest.fn().mockResolvedValue({
        user: {
          id: 'test-user-videos-api',
          email: 'test@example.com'
        }
      })
    }
  }
}));

// Mock headers
jest.mock('next/headers', () => ({
  headers: jest.fn(() => Promise.resolve(new Headers()))
}));

describe('Videos API Integration Tests', () => {
  let testVideoSummaryId: string;
  let testUserId: string;

  beforeAll(async () => {
    testUserId = 'test-user-videos-api';
    testVideoSummaryId = nanoid();

    // Create test user first to avoid foreign key constraint
    await db.insert(user).values({
      id: testUserId,
      email: 'test-videos@example.com',
      name: 'Test User Videos',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }).onConflictDoNothing();
  });

  afterAll(async () => {
    // Clean up test user
    await db.delete(user).where(eq(user.id, testUserId));
    
    // Close database connections to prevent Jest hanging
    await teardownDatabase();
  });

  beforeEach(async () => {
    // Create test video summary record
    await db.insert(videoSummary).values({
      id: testVideoSummaryId,
      userId: testUserId,
      youtubeUrl: 'https://youtube.com/watch?v=test123',
      youtubeId: 'test123',
      title: 'Test Video for API',
      processingStatus: 'completed',
      jobEventId: nanoid(),
      processingProgress: 100,
      currentStep: 'Completed'
    });
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(videoSummary).where(eq(videoSummary.id, testVideoSummaryId));
  });

  describe('GET /api/videos/[id]', () => {
    test('should return video data for valid request', async () => {
      const request = new NextRequest(`http://localhost:3000/api/videos/${testVideoSummaryId}`);
      const context = { params: Promise.resolve({ id: testVideoSummaryId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toMatchObject({
        id: testVideoSummaryId,
        userId: testUserId,
        title: 'Test Video for API',
        processingStatus: 'completed'
      });
    });

    test('should return 404 for non-existent video', async () => {
      const nonExistentId = 'non-existent-id';
      const request = new NextRequest(`http://localhost:3000/api/videos/${nonExistentId}`);
      const context = { params: Promise.resolve({ id: nonExistentId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(404);
    });

    test('should return 401 for unauthenticated requests', async () => {
      // Mock unauthenticated user
      const authModule = await import('@/lib/auth');
      const { auth } = authModule;
      const originalGetSession = auth.api.getSession;
      auth.api.getSession = jest.fn().mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/videos/${testVideoSummaryId}`);
      const context = { params: Promise.resolve({ id: testVideoSummaryId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(401);

      // Restore original mock
      auth.api.getSession = originalGetSession;
    });

    test('should return 400 for invalid video ID', async () => {
      const request = new NextRequest(`http://localhost:3000/api/videos/`);
      const context = { params: Promise.resolve({ id: '' }) };

      const response = await GET(request, context);

      expect(response.status).toBe(400);
    });
  });
});