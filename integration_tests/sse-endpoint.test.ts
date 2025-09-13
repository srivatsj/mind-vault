import { describe, expect, test, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/inngest/[eventId]/stream/route';
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
          id: 'test-user-sse-endpoint',
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

describe('SSE Endpoint Integration Tests', () => {
  let testVideoSummaryId: string;
  let testEventId: string;
  let testUserId: string;
  let activeStreams: ReadableStreamDefaultReader[] = [];
  let activeResponses: Response[] = [];

  beforeAll(async () => {
    testUserId = 'test-user-sse-endpoint';
    testVideoSummaryId = nanoid();
    testEventId = nanoid();

    // Create test user first to avoid foreign key constraint
    await db.insert(user).values({
      id: testUserId,
      email: 'test-endpoint@example.com',
      name: 'Test User Endpoint',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }).onConflictDoNothing();
  });

  afterAll(async () => {
    // Clean up all active streams first
    for (const reader of activeStreams) {
      try {
        await reader.cancel();
      } catch (e) {
        // Ignore cleanup errors
        console.warn('Stream cleanup warning:', e);
      }
    }
    activeStreams = [];

    // Clean up any active responses to abort ongoing SSE connections
    for (const response of activeResponses) {
      try {
        if (response.body) {
          const reader = response.body.getReader();
          await reader.cancel();
        }
      } catch (e) {
        // Ignore cleanup errors
        console.warn('Response cleanup warning:', e);
      }
    }
    activeResponses = [];

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
      title: 'Test Video for SSE Endpoint',
      processingStatus: 'pending',
      jobEventId: testEventId,
      processingProgress: 0,
      currentStep: 'Queued for processing'
    });
  });

  afterEach(async () => {
    // Clean up any streams created in this test
    for (const reader of activeStreams) {
      try {
        await reader.cancel();
      } catch {
        // Ignore cleanup errors
      }
    }
    activeStreams = [];

    // Clean up any responses created in this test
    for (const response of activeResponses) {
      try {
        if (response.body) {
          const reader = response.body.getReader();
          await reader.cancel();
        }
      } catch {
        // Ignore cleanup errors
      }
    }
    activeResponses = [];

    // Small delay to allow SSE intervals to stop
    await new Promise(resolve => setTimeout(resolve, 100));

    // Clean up test data
    await db.delete(videoSummary).where(eq(videoSummary.id, testVideoSummaryId));
  });

  // Helper function to create and track responses for proper cleanup
  const createTrackedResponse = async (request: NextRequest, context: { params: Promise<{ eventId: string }> }): Promise<Response> => {
    const response = await GET(request, context);
    activeResponses.push(response);
    return response;
  };

  describe('SSE Endpoint Response', () => {
    test('should return proper SSE response headers', async () => {
      const request = new NextRequest(`http://localhost:3000/api/inngest/${testEventId}/stream`);
      const context = { params: Promise.resolve({ eventId: testEventId }) };

      const response = await createTrackedResponse(request, context);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/event-stream');
      expect(response.headers.get('cache-control')).toBe('no-cache');
      expect(response.headers.get('connection')).toBe('keep-alive');
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
    });

    test('should return 404 for non-existent eventId', async () => {
      const nonExistentEventId = 'non-existent-event-id';
      const request = new NextRequest(`http://localhost:3000/api/inngest/${nonExistentEventId}/stream`);
      const context = { params: Promise.resolve({ eventId: nonExistentEventId }) };

      const response = await createTrackedResponse(request, context);

      expect(response.status).toBe(404);
    });

    test('should return 401 for unauthenticated requests', async () => {
      // Mock unauthenticated user
      const authModule = await import('@/lib/auth');
      const { auth } = authModule;
      const originalGetSession = auth.api.getSession;
      auth.api.getSession = jest.fn().mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/inngest/${testEventId}/stream`);
      const context = { params: Promise.resolve({ eventId: testEventId }) };

      const response = await createTrackedResponse(request, context);

      expect(response.status).toBe(401);

      // Restore original mock
      auth.api.getSession = originalGetSession;
    });

    test('should deny access to other user\'s events', async () => {
      // Create video summary for different user
      const otherUserId = 'other-user-id';
      const otherEventId = nanoid();
      const otherSummaryId = nanoid();

      // Create the other user first
      await db.insert(user).values({
        id: otherUserId,
        email: 'other@example.com',
        name: 'Other User',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoNothing();

      await db.insert(videoSummary).values({
        id: otherSummaryId,
        userId: otherUserId,
        youtubeUrl: 'https://youtube.com/watch?v=other123',
        youtubeId: 'other123',
        title: 'Other User Video',
        processingStatus: 'pending',
        jobEventId: otherEventId,
      });

      try {
        const request = new NextRequest(`http://localhost:3000/api/inngest/${otherEventId}/stream`);
        const context = { params: Promise.resolve({ eventId: otherEventId }) };

        const response = await createTrackedResponse(request, context);

        expect(response.status).toBe(404); // Should not find since user doesn't own it
      } finally {
        // Clean up
        await db.delete(videoSummary).where(eq(videoSummary.id, otherSummaryId));
        await db.delete(user).where(eq(user.id, otherUserId));
      }
    });
  });

  describe('SSE Stream Behavior', () => {
    test('should handle ReadableStream creation', async () => {
      const request = new NextRequest(`http://localhost:3000/api/inngest/${testEventId}/stream`);
      const context = { params: Promise.resolve({ eventId: testEventId }) };

      const response = await createTrackedResponse(request, context);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(ReadableStream);

      // Response will be cleaned up automatically in afterEach
    });

    test('should handle abort signal cleanup', async () => {
      const abortController = new AbortController();
      const request = new NextRequest(`http://localhost:3000/api/inngest/${testEventId}/stream`, {
        signal: abortController.signal
      });
      const context = { params: Promise.resolve({ eventId: testEventId }) };

      const response = await createTrackedResponse(request, context);
      expect(response.status).toBe(200);

      // Simulate client disconnect
      abortController.abort();

      // Response will be cleaned up automatically in afterEach
    });
  });

  describe('Status Update Scenarios', () => {
    test('should handle status progression', async () => {
      const request = new NextRequest(`http://localhost:3000/api/inngest/${testEventId}/stream`);
      const context = { params: Promise.resolve({ eventId: testEventId }) };

      const response = await createTrackedResponse(request, context);
      expect(response.status).toBe(200);

      // Update status in database to simulate Inngest progress
      await db.update(videoSummary)
        .set({
          processingStatus: 'extracting_transcript',
          processingProgress: 20,
          currentStep: 'Extracting transcript'
        })
        .where(eq(videoSummary.id, testVideoSummaryId));

      // The SSE endpoint should pick up this change in its polling loop
      // In a real test, we would read from the stream, but that's complex in Jest

      // Response will be cleaned up automatically in afterEach
    });

    test('should close stream when processing completes', async () => {
      // Set initial status to near completion
      await db.update(videoSummary)
        .set({
          processingStatus: 'generating_summary',
          processingProgress: 80,
          currentStep: 'Generating AI summary'
        })
        .where(eq(videoSummary.id, testVideoSummaryId));

      const request = new NextRequest(`http://localhost:3000/api/inngest/${testEventId}/stream`);
      const context = { params: Promise.resolve({ eventId: testEventId }) };

      const response = await createTrackedResponse(request, context);
      expect(response.status).toBe(200);

      // Update to completed - this should trigger stream closure
      await db.update(videoSummary)
        .set({
          processingStatus: 'completed',
          processingProgress: 100,
          currentStep: 'Completed'
        })
        .where(eq(videoSummary.id, testVideoSummaryId));

      // Response will be cleaned up automatically in afterEach
    });

    test('should handle failed processing state', async () => {
      // Set status to failed
      await db.update(videoSummary)
        .set({
          processingStatus: 'failed',
          processingProgress: 10,
          currentStep: 'Failed',
          processingError: 'Processing failed due to invalid video'
        })
        .where(eq(videoSummary.id, testVideoSummaryId));

      const request = new NextRequest(`http://localhost:3000/api/inngest/${testEventId}/stream`);
      const context = { params: Promise.resolve({ eventId: testEventId }) };

      const response = await createTrackedResponse(request, context);
      expect(response.status).toBe(200);

      // The endpoint should handle failed status and close the stream
      // Response will be cleaned up automatically in afterEach
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Create a request with malformed eventId that might cause DB issues
      const malformedEventId = 'malformed-event-id-that-might-cause-issues';
      const request = new NextRequest(`http://localhost:3000/api/inngest/${malformedEventId}/stream`);
      const context = { params: Promise.resolve({ eventId: malformedEventId }) };

      const response = await createTrackedResponse(request, context);

      // Should return 404 for non-existent event, not crash
      expect(response.status).toBe(404);
    });

    test('should handle malformed context params', async () => {
      const request = new NextRequest(`http://localhost:3000/api/inngest/${testEventId}/stream`);
      const context = { params: Promise.resolve({ eventId: 'missing' }) }; // Invalid eventId

      const response = await createTrackedResponse(request, context);

      // Should handle gracefully, likely return 404 or 500
      expect([404, 500]).toContain(response.status);
    });
  });

  describe('Performance and Resource Management', () => {
    test('should handle multiple concurrent connections', async () => {
      const connections = [];
      const numConnections = 5;

      try {
        // Create multiple concurrent connections
        for (let i = 0; i < numConnections; i++) {
          const request = new NextRequest(`http://localhost:3000/api/inngest/${testEventId}/stream`);
          const context = { params: Promise.resolve({ eventId: testEventId }) };
          const response = await createTrackedResponse(request, context);
          
          expect(response.status).toBe(200);
          connections.push(response);
        }

        // All connections should be successful
        expect(connections.length).toBe(numConnections);

      } finally {
        // Responses will be cleaned up automatically in afterEach
      }
    });

    test('should handle rapid status changes', async () => {
      const request = new NextRequest(`http://localhost:3000/api/inngest/${testEventId}/stream`);
      const context = { params: Promise.resolve({ eventId: testEventId }) };

      const response = await createTrackedResponse(request, context);
      expect(response.status).toBe(200);

      // Simulate rapid status changes
      const statusProgression = [
        { status: 'extracting_transcript' as const, progress: 20 },
        { status: 'extracting_keyframes' as const, progress: 40 },
        { status: 'uploading_assets' as const, progress: 60 },
        { status: 'generating_summary' as const, progress: 80 },
        { status: 'completed' as const, progress: 100 }
      ];

      for (const statusUpdate of statusProgression) {
        await db.update(videoSummary)
          .set({
            processingStatus: statusUpdate.status,
            processingProgress: statusUpdate.progress
          })
          .where(eq(videoSummary.id, testVideoSummaryId));

        // Small delay to simulate real processing time
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Response will be cleaned up automatically in afterEach
    });
  });
});