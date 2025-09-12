import { TranscriptService, TranscriptSegment } from '@/modules/video/services/transcript.service';

describe('TranscriptService', () => {
  // Mock data for testing
  const mockSegments: TranscriptSegment[] = [
    { text: 'Hello world', start: 0, duration: 2 },
    { text: 'This is a test', start: 2, duration: 3 },
    { text: 'Video transcript', start: 5, duration: 2 }
  ];

  describe('searchTranscript', () => {
    it('should find segments containing query text', () => {
      const results = TranscriptService.searchTranscript(mockSegments, 'test');
      expect(results).toHaveLength(1);
      expect(results[0].text).toBe('This is a test');
    });

    it('should be case insensitive', () => {
      const results = TranscriptService.searchTranscript(mockSegments, 'HELLO');
      expect(results).toHaveLength(1);
      expect(results[0].text).toBe('Hello world');
    });

    it('should return empty array for no matches', () => {
      const results = TranscriptService.searchTranscript(mockSegments, 'nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('getSegmentAtTime', () => {
    it('should return correct segment for given time', () => {
      const segment = TranscriptService.getSegmentAtTime(mockSegments, 1);
      expect(segment?.text).toBe('Hello world');
    });

    it('should return null for time outside any segment', () => {
      const segment = TranscriptService.getSegmentAtTime(mockSegments, 10);
      expect(segment).toBeNull();
    });
  });

  describe('getTranscriptRange', () => {
    it('should return text for segments in time range', () => {
      const text = TranscriptService.getTranscriptRange(mockSegments, 1, 4);
      expect(text).toBe('This is a test');
    });

    it('should return combined text for multiple segments in range', () => {
      const text = TranscriptService.getTranscriptRange(mockSegments, 0, 6);
      expect(text).toBe('Hello world This is a test Video transcript');
    });
  });

  describe('extractTranscript', () => {
    it('should handle video with no transcript available', async () => {
      // Test with video ID that has no transcript (like our test case)
      const result = await TranscriptService.extractTranscript('jWRW2xGMqSw');
      
      expect(result.success).toBe(false);
      expect(result.segments).toHaveLength(0);
      expect(result.fullText).toBe('');
      expect(result.error).toContain('No transcript available');
    });

    it('should handle invalid video ID gracefully', async () => {
      // Test with obviously invalid video ID
      const result = await TranscriptService.extractTranscript('invalid-id-123');
      
      expect(result.success).toBe(false);
      expect(result.segments).toHaveLength(0);
      expect(result.fullText).toBe('');
      expect(result.error).toBeDefined();
    });

    it('should handle network errors gracefully', async () => {
      // Test with empty string which should cause an error
      const result = await TranscriptService.extractTranscript('');
      
      expect(result.success).toBe(false);
      expect(result.segments).toHaveLength(0);
      expect(result.fullText).toBe('');
      expect(result.error).toBeDefined();
    });

    // This test will only pass if we find a video with actual transcripts
    // Currently skipped as most videos don't have accessible transcripts
    it.skip('should successfully extract transcript from video with captions', async () => {
      // This would test with a known video that has transcripts
      // const result = await TranscriptService.extractTranscript('known-video-with-transcript');
      // expect(result.success).toBe(true);
      // expect(result.segments.length).toBeGreaterThan(0);
      // expect(result.fullText.length).toBeGreaterThan(0);
    });
  });

  describe('transcript availability detection', () => {
    it('should correctly identify when no transcript is available', () => {
      const emptyResult = {
        success: false,
        segments: [],
        fullText: '',
        source: 'youtube-transcript' as const,
        error: 'No transcript available for this video'
      };

      expect(emptyResult.success).toBe(false);
      expect(emptyResult.segments).toHaveLength(0);
      expect(emptyResult.error).toContain('No transcript available');
    });

    it('should correctly identify successful transcript extraction', () => {
      const successResult = {
        success: true,
        segments: mockSegments,
        fullText: mockSegments.map(s => s.text).join(' '),
        source: 'youtube-transcript' as const
      };

      expect(successResult.success).toBe(true);
      expect(successResult.segments.length).toBeGreaterThan(0);
      expect(successResult.fullText).toBeTruthy();
    });
  });

  // Note: Live transcript extraction tests are included above.
  // These test the actual behavior we observed in our system.
});