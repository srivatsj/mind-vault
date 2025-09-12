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

  // Note: We're not testing the actual extraction methods as they require 
  // network calls. Those should be tested with integration tests or mocked.
});