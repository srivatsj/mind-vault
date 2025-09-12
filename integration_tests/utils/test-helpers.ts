/**
 * Test utilities and helpers for integration tests
 */

import { jest } from '@jest/globals';
import type { TranscriptResult } from '@/modules/video/services/transcript.service';
import type { AIAnalysisResult } from '@/modules/video/services/ai.service';
import type { KeyframeExtractionResult } from '@/modules/video/services/keyframe.service';
import { mockTranscriptData, expectedAIAnalysisResults, mockVideoInfo } from '../fixtures/video-data';

/**
 * Mock the YouTube service for testing
 */
export function mockYouTubeService() {
  const YouTubeService = {
    validateYouTubeUrl: jest.fn(),
    extractVideoId: jest.fn(),
    getVideoInfo: jest.fn()
  };

  // Setup default mock implementations
  YouTubeService.validateYouTubeUrl.mockImplementation((...args: unknown[]) => {
    const url = args[0] as string;
    return url.includes('youtube.com') || url.includes('youtu.be');
  });

  YouTubeService.extractVideoId.mockImplementation((...args: unknown[]) => {
    const url = args[0] as string;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  });

  YouTubeService.getVideoInfo.mockImplementation((...args: unknown[]) => {
    const videoId = args[0] as string;
    const videoData = Object.values(mockVideoInfo).find((v: { id: string }) => v.id === videoId);
    if (!videoData) {
      throw new Error(`Video not found: ${videoId}`);
    }
    return Promise.resolve(videoData);
  });

  return YouTubeService;
}

/**
 * Mock the Transcript service for testing
 */
export function mockTranscriptService() {
  const TranscriptService = {
    extractTranscript: jest.fn()
  };

  TranscriptService.extractTranscript.mockImplementation((...args: unknown[]): Promise<TranscriptResult> => {
    const videoId = args[0] as string;
    // Simulate different transcript scenarios
    if (videoId === 'noTranscriptId' || videoId === 'testVideoId') {
      return Promise.resolve({
        success: false,
        segments: [],
        fullText: '',
        source: 'none' as const,
        error: 'No transcript available for this video'
      });
    }

    return Promise.resolve({
      success: true,
      segments: mockTranscriptData.withTranscript,
      fullText: mockTranscriptData.withTranscript.map((s: { text: string }) => s.text).join(' '),
      source: 'youtube-transcript' as const
    });
  });

  return TranscriptService;
}

/**
 * Mock the AI service for testing
 */
export function mockAIService() {
  const AIService = {
    analyzeVideo: jest.fn(),
    validateKeyframeIntervals: jest.fn()
  };

  AIService.analyzeVideo.mockImplementation((...args: unknown[]): Promise<AIAnalysisResult> => {
    const input = args[0] as { transcript?: unknown[]; [key: string]: unknown };
    const hasTranscript = input.transcript && input.transcript.length > 0;
    
    if (hasTranscript) {
      return Promise.resolve(expectedAIAnalysisResults.withTranscript);
    } else {
      return Promise.resolve(expectedAIAnalysisResults.noTranscript);
    }
  });

  AIService.validateKeyframeIntervals.mockImplementation((...args: unknown[]) => {
    const intervals = args[0] as Array<{ timestamp: number; [key: string]: unknown }>;
    const duration = args[1] as number;
    const minGap = (args[2] as number) || 0;

    const sorted = intervals
      .filter(kf => kf.timestamp >= 0 && kf.timestamp < duration)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (minGap === 0) {
      return sorted;
    }

    const filtered = [];
    let lastTimestamp = -Infinity;
    for (const kf of sorted) {
      if (kf.timestamp - lastTimestamp >= minGap) {
        filtered.push(kf);
        lastTimestamp = kf.timestamp;
      }
    }
    return filtered;
  });

  return AIService;
}

/**
 * Mock the Keyframe service for testing
 */
export function mockKeyframeService() {
  const KeyframeService = {
    extractKeyframes: jest.fn()
  };

  KeyframeService.extractKeyframes.mockImplementation((): Promise<KeyframeExtractionResult> => {
    return Promise.resolve({
      success: true,
      keyframes: [
        { timestamp: 0, filename: 'keyframe_000000.jpg', path: '/tmp/keyframe_000000.jpg', size: 1024 },
        { timestamp: 30, filename: 'keyframe_000030.jpg', path: '/tmp/keyframe_000030.jpg', size: 1024 },
        { timestamp: 120, filename: 'keyframe_000120.jpg', path: '/tmp/keyframe_000120.jpg', size: 1024 }
      ],
      tempDir: '/tmp/test-keyframes',
      videoPath: '/tmp/test-video.mp4'
    });
  });

  return KeyframeService;
}

