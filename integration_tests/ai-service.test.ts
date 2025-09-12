/**
 * Integration tests for AI Service
 * 
 * Tests AI analysis modes, keyframe generation, and video type inference
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { setupTestEnvironment } from './utils/test-helpers';
import { mockTranscriptData, expectedAIAnalysisResults } from './fixtures/video-data';

// Types for test objects
interface MockKeyframe {
  timestamp: number;
  reason: string;
  confidence: number;
  category: string;
}

// Mock the AI SDK
jest.mock('ai', () => ({
  generateObject: jest.fn()
}));

jest.mock('@ai-sdk/google', () => ({
  google: jest.fn()
}));

jest.mock('@/lib/config', () => ({
  getAIConfig: jest.fn().mockReturnValue({
    analysisMode: 'transcript'
  })
}));

describe('AI Service Integration Tests', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let AIService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockGenerateObject: any;

  beforeEach(async () => {
    setupTestEnvironment();
    
    // Import after mocking
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { generateObject } = require('ai');
    mockGenerateObject = generateObject as jest.MockedFunction<typeof generateObject>;
    
    const { AIService: ImportedAIService } = await import('@/modules/video/services/ai.service');
    AIService = ImportedAIService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Video Analysis Mode Selection', () => {
    it('should use transcript analysis when transcript is available', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getAIConfig } = require('@/lib/config');
      getAIConfig.mockReturnValue({ analysisMode: 'transcript' });

      mockGenerateObject.mockResolvedValue({
        object: expectedAIAnalysisResults.withTranscript
      });

      const input = {
        title: 'Test Video with Transcript',
        description: 'A video that has transcript data',
        duration: 600,
        transcript: mockTranscriptData.withTranscript,
        youtubeUrl: 'https://www.youtube.com/watch?v=test123'
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await AIService.analyzeVideo(input);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using transcript analysis mode for: Test Video with Transcript')
      );

      expect(result.success).toBe(true);
      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('TRANSCRIPT:')
        })
      );

      consoleSpy.mockRestore();
    });

    it('should use video analysis when no transcript is available', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getAIConfig } = require('@/lib/config');
      getAIConfig.mockReturnValue({ analysisMode: 'transcript' });

      mockGenerateObject.mockResolvedValue({
        object: expectedAIAnalysisResults.noTranscript
      });

      const input = {
        title: 'Advanced React Patterns - No Transcript Available',
        description: 'Advanced patterns in React development',
        duration: 3600,
        transcript: undefined,
        youtubeUrl: 'https://www.youtube.com/watch?v=noTranscript'
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await AIService.analyzeVideo(input);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using video analysis mode for: Advanced React Patterns - No Transcript Available (transcript available: undefined)')
      );

      expect(result.success).toBe(true);
      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('SIMULATE WATCHING THIS VIDEO')
        })
      );

      consoleSpy.mockRestore();
    });

    it('should use video analysis when explicitly configured', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getAIConfig } = require('@/lib/config');
      getAIConfig.mockReturnValue({ analysisMode: 'video' });

      mockGenerateObject.mockResolvedValue({
        object: expectedAIAnalysisResults.withTranscript
      });

      const input = {
        title: 'Test Video',
        description: 'A test video',
        duration: 300,
        transcript: mockTranscriptData.withTranscript, // Has transcript but should still use video mode
        youtubeUrl: 'https://www.youtube.com/watch?v=test123'
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await AIService.analyzeVideo(input);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using video analysis mode for: Test Video (transcript available: true)')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Video Type Inference', () => {
    const testCases = [
      {
        title: 'Complete Node.js Tutorial for Beginners',
        description: 'Learn Node.js from scratch with this comprehensive tutorial',
        expectedType: 'tutorial/educational'
      },
      {
        title: 'iPhone 15 Pro Review - Is it worth upgrading?',
        description: 'Detailed review and comparison of the new iPhone',
        expectedType: 'review/comparison'
      },
      {
        title: 'Live Demo: Building a React App',
        description: 'Watch as we build a complete React application live',
        expectedType: 'demonstration/showcase'
      },
      {
        title: 'React Conf 2024 - State Management Talk',
        description: 'Conference presentation about modern state management',
        expectedType: 'conference/presentation'
      },
      {
        title: 'JavaScript Course - Module 5: Async Programming',
        description: 'Part of our comprehensive JavaScript course series',
        expectedType: 'educational course'
      },
      {
        title: 'Interview with the Creator of Vue.js',
        description: 'Discussion about the future of Vue.js framework',
        expectedType: 'interview/discussion'
      },
      {
        title: 'Code Review: Optimizing React Performance',
        description: 'Programming tips for better React application performance',
        expectedType: 'review/comparison'
      },
      {
        title: 'Random Video Title',
        description: 'Some general content',
        expectedType: 'general educational'
      }
    ];

    testCases.forEach(({ title, description, expectedType }) => {
      it(`should infer "${expectedType}" for video: "${title}"`, async () => {
        mockGenerateObject.mockResolvedValue({
          object: expectedAIAnalysisResults.noTranscript
        });

        const input = {
          title,
          description,
          duration: 600,
          transcript: undefined,
          youtubeUrl: 'https://www.youtube.com/watch?v=test123'
        };

        await AIService.analyzeVideo(input);

        expect(mockGenerateObject).toHaveBeenCalledWith(
          expect.objectContaining({
            prompt: expect.stringContaining(`this appears to be a ${expectedType} video`)
          })
        );
      });
    });
  });

  describe('Keyframe Validation', () => {
    it('should filter keyframes outside video duration', () => {
      const keyframes = [
        { timestamp: -10, reason: 'Before start', confidence: 0.5, category: 'intro' },
        { timestamp: 0, reason: 'Start', confidence: 0.9, category: 'intro' },
        { timestamp: 150, reason: 'Middle', confidence: 0.8, category: 'main_point' },
        { timestamp: 500, reason: 'Beyond end', confidence: 0.7, category: 'conclusion' }
      ];

      const videoDuration = 300;
      const validated = AIService.validateKeyframeIntervals(keyframes, videoDuration);

      expect(validated).toHaveLength(2);
      expect(validated.every((kf: MockKeyframe) => kf.timestamp >= 0 && kf.timestamp < videoDuration)).toBe(true);
      expect(validated.map((kf: MockKeyframe) => kf.timestamp)).toEqual([0, 150]);
    });

    it('should enforce minimum gap between keyframes', () => {
      const keyframes = [
        { timestamp: 0, reason: 'Start', confidence: 0.9, category: 'intro' },
        { timestamp: 10, reason: 'Too close to start', confidence: 0.8, category: 'main_point' },
        { timestamp: 45, reason: 'Good gap', confidence: 0.8, category: 'main_point' },
        { timestamp: 50, reason: 'Too close to previous', confidence: 0.7, category: 'main_point' },
        { timestamp: 120, reason: 'Good gap again', confidence: 0.8, category: 'conclusion' }
      ];

      const validated = AIService.validateKeyframeIntervals(keyframes, 300, 30);

      expect(validated).toHaveLength(3);
      expect(validated.map((kf: MockKeyframe) => kf.timestamp)).toEqual([0, 45, 120]);
      
      // Verify minimum gap
      for (let i = 1; i < validated.length; i++) {
        expect(validated[i].timestamp - validated[i-1].timestamp).toBeGreaterThanOrEqual(30);
      }
    });

    it('should sort keyframes by timestamp', () => {
      const keyframes = [
        { timestamp: 120, reason: 'Middle', confidence: 0.8, category: 'main_point' },
        { timestamp: 0, reason: 'Start', confidence: 0.9, category: 'intro' },
        { timestamp: 240, reason: 'End', confidence: 0.7, category: 'conclusion' }
      ];

      const validated = AIService.validateKeyframeIntervals(keyframes, 300);

      expect(validated.map((kf: MockKeyframe) => kf.timestamp)).toEqual([0, 120, 240]);
    });
  });

  describe('Fallback Keyframe Generation', () => {
    it('should generate evenly spaced keyframes for short videos', () => {
      const duration = 120; // 2 minutes
      const fallbackKeyframes = AIService.generateFallbackIntervals(duration);

      expect(fallbackKeyframes).toHaveLength(5); // Minimum 5 for videos under 5 minutes
      expect(fallbackKeyframes[0].timestamp).toBe(20); // duration / (count + 1) = 120/6 = 20
      expect(fallbackKeyframes[0].category).toBe('intro');
      expect(fallbackKeyframes[fallbackKeyframes.length - 1].category).toBe('conclusion');
      expect(fallbackKeyframes.every((kf: MockKeyframe) => kf.confidence === 0.5)).toBe(true);
    });

    it('should generate appropriate keyframes for long videos', () => {
      const duration = 3600; // 1 hour
      const fallbackKeyframes = AIService.generateFallbackIntervals(duration);

      expect(fallbackKeyframes).toHaveLength(10); // Max 10 for very long videos
      expect(fallbackKeyframes[0].timestamp).toBe(327); // 3600 / 11 ≈ 327
      expect(fallbackKeyframes.every((kf: MockKeyframe) => kf.timestamp < duration)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle AI service failures gracefully', async () => {
      mockGenerateObject.mockRejectedValue(new Error('AI service temporarily unavailable'));

      const input = {
        title: 'Test Video',
        duration: 300,
        youtubeUrl: 'https://www.youtube.com/watch?v=test123'
      };

      const result = await AIService.analyzeVideoFromTranscript(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('AI service temporarily unavailable');
    });

    it('should handle invalid schema responses', async () => {
      // Mock invalid response that doesn't match schema
      mockGenerateObject.mockRejectedValue({
        name: 'AI_TypeValidationError',
        message: 'Schema validation failed'
      });

      const input = {
        title: 'Test Video',
        duration: 300,
        transcript: mockTranscriptData.withTranscript,
        youtubeUrl: 'https://www.youtube.com/watch?v=test123'
      };

      const result = await AIService.analyzeVideoFromTranscript(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Prompt Generation', () => {
    it('should generate appropriate prompts for transcript analysis', async () => {
      mockGenerateObject.mockResolvedValue({
        object: expectedAIAnalysisResults.withTranscript
      });

      const input = {
        title: 'Next.js Tutorial',
        description: 'Learn Next.js basics',
        duration: 1200,
        transcript: mockTranscriptData.withTranscript,
        channelName: 'Tech Channel',
        youtubeUrl: 'https://www.youtube.com/watch?v=test123'
      };

      await AIService.analyzeVideoFromTranscript(input);

      const callArgs = mockGenerateObject.mock.calls[0][0];
      const prompt = callArgs.prompt;

      expect(prompt).toContain('TRANSCRIPT:');
      expect(prompt).toContain('Next.js Tutorial');
      expect(prompt).toContain('1200 seconds (20:00)');
      expect(prompt).toContain('Tech Channel');
      expect(prompt).toContain('All keyframe timestamps MUST be between 0 and 1200 seconds');
      expect(prompt).toContain('Welcome to this comprehensive tutorial');
    });

    it('should generate appropriate prompts for video analysis without transcript', async () => {
      mockGenerateObject.mockResolvedValue({
        object: expectedAIAnalysisResults.noTranscript
      });

      const input = {
        title: 'Advanced React Patterns',
        description: 'Learn advanced React techniques',
        duration: 2400,
        transcript: undefined,
        channelName: 'React Masters',
        youtubeUrl: 'https://www.youtube.com/watch?v=advanced123'
      };

      await AIService.analyzeVideoDirectly(input);

      const callArgs = mockGenerateObject.mock.calls[0][0];
      const prompt = callArgs.prompt;

      expect(prompt).toContain('SIMULATE WATCHING THIS VIDEO');
      expect(prompt).toContain('NO TRANSCRIPT - INTELLIGENT VIDEO ANALYSIS MODE');
      expect(prompt).toContain('this appears to be a general educational video');
      expect(prompt).toContain('Advanced React Patterns');
      expect(prompt).toContain('2400 seconds (40:00)');
      expect(prompt).toContain('All keyframe timestamps MUST be between 0 and 2400 seconds');
      expect(prompt).toContain('KEYFRAME EXTRACTION STRATEGY:');
    });

    it('should include video duration constraints in all prompts', async () => {
      mockGenerateObject.mockResolvedValue({
        object: expectedAIAnalysisResults.withTranscript
      });

      const testDurations = [45, 300, 1800, 7200]; // 45s, 5min, 30min, 2hours

      for (const duration of testDurations) {
        const input = {
          title: `Test Video ${duration}s`,
          description: 'Test description',
          duration,
          transcript: mockTranscriptData.withTranscript,
          youtubeUrl: 'https://www.youtube.com/watch?v=test'
        };

        await AIService.analyzeVideoFromTranscript(input);

        const callArgs = mockGenerateObject.mock.calls[mockGenerateObject.mock.calls.length - 1][0];
        const prompt = callArgs.prompt;

        expect(prompt).toContain(`All keyframe timestamps MUST be between 0 and ${duration} seconds`);
        expect(prompt).toContain(`${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`);
      }
    });
  });
});