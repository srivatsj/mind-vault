import { AIService } from '@/modules/video/services/ai.service';

describe('AIService', () => {
  const mockVideoInput = {
    title: 'Introduction to Machine Learning',
    description: 'A comprehensive guide to ML basics',
    duration: 1800, // 30 minutes
    channelName: 'Tech Education',
    transcript: [
      { text: 'Welcome to machine learning tutorial', start: 0, duration: 5 },
      { text: 'Today we will learn about neural networks', start: 5, duration: 5 },
      { text: 'Let me show you some examples', start: 600, duration: 5 },
      { text: 'In conclusion, ML is very powerful', start: 1750, duration: 10 }
    ]
  };

  describe('validateKeyframeIntervals', () => {
    it('should filter out intervals beyond video duration', () => {
      const intervals = [
        { timestamp: 10, reason: 'Valid', confidence: 0.9, category: 'intro' as const },
        { timestamp: 2000, reason: 'Invalid - beyond duration', confidence: 0.8, category: 'main_point' as const },
        { timestamp: 500, reason: 'Valid', confidence: 0.7, category: 'demo' as const }
      ];

      const result = AIService.validateKeyframeIntervals(intervals, 1800);
      
      expect(result).toHaveLength(2);
      expect(result.every(interval => interval.timestamp < 1800)).toBe(true);
    });

    it('should sort intervals by timestamp', () => {
      const intervals = [
        { timestamp: 500, reason: 'Middle', confidence: 0.8, category: 'demo' as const },
        { timestamp: 10, reason: 'Start', confidence: 0.9, category: 'intro' as const },
        { timestamp: 1000, reason: 'End', confidence: 0.7, category: 'conclusion' as const }
      ];

      const result = AIService.validateKeyframeIntervals(intervals, 1800);
      
      expect(result[0].timestamp).toBe(10);
      expect(result[1].timestamp).toBe(500);
      expect(result[2].timestamp).toBe(1000);
    });

    it('should enforce minimum gap between intervals', () => {
      const intervals = [
        { timestamp: 10, reason: 'First', confidence: 0.9, category: 'intro' as const },
        { timestamp: 20, reason: 'Too close', confidence: 0.8, category: 'main_point' as const },
        { timestamp: 50, reason: 'Valid gap', confidence: 0.7, category: 'demo' as const }
      ];

      const result = AIService.validateKeyframeIntervals(intervals, 1800, 30);
      
      expect(result).toHaveLength(2); // Should remove the middle one
      expect(result[0].timestamp).toBe(10);
      expect(result[1].timestamp).toBe(50);
    });

    it('should handle empty intervals array', () => {
      const result = AIService.validateKeyframeIntervals([], 1800);
      expect(result).toEqual([]);
    });
  });

  // Skip actual API tests as they require:
  // 1. Gemini API key configuration
  // 2. Network access
  // 3. API quota usage
  describe.skip('analyzeVideo', () => {
    it('should analyze video and return structured results', async () => {
      // This test would require proper API setup and mocking
      const result = await AIService.analyzeVideo(mockVideoInput);
      
      expect(result.success).toBe(true);
      expect(result.keyframeIntervals).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.tags).toBeDefined();
      expect(result.categories).toBeDefined();
    });
  });

  describe.skip('generateKeyframeIntervals', () => {
    it('should generate relevant keyframe intervals', async () => {
      const intervals = await AIService.generateKeyframeIntervals(mockVideoInput);
      
      expect(intervals).toBeDefined();
      expect(intervals.length).toBeGreaterThan(0);
      expect(intervals.every(i => i.timestamp >= 0 && i.timestamp < mockVideoInput.duration)).toBe(true);
    });
  });

  describe.skip('generateSummary', () => {
    it('should generate comprehensive video summary', async () => {
      const summary = await AIService.generateSummary(mockVideoInput);
      
      expect(summary).not.toBeNull();
      expect(summary?.summary).toBeDefined();
      expect(summary?.keyPoints).toBeDefined();
      expect(summary?.topics).toBeDefined();
      expect(summary?.difficulty).toMatch(/^(beginner|intermediate|advanced)$/);
    });
  });

  describe.skip('generateTags', () => {
    it('should generate relevant tags and categories', async () => {
      const result = await AIService.generateTags(mockVideoInput);
      
      expect(result.tags).toBeDefined();
      expect(result.categories).toBeDefined();
      expect(result.tags.length).toBeGreaterThan(0);
      expect(result.categories.length).toBeGreaterThan(0);
    });
  });
});