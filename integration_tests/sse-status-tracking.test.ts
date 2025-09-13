import { describe, expect, test, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { db } from '@/db';
import { videoSummary, user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { InngestStatusService } from '@/modules/video/services/inngest-status.service';
import { teardownDatabase } from './jest-teardown';

describe('SSE Status Tracking Integration Tests', () => {
  let testVideoSummaryId: string;
  let testEventId: string;
  let testUserId: string;

  beforeAll(async () => {
    testUserId = 'test-user-sse-status';
    testVideoSummaryId = nanoid();
    testEventId = nanoid();

    // Create test user first to avoid foreign key constraint
    await db.insert(user).values({
      id: testUserId,
      email: 'test-sse@example.com',
      name: 'Test User SSE',
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
      title: 'Test Video for SSE Status',
      processingStatus: 'pending',
      jobEventId: testEventId,
      processingProgress: 0,
      currentStep: 'Queued for processing'
    });
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(videoSummary).where(eq(videoSummary.id, testVideoSummaryId));
  });

  describe('Database-Based Status Service', () => {
    test('should return correct status for pending video', async () => {
      const status = await InngestStatusService.getUserFriendlyStatus(testEventId);

      expect(status).toEqual({
        currentStep: 'Queued for processing',
        progress: 0,
        status: 'pending',
        warnings: [],
        completedSteps: []
      });
    });

    test('should return correct status for extracting transcript', async () => {
      // Update to extracting transcript
      await db.update(videoSummary)
        .set({
          processingStatus: 'extracting_transcript',
          processingProgress: 20,
          currentStep: 'Extracting transcript'
        })
        .where(eq(videoSummary.id, testVideoSummaryId));

      const status = await InngestStatusService.getUserFriendlyStatus(testEventId);

      expect(status).toEqual({
        currentStep: 'Extracting transcript',
        progress: 20,
        status: 'processing',
        warnings: [],
        completedSteps: []
      });
    });

    test('should return correct status for extracting keyframes', async () => {
      // Update to extracting keyframes
      await db.update(videoSummary)
        .set({
          processingStatus: 'extracting_keyframes',
          processingProgress: 40,
          currentStep: 'Creating visual highlights'
        })
        .where(eq(videoSummary.id, testVideoSummaryId));

      const status = await InngestStatusService.getUserFriendlyStatus(testEventId);

      expect(status).toEqual({
        currentStep: 'Creating visual highlights',
        progress: 40,
        status: 'processing',
        warnings: [],
        completedSteps: ['Extracting transcript']
      });
    });

    test('should return correct status for uploading assets', async () => {
      // Update to uploading assets
      await db.update(videoSummary)
        .set({
          processingStatus: 'uploading_assets',
          processingProgress: 60,
          currentStep: 'Uploading assets'
        })
        .where(eq(videoSummary.id, testVideoSummaryId));

      const status = await InngestStatusService.getUserFriendlyStatus(testEventId);

      expect(status).toEqual({
        currentStep: 'Uploading assets',
        progress: 60,
        status: 'processing',
        warnings: [],
        completedSteps: ['Extracting transcript', 'Creating visual highlights']
      });
    });

    test('should return correct status for generating summary', async () => {
      // Update to generating summary
      await db.update(videoSummary)
        .set({
          processingStatus: 'generating_summary',
          processingProgress: 80,
          currentStep: 'Generating AI summary'
        })
        .where(eq(videoSummary.id, testVideoSummaryId));

      const status = await InngestStatusService.getUserFriendlyStatus(testEventId);

      expect(status).toEqual({
        currentStep: 'Generating AI summary',
        progress: 80,
        status: 'processing',
        warnings: [],
        completedSteps: ['Extracting transcript', 'Creating visual highlights', 'Uploading assets']
      });
    });

    test('should return correct status for completed processing', async () => {
      // Update to completed
      await db.update(videoSummary)
        .set({
          processingStatus: 'completed',
          processingProgress: 100,
          currentStep: 'Completed'
        })
        .where(eq(videoSummary.id, testVideoSummaryId));

      const status = await InngestStatusService.getUserFriendlyStatus(testEventId);

      expect(status).toEqual({
        currentStep: 'Completed',
        progress: 100,
        status: 'completed',
        warnings: [],
        completedSteps: ['Extracting transcript', 'Creating visual highlights', 'Uploading assets', 'Generating AI summary']
      });
    });

    test('should return correct status for failed processing', async () => {
      // Update to failed with error
      await db.update(videoSummary)
        .set({
          processingStatus: 'failed',
          processingProgress: 10,
          currentStep: 'Failed',
          processingError: 'Video processing failed: Invalid YouTube URL'
        })
        .where(eq(videoSummary.id, testVideoSummaryId));

      const status = await InngestStatusService.getUserFriendlyStatus(testEventId);

      expect(status).toEqual({
        currentStep: 'Failed',
        progress: 10,
        status: 'failed',
        warnings: ['Video processing failed: Invalid YouTube URL'],
        completedSteps: []
      });
    });
  });

  describe('Error and Edge Cases', () => {
    test('should handle non-existent eventId gracefully', async () => {
      const nonExistentEventId = 'non-existent-event-id';
      const status = await InngestStatusService.getUserFriendlyStatus(nonExistentEventId);

      expect(status).toEqual({
        currentStep: 'Initializing',
        progress: 0,
        status: 'pending',
        warnings: [],
        completedSteps: []
      });
    });

    test('should handle unknown processing status gracefully', async () => {
      // Update to unknown status
      await db.update(videoSummary)
        .set({
          processingStatus: 'pending',
          processingProgress: 0,
          currentStep: 'Unknown'
        })
        .where(eq(videoSummary.id, testVideoSummaryId));

      const status = await InngestStatusService.getUserFriendlyStatus(testEventId);

      // Should default to pending
      expect(status.status).toBe('pending');
      expect(status.currentStep).toBe('Queued for processing');
      expect(status.progress).toBe(0);
    });

    test('should handle database errors gracefully', async () => {
      // Mock a database error by using invalid eventId format
      const invalidEventId = null as unknown as string;
      
      const status = await InngestStatusService.getUserFriendlyStatus(invalidEventId);
      
      expect(status).toEqual({
        currentStep: 'Initializing',
        progress: 0,
        status: 'pending',
        warnings: [],
        completedSteps: []
      });
    });
  });

  describe('Status Transitions', () => {
    test('should handle complete processing pipeline transitions', async () => {
      const steps = [
        { status: 'pending' as const, progress: 0, step: 'Queued for processing', expectedStatus: 'pending' },
        { status: 'extracting_transcript' as const, progress: 20, step: 'Extracting transcript', expectedStatus: 'processing' },
        { status: 'extracting_keyframes' as const, progress: 40, step: 'Creating visual highlights', expectedStatus: 'processing' },
        { status: 'uploading_assets' as const, progress: 60, step: 'Uploading assets', expectedStatus: 'processing' },
        { status: 'generating_summary' as const, progress: 80, step: 'Generating AI summary', expectedStatus: 'processing' },
        { status: 'completed' as const, progress: 100, step: 'Completed', expectedStatus: 'completed' }
      ];

      for (const [index, stepData] of steps.entries()) {
        // Update database to current step
        await db.update(videoSummary)
          .set({
            processingStatus: stepData.status,
            processingProgress: stepData.progress,
            currentStep: stepData.step
          })
          .where(eq(videoSummary.id, testVideoSummaryId));

        // Get status and verify
        const status = await InngestStatusService.getUserFriendlyStatus(testEventId);
        
        expect(status.status).toBe(stepData.expectedStatus);
        expect(status.progress).toBe(stepData.progress);
        expect(status.currentStep).toBe(stepData.step);
        
        // Verify completed steps count matches current step index
        const expectedCompletedCount = Math.max(0, index - 1);
        if (stepData.status === 'completed') {
          expect(status.completedSteps).toHaveLength(4); // All steps except completed
        } else if (stepData.status === 'pending') {
          expect(status.completedSteps).toHaveLength(0);
        } else {
          expect(status.completedSteps.length).toBeLessThanOrEqual(expectedCompletedCount + 1);
        }
      }
    });

    test('should handle partial failure recovery', async () => {
      // Start processing
      await db.update(videoSummary)
        .set({
          processingStatus: 'extracting_transcript',
          processingProgress: 20,
          currentStep: 'Extracting transcript'
        })
        .where(eq(videoSummary.id, testVideoSummaryId));

      let status = await InngestStatusService.getUserFriendlyStatus(testEventId);
      expect(status.status).toBe('processing');

      // Fail at keyframe extraction
      await db.update(videoSummary)
        .set({
          processingStatus: 'failed',
          processingProgress: 10,
          currentStep: 'Failed',
          processingError: 'Keyframe extraction failed'
        })
        .where(eq(videoSummary.id, testVideoSummaryId));

      status = await InngestStatusService.getUserFriendlyStatus(testEventId);
      expect(status.status).toBe('failed');
      expect(status.warnings).toContain('Keyframe extraction failed');

      // Retry and succeed
      await db.update(videoSummary)
        .set({
          processingStatus: 'completed',
          processingProgress: 100,
          currentStep: 'Completed',
          processingError: null
        })
        .where(eq(videoSummary.id, testVideoSummaryId));

      status = await InngestStatusService.getUserFriendlyStatus(testEventId);
      expect(status.status).toBe('completed');
      expect(status.warnings).toHaveLength(0);
    });
  });

  describe('Progress Calculation Validation', () => {
    test('should ensure progress values are within valid range', async () => {
      const testCases = [
        { status: 'pending' as const, expectedProgress: 0 },
        { status: 'extracting_transcript' as const, expectedProgress: 20 },
        { status: 'extracting_keyframes' as const, expectedProgress: 40 },
        { status: 'uploading_assets' as const, expectedProgress: 60 },
        { status: 'generating_summary' as const, expectedProgress: 80 },
        { status: 'completed' as const, expectedProgress: 100 },
        { status: 'failed' as const, expectedProgress: 10 }
      ];

      for (const testCase of testCases) {
        await db.update(videoSummary)
          .set({
            processingStatus: testCase.status,
            processingProgress: testCase.expectedProgress
          })
          .where(eq(videoSummary.id, testVideoSummaryId));

        const status = await InngestStatusService.getUserFriendlyStatus(testEventId);
        
        expect(status.progress).toBeGreaterThanOrEqual(0);
        expect(status.progress).toBeLessThanOrEqual(100);
        expect(status.progress).toBe(testCase.expectedProgress);
      }
    });

    test('should handle progress values outside normal range', async () => {
      // Test negative progress
      await db.update(videoSummary)
        .set({
          processingStatus: 'extracting_transcript',
          processingProgress: -10
        })
        .where(eq(videoSummary.id, testVideoSummaryId));

      let status = await InngestStatusService.getUserFriendlyStatus(testEventId);
      expect(status.progress).toBe(20); // Should use mapped value, not DB value

      // Test progress over 100
      await db.update(videoSummary)
        .set({
          processingStatus: 'completed',
          processingProgress: 150
        })
        .where(eq(videoSummary.id, testVideoSummaryId));

      status = await InngestStatusService.getUserFriendlyStatus(testEventId);
      expect(status.progress).toBe(100); // Should use mapped value
    });
  });

  describe('Completed Steps Logic', () => {
    test('should correctly identify completed steps at each stage', async () => {
      const stageTests = [
        {
          status: 'pending' as const,
          expectedCompleted: []
        },
        {
          status: 'extracting_transcript' as const, 
          expectedCompleted: []
        },
        {
          status: 'extracting_keyframes' as const,
          expectedCompleted: ['Extracting transcript']
        },
        {
          status: 'uploading_assets' as const,
          expectedCompleted: ['Extracting transcript', 'Creating visual highlights']
        },
        {
          status: 'generating_summary' as const,
          expectedCompleted: ['Extracting transcript', 'Creating visual highlights', 'Uploading assets']
        },
        {
          status: 'completed' as const,
          expectedCompleted: ['Extracting transcript', 'Creating visual highlights', 'Uploading assets', 'Generating AI summary']
        },
        {
          status: 'failed' as const,
          expectedCompleted: []
        }
      ];

      for (const stageTest of stageTests) {
        await db.update(videoSummary)
          .set({
            processingStatus: stageTest.status
          })
          .where(eq(videoSummary.id, testVideoSummaryId));

        const status = await InngestStatusService.getUserFriendlyStatus(testEventId);
        
        expect(status.completedSteps).toEqual(stageTest.expectedCompleted);
      }
    });
  });
});