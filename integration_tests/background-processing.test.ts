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
import { user, videoSummary, videoSummaryTag, videoSummaryCategory, keyframe } from '@/db/schema';
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

    it('should store transcript in database when extraction succeeds', async () => {
      const testTranscript = 'Welcome to this comprehensive tutorial about React development...';
      
      // Act: store transcript
      await VideoSummaryDao.updateTranscript(testVideo.id, testTranscript);

      // Assert: verify transcript was stored
      const updatedVideo = await db.query.videoSummary.findFirst({
        where: eq(videoSummary.id, testVideo.id),
      });

      expect(updatedVideo).toBeDefined();
      expect(updatedVideo?.transcript).toBe(testTranscript);
    });

    it('should create tag and category relationships when AI analysis includes them', async () => {
      const testTags = ['react', 'javascript', 'tutorial'];
      const testCategories = ['web development', 'frontend'];

      const contentToUpdate = {
        summary: expectedAIAnalysisResults.withTranscript.summary,
        keyframeIntervals: [],
        tags: testTags,
        categories: testCategories
      };

      // Act: update content with relationships
      await VideoSummaryDao.updateAIContentWithRelations(testVideo.id, contentToUpdate);

      // Assert: verify tags were created and linked
      const createdTags = await db.query.tag.findMany();
      const videoTags = await db.query.videoSummaryTag.findMany({
        where: eq(videoSummaryTag.videoSummaryId, testVideo.id)
      });

      expect(createdTags.length).toBeGreaterThanOrEqual(3);
      expect(videoTags.length).toBe(3);

      // Assert: verify categories were created and linked  
      const createdCategories = await db.query.category.findMany();
      const videoCategories = await db.query.videoSummaryCategory.findMany({
        where: eq(videoSummaryCategory.videoSummaryId, testVideo.id)
      });

      expect(createdCategories.length).toBeGreaterThanOrEqual(2);
      expect(videoCategories.length).toBe(2);

      // Verify tag names match
      const tagNames = createdTags.map(t => t.name);
      testTags.forEach(tagName => {
        expect(tagNames).toContain(tagName);
      });

      // Verify category names match
      const categoryNames = createdCategories.map(c => c.name);
      testCategories.forEach(categoryName => {
        expect(categoryNames).toContain(categoryName);
      });

      // Verify AI content was also stored in JSON
      const updatedVideo = await db.query.videoSummary.findFirst({
        where: eq(videoSummary.id, testVideo.id),
      });
      
      expect(updatedVideo?.aiGeneratedContent?.tags).toEqual(testTags);
      expect(updatedVideo?.aiGeneratedContent?.categories).toEqual(testCategories);
    });

    it('should handle duplicate tag/category creation gracefully', async () => {
      const duplicateTags = ['react', 'react', 'javascript']; // Duplicate 'react'
      const duplicateCategories = ['web development', 'web development']; // Duplicate category

      const contentToUpdate = {
        summary: expectedAIAnalysisResults.withTranscript.summary,
        keyframeIntervals: [],
        tags: duplicateTags,
        categories: duplicateCategories
      };

      // Act: update content - should not create duplicate entities
      await VideoSummaryDao.updateAIContentWithRelations(testVideo.id, contentToUpdate);

      // Assert: verify no duplicate relationships were created
      const videoTags = await db.query.videoSummaryTag.findMany({
        where: eq(videoSummaryTag.videoSummaryId, testVideo.id)
      });
      const videoCategories = await db.query.videoSummaryCategory.findMany({
        where: eq(videoSummaryCategory.videoSummaryId, testVideo.id)
      });

      // Should only have unique relationships despite duplicate input
      expect(videoTags.length).toBe(2); // 'react' and 'javascript' (unique)
      expect(videoCategories.length).toBe(1); // 'web development' (unique)
    });

    it('should validate complete database state after AI processing', async () => {
      const testTranscript = 'Complete tutorial transcript content...';
      const validKeyframes = [
        { timestamp: 30, reason: 'Introduction', confidence: 0.9, category: 'intro' },
        { timestamp: 120, reason: 'Main content', confidence: 0.85, category: 'main_point' }
      ];

      // Act: Simulate complete processing pipeline
      // 1. Store transcript
      await VideoSummaryDao.updateTranscript(testVideo.id, testTranscript);
      
      // 2. Update AI content with relationships
      await VideoSummaryDao.updateAIContentWithRelations(testVideo.id, {
        summary: expectedAIAnalysisResults.withTranscript.summary,
        keyframeIntervals: validKeyframes,
        tags: ['nextjs', 'tutorial'],
        categories: ['education']
      });

      // 3. Update processing status
      await VideoSummaryDao.updateProcessingStatus(testVideo.id, 'completed', undefined, 100, 'Processing complete');

      // Assert: Verify complete state
      const finalVideo = await db.query.videoSummary.findFirst({
        where: eq(videoSummary.id, testVideo.id),
      });

      // Verify all fields are properly set
      expect(finalVideo).toBeDefined();
      expect(finalVideo?.transcript).toBe(testTranscript);
      expect(finalVideo?.processingStatus).toBe('completed');
      expect(finalVideo?.processingProgress).toBe(100);
      expect(finalVideo?.currentStep).toBe('Processing complete');
      expect(finalVideo?.processingError).toBeNull();
      
      // Verify AI content structure
      expect(finalVideo?.aiGeneratedContent).toBeDefined();
      expect(finalVideo?.aiGeneratedContent?.summary).toBeDefined();
      expect(finalVideo?.aiGeneratedContent?.keyframeIntervals).toEqual(validKeyframes);
      expect(finalVideo?.aiGeneratedContent?.tags).toEqual(['nextjs', 'tutorial']);
      expect(finalVideo?.aiGeneratedContent?.categories).toEqual(['education']);

      // Verify relationships were created
      const videoTags = await db.query.videoSummaryTag.findMany({
        where: eq(videoSummaryTag.videoSummaryId, testVideo.id)
      });
      const videoCategories = await db.query.videoSummaryCategory.findMany({
        where: eq(videoSummaryCategory.videoSummaryId, testVideo.id)
      });

      expect(videoTags.length).toBe(2);
      expect(videoCategories.length).toBe(1);
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

  describe('Error Recovery and Edge Cases', () => {
    it('should handle processing status transitions correctly', async () => {
      // Test valid status progression
      const statusProgression = [
        { status: 'pending' as const, progress: 0, step: 'Initializing' },
        { status: 'extracting_transcript' as const, progress: 20, step: 'Extracting transcript' },
        { status: 'generating_summary' as const, progress: 40, step: 'Generating AI summary' },
        { status: 'extracting_keyframes' as const, progress: 60, step: 'Extracting keyframes' },
        { status: 'uploading_assets' as const, progress: 80, step: 'Uploading assets' },
        { status: 'completed' as const, progress: 100, step: 'Processing complete' }
      ];

      // Act: Update through each status
      for (const { status, progress, step } of statusProgression) {
        await VideoSummaryDao.updateProcessingStatus(testVideo.id, status, undefined, progress, step);
        
        // Assert: Verify status was updated correctly
        const updatedVideo = await db.query.videoSummary.findFirst({
          where: eq(videoSummary.id, testVideo.id),
        });
        
        expect(updatedVideo?.processingStatus).toBe(status);
        expect(updatedVideo?.processingProgress).toBe(progress);
        expect(updatedVideo?.currentStep).toBe(step);
        expect(updatedVideo?.processingError).toBeNull();
      }
    });

    it('should handle failed processing state correctly', async () => {
      const errorMessage = 'AI service failed to generate summary';
      
      // Act: Update to failed status
      await VideoSummaryDao.updateProcessingStatus(testVideo.id, 'failed', errorMessage, 30, 'Failed during AI processing');

      // Assert: Verify error state
      const updatedVideo = await db.query.videoSummary.findFirst({
        where: eq(videoSummary.id, testVideo.id),
      });

      expect(updatedVideo?.processingStatus).toBe('failed');
      expect(updatedVideo?.processingError).toBe(errorMessage);
      expect(updatedVideo?.processingProgress).toBe(30);
      expect(updatedVideo?.currentStep).toBe('Failed during AI processing');
    });

    it('should maintain data integrity during partial failures', async () => {
      // Simulate partial processing where transcript succeeds but AI fails
      const testTranscript = 'Transcript extracted successfully';
      
      // Act: Store transcript (success)
      await VideoSummaryDao.updateTranscript(testVideo.id, testTranscript);
      
      // Act: Mark AI processing as failed
      await VideoSummaryDao.updateProcessingStatus(testVideo.id, 'failed', 'AI analysis failed', 40, 'AI processing error');

      // Assert: Verify transcript is retained despite failure
      const updatedVideo = await db.query.videoSummary.findFirst({
        where: eq(videoSummary.id, testVideo.id),
      });

      expect(updatedVideo?.transcript).toBe(testTranscript);
      expect(updatedVideo?.processingStatus).toBe('failed');
      expect(updatedVideo?.aiGeneratedContent).toBeNull(); // Should be null since AI failed
    });
  });

  describe('Data Consistency Validation', () => {
    it('should ensure keyframe intervals match expected schema structure', async () => {
      const keyframes = [
        { timestamp: 30, reason: 'Introduction', confidence: 0.9, category: 'intro' },
        { timestamp: 120, reason: 'Main content', confidence: 0.85, category: 'main_point' }
      ];

      const aiContent = {
        summary: expectedAIAnalysisResults.withTranscript.summary,
        keyframeIntervals: keyframes,
        tags: ['test'],
        categories: ['test-category']
      };

      // Act: Store AI content
      await VideoSummaryDao.updateAIContent(testVideo.id, aiContent);

      // Assert: Verify schema compliance
      const updatedVideo = await db.query.videoSummary.findFirst({
        where: eq(videoSummary.id, testVideo.id),
      });

      const storedKeyframes = updatedVideo?.aiGeneratedContent?.keyframeIntervals;
      expect(storedKeyframes).toBeDefined();
      expect(Array.isArray(storedKeyframes)).toBe(true);
      
      storedKeyframes?.forEach(kf => {
        expect(typeof kf.timestamp).toBe('number');
        expect(typeof kf.reason).toBe('string');
        expect(typeof kf.confidence).toBe('number');
        expect(typeof kf.category).toBe('string');
        expect(kf.confidence).toBeGreaterThanOrEqual(0);
        expect(kf.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should validate summary structure integrity', async () => {
      const summary = expectedAIAnalysisResults.withTranscript.summary;
      
      const aiContent = {
        summary,
        keyframeIntervals: [],
        tags: ['test'],
        categories: ['test-category']
      };

      // Act: Store AI content
      await VideoSummaryDao.updateAIContent(testVideo.id, aiContent);

      // Assert: Verify summary structure
      const updatedVideo = await db.query.videoSummary.findFirst({
        where: eq(videoSummary.id, testVideo.id),
      });

      const storedSummary = updatedVideo?.aiGeneratedContent?.summary;
      expect(storedSummary).toBeDefined();
      expect(typeof storedSummary?.summary).toBe('string');
      expect(Array.isArray(storedSummary?.keyPoints)).toBe(true);
      expect(Array.isArray(storedSummary?.topics)).toBe(true);
      expect(['beginner', 'intermediate', 'advanced']).toContain(storedSummary?.difficulty);
      expect(typeof storedSummary?.estimatedReadTime).toBe('number');
      expect(storedSummary?.estimatedReadTime).toBeGreaterThan(0);
    });

    it('should prevent data corruption from invalid inputs', async () => {
      // Test with potentially problematic data
      const problematicTags = ['', '   ', null as unknown as string, undefined as unknown as string, 'valid-tag'];
      const problematicCategories = ['valid-category', '', null as unknown as string];

      // Filter out invalid values (simulating what should happen in the service)
      const validTags = problematicTags.filter(tag => tag && typeof tag === 'string' && tag.trim().length > 0);
      const validCategories = problematicCategories.filter(cat => cat && typeof cat === 'string' && cat.trim().length > 0);

      const aiContent = {
        summary: expectedAIAnalysisResults.withTranscript.summary,
        keyframeIntervals: [],
        tags: validTags,
        categories: validCategories
      };

      // Act: Store filtered content
      await VideoSummaryDao.updateAIContentWithRelations(testVideo.id, aiContent);

      // Assert: Verify only valid data was stored
      const videoTags = await db.query.videoSummaryTag.findMany({
        where: eq(videoSummaryTag.videoSummaryId, testVideo.id)
      });
      const videoCategories = await db.query.videoSummaryCategory.findMany({
        where: eq(videoSummaryCategory.videoSummaryId, testVideo.id)
      });

      expect(videoTags.length).toBe(1); // Only 'valid-tag'
      expect(videoCategories.length).toBe(1); // Only 'valid-category'
    });

    it('should handle decimal timestamps by converting to integers', async () => {
      const decimalKeyframes = [
        { timestamp: 15.5, reason: 'Mid-intro', confidence: 0.9, category: 'intro' },
        { timestamp: 120.7, reason: 'Main content', confidence: 0.85, category: 'main_point' }
      ];

      const aiContent = {
        summary: expectedAIAnalysisResults.withTranscript.summary,
        keyframeIntervals: decimalKeyframes,
        tags: ['test'],
        categories: ['test-category']
      };

      // Act: Store AI content with decimal timestamps
      await VideoSummaryDao.updateAIContent(testVideo.id, aiContent);

      // Create keyframe records (simulating the full pipeline)
      for (const keyframeData of decimalKeyframes) {
        await VideoSummaryDao.addKeyframe(testVideo.id, {
          timestamp: keyframeData.timestamp, // Decimal input
          imageUrl: 'https://example.com/keyframe.jpg',
          description: keyframeData.reason,
          confidence: keyframeData.confidence,
          category: keyframeData.category,
          aiReason: keyframeData.reason,
          fileSize: 12345
        });
      }

      // Assert: Verify timestamps were converted to integers
      const keyframeRecords = await db.query.keyframe.findMany({
        where: eq(keyframe.videoSummaryId, testVideo.id)
      });

      expect(keyframeRecords).toHaveLength(2);
      expect(keyframeRecords[0].timestamp).toBe(15); // 15.5 -> 15
      expect(keyframeRecords[1].timestamp).toBe(120); // 120.7 -> 120
      
      // Verify database accepts integer values without error
      keyframeRecords.forEach(kf => {
        expect(Number.isInteger(kf.timestamp)).toBe(true);
      });
    });

    it('should populate both legacy summary field and JSON summary for UI compatibility', async () => {
      const testSummary = {
        summary: 'This is a comprehensive tutorial about React development patterns.',
        keyPoints: ['Advanced patterns', 'Performance optimization'],
        topics: ['React', 'JavaScript'],
        difficulty: 'intermediate' as const,
        estimatedReadTime: 5
      };

      const aiContent = {
        summary: testSummary,
        keyframeIntervals: [],
        tags: ['react', 'tutorial'],
        categories: ['education']
      };

      // Act: Store AI content
      await VideoSummaryDao.updateAIContent(testVideo.id, aiContent);

      // Assert: Verify both summary fields are populated
      const updatedVideo = await db.query.videoSummary.findFirst({
        where: eq(videoSummary.id, testVideo.id),
      });

      // Legacy summary field should be populated for search/backward compatibility
      expect(updatedVideo?.summary).toBe(testSummary.summary);
      
      // JSON summary should contain full structured data
      expect(updatedVideo?.aiGeneratedContent?.summary).toEqual(testSummary);
      
      // Verify full structure is available for rich UI display
      expect(updatedVideo?.aiGeneratedContent?.summary?.keyPoints).toEqual(testSummary.keyPoints);
      expect(updatedVideo?.aiGeneratedContent?.summary?.topics).toEqual(testSummary.topics);
      expect(updatedVideo?.aiGeneratedContent?.summary?.difficulty).toBe(testSummary.difficulty);
      expect(updatedVideo?.aiGeneratedContent?.summary?.estimatedReadTime).toBe(testSummary.estimatedReadTime);
    });
  });

  // Other describe blocks are omitted for brevity but would remain unchanged for now
});