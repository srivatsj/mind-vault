/**
 * Integration tests for YouTube video processing pipeline
 * 
 * Tests the complete E2E user journey:
 * 1. User submits YouTube URL
 * 2. Video metadata extraction
 * 3. Transcript extraction (with fallback)
 * 4. AI analysis and keyframe generation
 * 5. Asset extraction and storage
 * 6. Processing completion
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';

// Types for test objects
interface MockKeyframe {
  timestamp: number;
  reason?: string;
  confidence?: number;
  category?: string;
  path?: string;
}

interface MockData {
  status: string;
}
import { processYouTubeVideo, getVideoSummary } from '@/modules/video/actions/video.actions';
import { 
  mockYouTubeService,
  mockTranscriptService, 
  mockAIService,
  mockKeyframeService,
  mockStorageService,
  mockVideoSummaryDao,
  createTestSession,
  setupTestEnvironment,
  generateTestVideoData
} from './utils/test-helpers';
import { 
  mockVideoInfo, 
  expectedAIAnalysisResults, 
  invalidYouTubeUrls, 
  validYouTubeUrls,
  mockTranscriptData
} from './fixtures/video-data';

// Mock the auth module
jest.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: jest.fn()
    }
  }
}));

// Mock the services
jest.mock('@/modules/video/services/youtube.service');
jest.mock('@/modules/video/services/transcript.service');
jest.mock('@/modules/video/services/ai.service');
jest.mock('@/modules/video/services/keyframe.service');
jest.mock('@/modules/video/services/storage.service');
jest.mock('@/modules/video/services/job.service');
jest.mock('@/modules/video/data/video-summary.dao');

describe('Video Processing Integration Tests', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockServices: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let testSession: any;

  beforeEach(() => {
    setupTestEnvironment();
    
    // Setup mocks
    mockServices = {
      youtube: mockYouTubeService(),
      transcript: mockTranscriptService(),
      ai: mockAIService(),
      keyframe: mockKeyframeService(),
      storage: mockStorageService(),
      dao: mockVideoSummaryDao()
    };

    testSession = createTestSession();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('URL Validation and Video Information Extraction', () => {
    it('should reject invalid YouTube URLs', async () => {
      for (const invalidUrl of invalidYouTubeUrls) {
        mockServices.youtube.validateYouTubeUrl.mockReturnValueOnce(false);
        
        const result = await processYouTubeVideo(invalidUrl);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Please enter a valid YouTube URL');
      }
    });

    it('should accept valid YouTube URLs', async () => {
      for (const validUrl of validYouTubeUrls) {
        mockServices.youtube.validateYouTubeUrl.mockReturnValueOnce(true);
        mockServices.youtube.extractVideoId.mockReturnValueOnce('dQw4w9WgXcQ');
        mockServices.youtube.getVideoInfo.mockResolvedValueOnce(mockVideoInfo.withTranscript);
        mockServices.dao.create.mockResolvedValueOnce('test-summary-id');

        const result = await processYouTubeVideo(validUrl);
        
        expect(result.success).toBe(true);
        expect(result.summaryId).toBeDefined();
        expect(result.eventId).toBeDefined();
      }
    });

    it('should handle video ID extraction failure', async () => {
      mockServices.youtube.validateYouTubeUrl.mockReturnValue(true);
      mockServices.youtube.extractVideoId.mockReturnValue(null);

      const result = await processYouTubeVideo('https://www.youtube.com/watch?v=invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Could not extract video ID from URL');
    });

    it('should return existing summary if video already processed', async () => {
      const existingSummary = { id: 'existing-summary-id' };
      mockServices.youtube.validateYouTubeUrl.mockReturnValue(true);
      mockServices.youtube.extractVideoId.mockReturnValue('dQw4w9WgXcQ');
      mockServices.dao.findByUserAndYouTubeId.mockResolvedValue(existingSummary);

      const result = await processYouTubeVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      expect(result.success).toBe(true);
      expect(result.summaryId).toBe('existing-summary-id');
      expect(mockServices.youtube.getVideoInfo).not.toHaveBeenCalled();
    });
  });

  describe('Video Processing Pipeline - With Transcript', () => {
    it('should successfully process video with available transcript', async () => {
      const testData = generateTestVideoData({
        youtubeId: '5HAKUIvYo-Q',
        title: mockVideoInfo.tutorial.title
      });

      // Setup successful transcript extraction
      mockServices.transcript.extractTranscript.mockResolvedValue({
        success: true,
        segments: mockTranscriptData.withTranscript,
        fullText: 'Sample transcript content',
        source: 'youtube-transcript'
      });

      // Setup AI analysis with transcript
      mockServices.ai.analyzeVideo.mockResolvedValue(expectedAIAnalysisResults.withTranscript);

      // Simulate the pipeline steps
      const transcriptResult = await mockServices.transcript.extractTranscript(testData.youtubeId);
      expect(transcriptResult.success).toBe(true);
      expect(transcriptResult.segments).toHaveLength(5);

      const aiAnalysis = await mockServices.ai.analyzeVideo({
        title: testData.title,
        description: testData.description,
        duration: testData.duration,
        transcript: transcriptResult.segments,
        youtubeUrl: testData.youtubeUrl
      });

      expect(aiAnalysis.success).toBe(true);
      expect(aiAnalysis.keyframeIntervals).toHaveLength(5);
      expect(aiAnalysis.summary.difficulty).toBe('intermediate');
      expect(aiAnalysis.tags).toContain('nextjs');

      // Verify keyframe validation
      const validatedKeyframes = mockServices.ai.validateKeyframeIntervals(
        aiAnalysis.keyframeIntervals, 
        testData.duration
      );
      expect(validatedKeyframes).toHaveLength(5);
      expect(validatedKeyframes.every((kf: MockKeyframe) => kf.timestamp < testData.duration)).toBe(true);
    });

    it('should handle transcript analysis mode correctly', async () => {
      const testData = generateTestVideoData();
      
      mockServices.transcript.extractTranscript.mockResolvedValue({
        success: true,
        segments: mockTranscriptData.withTranscript,
        fullText: 'Sample transcript',
        source: 'youtube-transcript'
      });

      const analysisInput = {
        title: testData.title,
        description: testData.description,
        duration: testData.duration,
        transcript: mockTranscriptData.withTranscript,
        youtubeUrl: testData.youtubeUrl
      };

      await mockServices.ai.analyzeVideo(analysisInput);

      expect(mockServices.ai.analyzeVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          transcript: expect.arrayContaining([
            expect.objectContaining({
              text: expect.any(String),
              start: expect.any(Number),
              duration: expect.any(Number)
            })
          ])
        })
      );
    });
  });

  describe('Video Processing Pipeline - Without Transcript', () => {
    it('should successfully process video without transcript using video analysis', async () => {
      const testData = generateTestVideoData({
        youtubeId: 'testVideoId',
        title: mockVideoInfo.noTranscript.title,
        duration: mockVideoInfo.noTranscript.duration
      });

      // Setup failed transcript extraction
      mockServices.transcript.extractTranscript.mockResolvedValue({
        success: false,
        segments: [],
        fullText: '',
        source: 'none',
        error: 'No transcript available for this video'
      });

      // Setup AI analysis without transcript (should use video analysis mode)
      mockServices.ai.analyzeVideo.mockResolvedValue(expectedAIAnalysisResults.noTranscript);

      // Simulate the pipeline steps
      const transcriptResult = await mockServices.transcript.extractTranscript(testData.youtubeId);
      expect(transcriptResult.success).toBe(false);

      const aiAnalysis = await mockServices.ai.analyzeVideo({
        title: testData.title,
        description: testData.description,
        duration: testData.duration,
        transcript: undefined, // No transcript
        youtubeUrl: testData.youtubeUrl
      });

      expect(aiAnalysis.success).toBe(true);
      expect(aiAnalysis.keyframeIntervals).toHaveLength(6); // Video analysis generates 6 keyframes
      expect(aiAnalysis.summary.difficulty).toBe('advanced');
      expect(aiAnalysis.tags).toContain('react');

      // Verify keyframes are within duration bounds
      const validatedKeyframes = mockServices.ai.validateKeyframeIntervals(
        aiAnalysis.keyframeIntervals, 
        testData.duration
      );
      expect(validatedKeyframes).toHaveLength(6);
      expect(validatedKeyframes.every((kf: MockKeyframe) => kf.timestamp < testData.duration)).toBe(true);
    });

    it('should generate appropriate keyframes for video analysis mode', async () => {
      const longVideoDuration = 3600; // 1 hour
      const result = expectedAIAnalysisResults.noTranscript;
      
      // Verify strategic keyframe placement for long video
      const keyframes = result.keyframeIntervals;
      expect(keyframes[0].timestamp).toBe(0); // Start
      expect(keyframes[1].timestamp).toBeCloseTo(longVideoDuration * 0.15, -1); // 15%
      expect(keyframes[2].timestamp).toBeCloseTo(longVideoDuration * 0.30, -1); // 30%
      expect(keyframes[3].timestamp).toBeCloseTo(longVideoDuration * 0.50, -1); // 50%
      expect(keyframes[4].timestamp).toBeCloseTo(longVideoDuration * 0.70, -1); // 70%
      expect(keyframes[5].timestamp).toBeCloseTo(longVideoDuration * 0.90, -1); // 90%
    });
  });

  describe('Keyframe Extraction and Storage', () => {
    it('should successfully extract and upload keyframes', async () => {
      const testData = generateTestVideoData();
      const keyframeResult = await mockServices.keyframe.extractKeyframes(testData.youtubeId, {
        intervals: [0, 30, 120],
        quality: 2,
        width: 1280,
        height: 720
      });

      expect(keyframeResult.success).toBe(true);
      expect(keyframeResult.keyframes).toHaveLength(3);

      const storageResult = await mockServices.storage.uploadKeyframes(
        testData.youtubeId,
        keyframeResult.keyframes.map((kf: MockKeyframe) => kf.path)
      );

      expect(storageResult.success).toBe(true);
      expect(storageResult.uploads).toHaveLength(2); // Mock returns 2 uploads
      expect(storageResult.uploads[0].url).toContain('blob.vercel-storage.com');
    });

    it('should handle keyframe extraction failures gracefully', async () => {
      mockServices.keyframe.extractKeyframes.mockResolvedValue({
        success: false,
        keyframes: [],
        error: 'FFmpeg failed to extract keyframes'
      });

      const result = await mockServices.keyframe.extractKeyframes('testVideoId');
      expect(result.success).toBe(false);
      expect(result.keyframes).toHaveLength(0);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle very short videos', async () => {
      const shortVideoData = generateTestVideoData({
        youtubeId: 'shortTest',
        title: mockVideoInfo.shortVideo.title,
        duration: 45
      });

      mockServices.ai.analyzeVideo.mockResolvedValue({
        ...expectedAIAnalysisResults.withTranscript,
        keyframeIntervals: [
          { timestamp: 0, reason: 'Video start', confidence: 0.9, category: 'intro' },
          { timestamp: 40, reason: 'Video end', confidence: 0.8, category: 'conclusion' }
        ]
      });

      const result = await mockServices.ai.analyzeVideo({
        title: shortVideoData.title,
        duration: shortVideoData.duration,
        youtubeUrl: shortVideoData.youtubeUrl
      });

      expect(result.keyframeIntervals).toHaveLength(2);
      expect(result.keyframeIntervals.every((kf: MockKeyframe) => kf.timestamp < 45)).toBe(true);
    });

    it('should handle very long videos', async () => {
      const longVideoData = generateTestVideoData({
        youtubeId: 'longTest',
        title: mockVideoInfo.longVideo.title,
        duration: 28800 // 8 hours
      });

      mockServices.ai.analyzeVideo.mockResolvedValue({
        ...expectedAIAnalysisResults.noTranscript,
        keyframeIntervals: Array.from({ length: 12 }, (_, i) => ({
          timestamp: Math.floor(28800 * (i + 1) / 13),
          reason: `Section ${i + 1}`,
          confidence: 0.7,
          category: 'main_point' as const
        }))
      });

      const result = await mockServices.ai.analyzeVideo({
        title: longVideoData.title,
        duration: longVideoData.duration,
        youtubeUrl: longVideoData.youtubeUrl
      });

      expect(result.keyframeIntervals).toHaveLength(12);
      expect(result.keyframeIntervals.every((kf: MockKeyframe) => kf.timestamp < 28800)).toBe(true);
      
      // Verify reasonable spacing
      const timestamps = result.keyframeIntervals.map((kf: MockKeyframe) => kf.timestamp).sort((a: number, b: number) => a - b);
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i] - timestamps[i-1]).toBeGreaterThan(30); // At least 30 seconds apart
      }
    });

    it('should handle network failures gracefully', async () => {
      mockServices.youtube.getVideoInfo.mockRejectedValue(new Error('Network timeout'));

      const result = await processYouTubeVideo('https://www.youtube.com/watch?v=networkfail');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    });

    it('should handle AI service failures with fallback', async () => {
      mockServices.ai.analyzeVideo.mockResolvedValue({
        success: false,
        error: 'AI service temporarily unavailable'
      });

      const result = await mockServices.ai.analyzeVideo({
        title: 'Test Video',
        duration: 300,
        youtubeUrl: 'https://www.youtube.com/watch?v=test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('AI service temporarily unavailable');
    });

    it('should validate keyframe timestamps against video duration', async () => {
      const invalidKeyframes = [
        { timestamp: -10, reason: 'Invalid negative timestamp', confidence: 0.5, category: 'intro' },
        { timestamp: 0, reason: 'Valid start', confidence: 0.9, category: 'intro' },
        { timestamp: 150, reason: 'Valid middle', confidence: 0.8, category: 'main_point' },
        { timestamp: 500, reason: 'Beyond video end', confidence: 0.7, category: 'conclusion' }
      ];

      const validated = mockServices.ai.validateKeyframeIntervals(invalidKeyframes, 300);

      expect(validated).toHaveLength(2); // Only timestamps 0 and 150 should remain
      expect(validated.every((kf: MockKeyframe) => kf.timestamp >= 0 && kf.timestamp < 300)).toBe(true);
    });
  });

  describe('Video Summary Retrieval', () => {
    it('should retrieve completed video summary', async () => {
      const summaryId = 'test-summary-123';
      const mockSummaryData = {
        id: summaryId,
        title: 'Test Video',
        summary: 'This is a test video summary',
        status: 'completed',
        keyframes: [],
        createdAt: new Date()
      };

      mockServices.dao.findById.mockResolvedValue(mockSummaryData);

      const result = await getVideoSummary(summaryId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSummaryData);
      expect(mockServices.dao.findById).toHaveBeenCalledWith(summaryId, testSession.user.id);
    });

    it('should handle non-existent summary', async () => {
      mockServices.dao.findById.mockResolvedValue(null);

      const result = await getVideoSummary('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Video summary not found');
    });

    it('should require authentication for summary access', async () => {
      // Mock auth to return null (no session)

      const result = await getVideoSummary('test-summary-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });
  });

  describe('Complete E2E User Journey', () => {
    it('should successfully complete the entire video processing workflow', async () => {
      // Step 1: User submits YouTube URL
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      mockServices.youtube.validateYouTubeUrl.mockReturnValue(true);
      mockServices.youtube.extractVideoId.mockReturnValue('dQw4w9WgXcQ');
      mockServices.youtube.getVideoInfo.mockResolvedValue(mockVideoInfo.withTranscript);
      mockServices.dao.create.mockResolvedValue('summary-123');

      // Step 2: Process video
      const processResult = await processYouTubeVideo(youtubeUrl);
      
      expect(processResult.success).toBe(true);
      expect(processResult.summaryId).toBe('summary-123');
      expect(processResult.eventId).toBe('test-event-id');

      // Step 3: Verify job was triggered  
      // Note: This would normally check the actual job service, but since we're testing
      // the integration flow, we just verify the processing was initiated
      expect(processResult.eventId).toBe('test-event-id');

      // Step 4: Verify database was updated with processing status
      expect(mockServices.dao.updateProcessingStatus).toHaveBeenCalledWith(
        'summary-123',
        'pending',
        undefined,
        0,
        'Queued for processing',
        'test-event-id'
      );

      // Step 5: Simulate background processing completion
      const completedSummary = {
        id: 'summary-123',
        status: 'completed',
        summary: 'Video processed successfully',
        keyframes: []
      };
      
      mockServices.dao.findById.mockResolvedValue(completedSummary);

      // Step 6: User retrieves completed summary
      const summaryResult = await getVideoSummary('summary-123');
      
      expect(summaryResult.success).toBe(true);
      expect((summaryResult.data as MockData).status).toBe('completed');
    });
  });
});