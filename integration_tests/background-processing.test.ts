/**
 * Integration tests for background video processing pipeline
 * 
 * Tests the background job processing system that handles:
 * 1. Transcript extraction
 * 2. AI analysis and keyframe generation  
 * 3. Keyframe extraction from video
 * 4. Asset upload to storage
 * 5. Processing completion
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { db, client } from '@/db';
import { user, videoSummary } from '@/db/schema';
import { VideoSummaryDao } from '@/modules/video/data/video-summary.dao';
import { eq } from 'drizzle-orm';

// Types for test objects
interface MockKeyframe {
  timestamp: number;
  reason: string;
  confidence: number;
  category: string;
}
import { 
  mockTranscriptService,
  mockAIService,
  mockKeyframeService,
  mockStorageService,
  setupTestEnvironment,
  generateTestVideoData,
  type TestVideoData,
} from './utils/test-helpers';
import { 
  mockTranscriptData, 
  expectedAIAnalysisResults 
} from './fixtures/video-data';

// Mock services except for the DAO
jest.mock('@/modules/video/services/transcript.service');
jest.mock('@/modules/video/services/ai.service');
jest.mock('@/modules/video/services/keyframe.service');
jest.mock('@/modules/video/services/storage.service');

describe('Background Video Processing Pipeline with Real DB', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockServices: any;
  let testData: TestVideoData;
  let testUser: (typeof user.$inferSelect);
  let testVideo: (typeof videoSummary.$inferSelect);

  beforeEach(async () => {
    setupTestEnvironment();
    
    mockServices = {
      transcript: mockTranscriptService(),
      ai: mockAIService(),
      keyframe: mockKeyframeService(),
      storage: mockStorageService(),
    };

    testData = generateTestVideoData();

    // Create test user and video summary in the database
    testUser = await db.insert(user).values({
      id: 'test-user-for-pipeline',
      name: 'Test User',
      email: 'pipeline@test.com',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning().then(res => res[0]);

    testVideo = await db.insert(videoSummary).values({
      id: 'test-video-for-pipeline',
      userId: testUser.id,
      youtubeUrl: testData.youtubeUrl,
      youtubeId: testData.youtubeId,
      title: testData.title,
      description: testData.description,
      duration: testData.duration,
      channelName: testData.channelName,
      thumbnailUrl: testData.thumbnailUrl,
    }).returning().then(res => res[0]);

    testData.videoSummaryId = testVideo.id;

    // Apply mocks to actual modules
    const transcriptServiceModule = await import('@/modules/video/services/transcript.service');
    Object.assign(transcriptServiceModule.TranscriptService, mockServices.transcript);
    const aiServiceModule = await import('@/modules/video/services/ai.service');
    Object.assign(aiServiceModule.AIService, mockServices.ai);
    const keyframeServiceModule = await import('@/modules/video/services/keyframe.service');
    Object.assign(keyframeServiceModule.KeyframeService, mockServices.keyframe);
    const storageServiceModule = await import('@/modules/video/services/storage.service');
    Object.assign(storageServiceModule.StorageService, mockServices.storage);
  });

  afterEach(async () => {
    // Clean up database
    if (testVideo) {
      await db.delete(videoSummary).where(eq(videoSummary.id, testVideo.id));
    }
    if (testUser) {
      await db.delete(user).where(eq(user.id, testUser.id));
    }
    jest.clearAllMocks();
  });

  
  afterAll(async () => {
    await client.end(); // closes the connection pool
  });

  describe('AI Analysis Stage', () => {
    it('should update database with AI analysis results', async () => {
      const aiResult = expectedAIAnalysisResults.withTranscript;
      const validatedKeyframes = mockServices.ai.validateKeyframeIntervals(
        aiResult.keyframeIntervals, 
        testData.duration
      );

      const contentToUpdate = {
        summary: aiResult.summary,
        keyframeIntervals: validatedKeyframes,
        tags: aiResult.tags,
        categories: aiResult.categories
      };

      // Act: call the real DAO method
      await VideoSummaryDao.updateAIContent(testVideo.id, contentToUpdate);

      // Assert: fetch the record and check if it was updated
      const updatedVideo = await db.query.videoSummary.findFirst({
        where: eq(videoSummary.id, testVideo.id),
      });

      expect(updatedVideo).toBeDefined();
      expect(updatedVideo?.aiGeneratedContent).toEqual(contentToUpdate);
    });

    // The following tests are kept as they were, using mocks for now.
    // They can be migrated to use the real DB in a similar fashion.
    it('should perform AI analysis with transcript data', async () => {
      const analysisInput = {
        title: testData.title,
        description: testData.description,
        duration: testData.duration,
        transcript: mockTranscriptData.withTranscript,
        channelName: testData.channelName,
        youtubeUrl: testData.youtubeUrl
      };

      mockServices.ai.analyzeVideo.mockResolvedValue(expectedAIAnalysisResults.withTranscript);

      const result = await mockServices.ai.analyzeVideo(analysisInput);

      expect(result.success).toBe(true);
      expect(result.keyframeIntervals).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.tags).toBeDefined();
      expect(result.categories).toBeDefined();

      expect(mockServices.ai.analyzeVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          transcript: mockTranscriptData.withTranscript,
          youtubeUrl: testData.youtubeUrl
        })
      );
    });

    it('should perform AI analysis without transcript (video analysis mode)', async () => {
      const analysisInput = {
        title: testData.title,
        description: testData.description,
        duration: testData.duration,
        transcript: undefined, // No transcript available
        channelName: testData.channelName,
        youtubeUrl: testData.youtubeUrl
      };

      mockServices.ai.analyzeVideo.mockResolvedValue(expectedAIAnalysisResults.noTranscript);

      const result = await mockServices.ai.analyzeVideo(analysisInput);

      expect(result.success).toBe(true);
      expect(result.keyframeIntervals).toHaveLength(6);
      expect(result.summary.difficulty).toBe('advanced');

      expect(mockServices.ai.analyzeVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          transcript: undefined,
          youtubeUrl: testData.youtubeUrl
        })
      );
    });

    it('should validate and filter keyframe intervals', async () => {
      const testKeyframes = [
        { timestamp: -5, reason: 'Invalid negative', confidence: 0.5, category: 'intro' },
        { timestamp: 0, reason: 'Valid start', confidence: 0.9, category: 'intro' },
        { timestamp: 30, reason: 'Valid early', confidence: 0.8, category: 'main_point' },
        { timestamp: 50, reason: 'Too close to previous', confidence: 0.7, category: 'main_point' },
        { timestamp: 120, reason: 'Valid middle', confidence: 0.8, category: 'main_point' },
        { timestamp: 300, reason: 'Beyond video end', confidence: 0.6, category: 'conclusion' }
      ];

      const videoDuration = 250; // 4 minutes 10 seconds
      const validated = mockServices.ai.validateKeyframeIntervals(testKeyframes, videoDuration, 30);

      expect(validated).toHaveLength(3); // Should keep timestamps 0, 30, 120
      expect(validated.every((kf: MockKeyframe) => kf.timestamp >= 0 && kf.timestamp < videoDuration)).toBe(true);
      
      for (let i = 1; i < validated.length; i++) {
        expect(validated[i].timestamp - validated[i-1].timestamp).toBeGreaterThanOrEqual(30);
      }
    });
  });

  // Other describe blocks are omitted for brevity but would remain unchanged for now
});