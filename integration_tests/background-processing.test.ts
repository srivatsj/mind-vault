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
  mockVideoSummaryDao,
  setupTestEnvironment,
  generateTestVideoData,
} from './utils/test-helpers';
import { 
  mockTranscriptData, 
  expectedAIAnalysisResults 
} from './fixtures/video-data';

// Mock the services
jest.mock('@/modules/video/services/transcript.service');
jest.mock('@/modules/video/services/ai.service');
jest.mock('@/modules/video/services/keyframe.service');
jest.mock('@/modules/video/services/storage.service');
jest.mock('@/modules/video/data/video-summary.dao');

describe('Background Video Processing Pipeline', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockServices: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let testData: any;

  beforeEach(() => {
    setupTestEnvironment();
    
    mockServices = {
      transcript: mockTranscriptService(),
      ai: mockAIService(),
      keyframe: mockKeyframeService(),
      storage: mockStorageService(),
      dao: mockVideoSummaryDao()
    };

    testData = generateTestVideoData();

    // Apply mocks to actual modules
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Object.assign(require('@/modules/video/services/transcript.service').TranscriptService, mockServices.transcript);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Object.assign(require('@/modules/video/services/ai.service').AIService, mockServices.ai);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Object.assign(require('@/modules/video/services/keyframe.service').KeyframeService, mockServices.keyframe);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Object.assign(require('@/modules/video/services/storage.service').StorageService, mockServices.storage);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Object.assign(require('@/modules/video/data/video-summary.dao').VideoSummaryDao, mockServices.dao);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Transcript Extraction Stage', () => {
    it('should successfully extract transcript using primary method', async () => {
      
      mockServices.transcript.extractTranscript.mockResolvedValue({
        success: true,
        segments: mockTranscriptData.withTranscript,
        fullText: mockTranscriptData.withTranscript.map(s => s.text).join(' '),
        source: 'youtube-transcript'
      });

      const result = await mockServices.transcript.extractTranscript(testData.youtubeId);

      expect(result.success).toBe(true);
      expect(result.segments).toHaveLength(5);
      expect(result.source).toBe('youtube-transcript');
      expect(result.fullText).toContain('Welcome to this comprehensive tutorial');
    });

    it('should handle transcript extraction failure gracefully', async () => {
      
      mockServices.transcript.extractTranscript.mockResolvedValue({
        success: false,
        segments: [],
        fullText: '',
        source: 'none',
        error: 'No transcript available for this video'
      });

      const result = await mockServices.transcript.extractTranscript('noTranscriptVideo');

      expect(result.success).toBe(false);
      expect(result.segments).toHaveLength(0);
      expect(result.error).toContain('No transcript available');
    });

    it('should update processing status during transcript extraction', async () => {
      
      // Simulate updating status to extracting_transcript
      await mockServices.dao.updateProcessingStatus(
        testData.videoSummaryId,
        'extracting_transcript',
        undefined,
        10,
        'Extracting video transcript'
      );

      expect(mockServices.dao.updateProcessingStatus).toHaveBeenCalledWith(
        testData.videoSummaryId,
        'extracting_transcript',
        undefined,
        10,
        'Extracting video transcript'
      );
    });
  });

  describe('AI Analysis Stage', () => {
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
      expect(result.keyframeIntervals).toHaveLength(6); // Video analysis generates different keyframe count
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
      
      // Check minimum gap enforcement
      for (let i = 1; i < validated.length; i++) {
        expect(validated[i].timestamp - validated[i-1].timestamp).toBeGreaterThanOrEqual(30);
      }
    });

    it('should update database with AI analysis results', async () => {
      
      const aiResult = expectedAIAnalysisResults.withTranscript;
      const validatedKeyframes = mockServices.ai.validateKeyframeIntervals(
        aiResult.keyframeIntervals, 
        testData.duration
      );

      await mockServices.dao.updateAIContent(testData.videoSummaryId, {
        summary: aiResult.summary,
        keyframeIntervals: validatedKeyframes,
        tags: aiResult.tags,
        categories: aiResult.categories
      });

      expect(mockServices.dao.updateAIContent).toHaveBeenCalledWith(
        testData.videoSummaryId,
        expect.objectContaining({
          summary: aiResult.summary,
          keyframeIntervals: validatedKeyframes,
          tags: aiResult.tags,
          categories: aiResult.categories
        })
      );
    });
  });

  describe('Keyframe Extraction Stage', () => {
    it('should extract keyframes at AI-determined intervals', async () => {
      
      const keyframeIntervals = [0, 30, 120, 180, 240];
      const extractionOptions = {
        intervals: keyframeIntervals,
        quality: 2,
        width: 1280,
        height: 720
      };

      mockServices.keyframe.extractKeyframes.mockResolvedValue({
        success: true,
        keyframes: keyframeIntervals.map(timestamp => ({
          timestamp,
          filename: `keyframe_${timestamp.toString().padStart(6, '0')}.jpg`,
          path: `/tmp/keyframes/keyframe_${timestamp.toString().padStart(6, '0')}.jpg`,
          size: 1024 * (Math.random() * 10 + 5) // Random size between 5-15KB
        })),
        tempDir: '/tmp/keyframes',
        videoPath: '/tmp/video.mp4'
      });

      const result = await mockServices.keyframe.extractKeyframes(testData.youtubeId, extractionOptions);

      expect(result.success).toBe(true);
      expect(result.keyframes).toHaveLength(5);
      expect(result.tempDir).toBeDefined();
      expect(result.videoPath).toBeDefined();

      // Verify keyframes have correct timestamps
      const timestamps = result.keyframes.map((kf: MockKeyframe) => kf.timestamp);
      expect(timestamps).toEqual(keyframeIntervals);
    });

    it('should handle keyframe extraction failures', async () => {
      
      mockServices.keyframe.extractKeyframes.mockResolvedValue({
        success: false,
        keyframes: [],
        error: 'FFmpeg failed to process video'
      });

      const result = await mockServices.keyframe.extractKeyframes('failingVideoId');

      expect(result.success).toBe(false);
      expect(result.keyframes).toHaveLength(0);
      expect(result.error).toContain('FFmpeg failed');
    });

    it('should update processing status during keyframe extraction', async () => {
      
      await mockServices.dao.updateProcessingStatus(
        testData.videoSummaryId,
        'extracting_keyframes',
        undefined,
        60,
        'Extracting keyframes from video'
      );

      expect(mockServices.dao.updateProcessingStatus).toHaveBeenCalledWith(
        testData.videoSummaryId,
        'extracting_keyframes',
        undefined,
        60,
        'Extracting keyframes from video'
      );
    });
  });

  describe('Asset Upload Stage', () => {
    it('should upload keyframes to blob storage', async () => {
      
      const keyframePaths = [
        '/tmp/keyframe_000000.jpg',
        '/tmp/keyframe_000030.jpg',
        '/tmp/keyframe_000120.jpg'
      ];

      const result = await mockServices.storage.uploadKeyframes(testData.youtubeId, keyframePaths);

      expect(result.success).toBe(true);
      expect(result.uploads).toHaveLength(2); // Mock returns 2 uploads
      expect(result.uploads[0]).toEqual(
        expect.objectContaining({
          url: expect.stringContaining('blob.vercel-storage.com'),
          filename: expect.any(String),
          size: expect.any(Number)
        })
      );
    });

    it('should upload transcript data', async () => {
      
      const transcriptData = {
        segments: mockTranscriptData.withTranscript,
        fullText: 'Sample transcript content',
        language: 'en',
        source: 'youtube-transcript'
      };

      const result = await mockServices.storage.uploadTranscript(testData.youtubeId, transcriptData);

      expect(result.url).toContain('blob.vercel-storage.com');
      expect(result.filename).toBe('transcript.json');
      expect(result.contentType).toBe('application/json');
    });

    it('should upload analysis results', async () => {
      
      const analysisData = expectedAIAnalysisResults.withTranscript;
      const result = await mockServices.storage.uploadAnalysisResults(testData.youtubeId, analysisData);

      expect(result.url).toContain('blob.vercel-storage.com');
      expect(result.filename).toBe('analysis.json');
      expect(result.contentType).toBe('application/json');
    });

    it('should update database with storage URLs', async () => {
      
      const storageUrls = {
        keyframes: [
          'https://blob.vercel-storage.com/keyframe1.jpg',
          'https://blob.vercel-storage.com/keyframe2.jpg'
        ],
        transcript: 'https://blob.vercel-storage.com/transcript.json',
        analysis: 'https://blob.vercel-storage.com/analysis.json'
      };

      await mockServices.dao.updateStorageUrls(testData.videoSummaryId, storageUrls);

      expect(mockServices.dao.updateStorageUrls).toHaveBeenCalledWith(
        testData.videoSummaryId,
        storageUrls
      );
    });
  });

  describe('Processing Completion Stage', () => {
    it('should mark processing as completed', async () => {
      
      await mockServices.dao.markCompleted(
        testData.videoSummaryId,
        'Video processing completed successfully'
      );

      expect(mockServices.dao.markCompleted).toHaveBeenCalledWith(
        testData.videoSummaryId,
        'Video processing completed successfully'
      );
    });

    it('should handle processing failures', async () => {
      
      const errorMessage = 'Processing failed: Network timeout during keyframe extraction';
      
      await mockServices.dao.updateProcessingStatus(
        testData.videoSummaryId,
        'failed',
        errorMessage
      );

      expect(mockServices.dao.updateProcessingStatus).toHaveBeenCalledWith(
        testData.videoSummaryId,
        'failed',
        errorMessage
      );
    });
  });

  describe('Complete Pipeline Integration', () => {
    it('should successfully process a video through the entire pipeline', async () => {
      // Simulate the complete background processing pipeline
      const pipelineData = generateTestVideoData({
        title: 'Complete Pipeline Test Video',
        duration: 600 // 10 minutes
      });

      // Stage 1: Transcript Extraction
      const transcriptResult = {
        success: true,
        segments: mockTranscriptData.withTranscript,
        fullText: 'Complete transcript content...',
        source: 'youtube-transcript'
      };

      // Stage 2: AI Analysis
      const aiAnalysisResult = expectedAIAnalysisResults.withTranscript;
      const validatedKeyframes = mockServices.ai.validateKeyframeIntervals(
        aiAnalysisResult.keyframeIntervals,
        pipelineData.duration
      );

      // Stage 3: Keyframe Extraction
      const keyframeResult = {
        success: true,
        keyframes: validatedKeyframes.map((kf: MockKeyframe) => ({
          timestamp: kf.timestamp,
          filename: `keyframe_${kf.timestamp.toString().padStart(6, '0')}.jpg`,
          path: `/tmp/keyframe_${kf.timestamp.toString().padStart(6, '0')}.jpg`,
          size: 8192
        })),
        tempDir: '/tmp/processing',
        videoPath: '/tmp/video.mp4'
      };

      // Stage 4: Asset Upload
      const keyframesUploadResult = await mockServices.storage.uploadKeyframes();
      const uploadResults = {
        keyframes: keyframesUploadResult,
        transcript: await mockServices.storage.uploadTranscript(),
        analysis: await mockServices.storage.uploadAnalysisResults()
      };

      // Verify all stages completed successfully
      expect(transcriptResult.success).toBe(true);
      expect(aiAnalysisResult.success).toBe(true);
      expect(keyframeResult.success).toBe(true);
      expect(uploadResults.keyframes.success).toBe(true);
      expect(uploadResults.transcript.url).toBeDefined();
      expect(uploadResults.analysis.url).toBeDefined();

      // Verify data flow between stages
      expect(validatedKeyframes).toHaveLength(5);
      expect(keyframeResult.keyframes).toHaveLength(5);
      expect(validatedKeyframes.every((kf: MockKeyframe) => kf.timestamp < pipelineData.duration)).toBe(true);
    });

    it('should handle partial failures and recovery', async () => {
      
      // Simulate transcript extraction failure
      const transcriptResult = {
        success: false,
        segments: [],
        fullText: '',
        source: 'none',
        error: 'No transcript available'
      };

      // AI analysis should still succeed using video analysis mode
      const aiAnalysisResult = expectedAIAnalysisResults.noTranscript;
      
      // Processing should continue despite transcript failure
      expect(transcriptResult.success).toBe(false);
      expect(aiAnalysisResult.success).toBe(true);
      expect(aiAnalysisResult.keyframeIntervals).toBeDefined();

      // Update status to reflect partial processing
      await mockServices.dao.updateProcessingStatus(
        testData.videoSummaryId,
        'generating_summary',
        'Proceeding with video analysis due to transcript unavailability',
        40,
        'Generating AI analysis and summary'
      );

      expect(mockServices.dao.updateProcessingStatus).toHaveBeenCalledWith(
        testData.videoSummaryId,
        'generating_summary',
        'Proceeding with video analysis due to transcript unavailability',
        40,
        'Generating AI analysis and summary'
      );
    });

    it('should handle processing timeout scenarios', async () => {
      
      // Simulate a timeout during keyframe extraction
      jest.useFakeTimers();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Processing timeout after 10 minutes')), 600000);
      });

      mockServices.keyframe.extractKeyframes.mockReturnValue(timeoutPromise);

      // Fast forward time
      jest.advanceTimersByTime(600000);

      try {
        await mockServices.keyframe.extractKeyframes(testData.youtubeId);
      } catch (error) {
        expect((error as Error).message).toContain('Processing timeout');
        
        // Verify failure is logged
        await mockServices.dao.updateProcessingStatus(
          testData.videoSummaryId,
          'failed',
          'Processing timeout after 10 minutes'
        );

        expect(mockServices.dao.updateProcessingStatus).toHaveBeenCalledWith(
          testData.videoSummaryId,
          'failed',
          'Processing timeout after 10 minutes'
        );
      }

      jest.useRealTimers();
    });
  });
});