/**
 * Mock the Storage service for testing
 */
export function mockStorageService() {
  const StorageService = {
    uploadKeyframes: jest.fn(),
    uploadTranscript: jest.fn(),
    uploadAnalysisResults: jest.fn()
  };

  StorageService.uploadKeyframes.mockResolvedValue({
    success: true,
    uploads: [
      { url: 'https://blob.vercel-storage.com/keyframe1.jpg', filename: 'keyframe_000000.jpg', size: 1024 },
      { url: 'https://blob.vercel-storage.com/keyframe2.jpg', filename: 'keyframe_000030.jpg', size: 1024 }
    ]
  } as never);

  StorageService.uploadTranscript.mockResolvedValue({
    url: 'https://blob.vercel-storage.com/transcript.json',
    filename: 'transcript.json',
    size: 512,
    contentType: 'application/json'
  } as never);

  StorageService.uploadAnalysisResults.mockResolvedValue({
    url: 'https://blob.vercel-storage.com/analysis.json',
    filename: 'analysis.json',
    size: 256,
    contentType: 'application/json'
  } as never);

  return StorageService;
}

/**
 * Mock the DAO layer for testing
 */
export function mockVideoSummaryDao() {
  const VideoSummaryDao = {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserAndYouTubeId: jest.fn(),
    updateProcessingStatus: jest.fn(),
    updateAIContent: jest.fn(),
    updateKeyframes: jest.fn(),
    updateStorageUrls: jest.fn(),
    markCompleted: jest.fn()
  };

  let summaryIdCounter = 1;
  const mockSummaries = new Map();

  VideoSummaryDao.create.mockImplementation((...args: unknown[]) => {
    const data = args[0] as { [key: string]: unknown };
    const id = `test-summary-${summaryIdCounter++}`;
    mockSummaries.set(id, { id, ...data, createdAt: new Date() });
    return Promise.resolve(id);
  });

  VideoSummaryDao.findById.mockImplementation((...args: unknown[]) => {
    const id = args[0] as string;
    return Promise.resolve(mockSummaries.get(id) || null);
  });

  VideoSummaryDao.findByUserAndYouTubeId.mockResolvedValue(null as never);

  VideoSummaryDao.updateProcessingStatus.mockResolvedValue(true as never);
  VideoSummaryDao.updateAIContent.mockResolvedValue(true as never);
  VideoSummaryDao.updateKeyframes.mockResolvedValue(true as never);
  VideoSummaryDao.updateStorageUrls.mockResolvedValue(true as never);
  VideoSummaryDao.markCompleted.mockResolvedValue(true as never);

  return VideoSummaryDao;
}

/**
 * Create a test database session
 */
export function createTestSession() {
  return {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User'
    },
    session: {
      id: 'test-session-id',
      userId: 'test-user-id'
    }
  };
}

/**
 * Setup environment variables for testing
 */
export function setupTestEnvironment() {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key';
  process.env.YOUTUBE_API_KEY = 'test-youtube-key';
  process.env.BLOB_READ_WRITE_TOKEN = 'test-blob-token';
  process.env.AI_VIDEO_ANALYSIS_MODE = 'transcript';
}

/**
 * Wait for a specified amount of time (useful for async operations)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test video data interface
 */
interface TestVideoData {
  videoSummaryId: string;
  userId: string;
  youtubeUrl: string;
  youtubeId: string;
  title: string;
  description: string;
  channelName: string;
  duration: number;
  thumbnailUrl: string;
}

/**
 * Generate test video processing data
 */
export function generateTestVideoData(overrides: Partial<TestVideoData> = {}): TestVideoData {
  return {
    videoSummaryId: 'test-summary-1',
    userId: 'test-user-id',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    youtubeId: 'dQw4w9WgXcQ',
    title: 'Test Video',
    description: 'A test video for integration testing',
    channelName: 'Test Channel',
    duration: 212,
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    ...overrides
  };
}
