import { YoutubeTranscript } from 'youtube-transcript';
import ytdl from '@distube/ytdl-core';

export interface TranscriptSegment {
  text: string;
  start: number;  // seconds
  duration: number;  // seconds
}

export interface TranscriptResult {
  success: boolean;
  segments: TranscriptSegment[];
  fullText: string;
  language?: string;
  source: 'youtube-transcript' | 'ytdl-captions' | 'none';
  error?: string;
}

export class TranscriptService {
  /**
   * Extract transcript using multiple fallback strategies
   */
  static async extractTranscript(videoId: string): Promise<TranscriptResult> {
    // Strategy 1: Try youtube-transcript (fastest, most reliable)
    try {
      const transcript = await this.getYouTubeTranscript(videoId);
      if (transcript.success) {
        return transcript;
      }
    } catch (error) {
      console.log('YouTube transcript failed, trying fallback...', error);
    }

    // Strategy 2: Try ytdl-core for captions
    try {
      const transcript = await this.getYtdlCaptions(videoId);
      if (transcript.success) {
        return transcript;
      }
    } catch (error) {
      console.log('ytdl-core captions failed...', error);
    }

    // All strategies failed
    return {
      success: false,
      segments: [],
      fullText: '',
      source: 'none',
      error: 'No transcript available for this video'
    };
  }

  /**
   * Get transcript using youtube-transcript library
   */
  private static async getYouTubeTranscript(videoId: string): Promise<TranscriptResult> {
    try {
      const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (!transcriptData || transcriptData.length === 0) {
        return {
          success: false,
          segments: [],
          fullText: '',
          source: 'youtube-transcript',
          error: 'No transcript data available for this video'
        };
      }

      const segments: TranscriptSegment[] = transcriptData.map(item => ({
        text: item.text,
        start: item.offset / 1000, // Convert ms to seconds
        duration: item.duration / 1000 // Convert ms to seconds
      }));

      const fullText = segments.map(s => s.text).join(' ');

      return {
        success: true,
        segments,
        fullText,
        source: 'youtube-transcript'
      };
    } catch (error) {
      // Don't throw error, return failed result to allow fallback
      return {
        success: false,
        segments: [],
        fullText: '',
        source: 'youtube-transcript',
        error: `YouTube transcript extraction failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get captions using ytdl-core
   */
  private static async getYtdlCaptions(videoId: string): Promise<TranscriptResult> {
    try {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const info = await ytdl.getInfo(videoUrl);
      
      // Look for caption tracks
      const captionTracks = info.player_response?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      
      if (!captionTracks || captionTracks.length === 0) {
        return {
          success: false,
          segments: [],
          fullText: '',
          source: 'ytdl-captions',
          error: 'No captions available for this video'
        };
      }

      // Prefer English captions, fallback to first available
      const selectedTrack = captionTracks.find(track => 
        track.languageCode === 'en' || track.languageCode?.startsWith('en')
      ) || captionTracks[0];

      if (!selectedTrack?.baseUrl) {
        return {
          success: false,
          segments: [],
          fullText: '',
          source: 'ytdl-captions',
          error: 'No valid caption track found'
        };
      }

      // Fetch caption content
      const response = await fetch(selectedTrack.baseUrl);
      const captionXml = await response.text();
      
      // Parse XML to extract text and timings
      const segments = this.parseCaptionXml(captionXml);
      
      if (segments.length === 0) {
        return {
          success: false,
          segments: [],
          fullText: '',
          source: 'ytdl-captions',
          error: 'No valid caption segments found'
        };
      }
      
      const fullText = segments.map(s => s.text).join(' ');

      return {
        success: true,
        segments,
        fullText,
        language: selectedTrack.languageCode,
        source: 'ytdl-captions'
      };
    } catch (error) {
      return {
        success: false,
        segments: [],
        fullText: '',
        source: 'ytdl-captions',
        error: `ytdl-core caption extraction failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Parse YouTube caption XML format
   */
  private static parseCaptionXml(xml: string): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    
    // Simple regex-based XML parsing for YouTube captions
    // Format: <text start="time" dur="duration">caption text</text>
    const textRegex = /<text[^>]*start="([^"]*)"[^>]*dur="([^"]*)"[^>]*>([^<]*)<\/text>/g;
    
    let match;
    while ((match = textRegex.exec(xml)) !== null) {
      const start = parseFloat(match[1]);
      const duration = parseFloat(match[2]);
      const text = this.decodeHtmlEntities(match[3]);
      
      if (!isNaN(start) && !isNaN(duration) && text.trim()) {
        segments.push({
          text: text.trim(),
          start,
          duration
        });
      }
    }
    
    return segments;
  }

  /**
   * Decode HTML entities in caption text
   */
  private static decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' '
    };
    
    return text.replace(/&[^;]+;/g, entity => entities[entity] || entity);
  }

  /**
   * Search for specific text in transcript
   */
  static searchTranscript(segments: TranscriptSegment[], query: string): TranscriptSegment[] {
    const lowerQuery = query.toLowerCase();
    return segments.filter(segment => 
      segment.text.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get transcript segment at specific timestamp
   */
  static getSegmentAtTime(segments: TranscriptSegment[], timeInSeconds: number): TranscriptSegment | null {
    return segments.find(segment => 
      timeInSeconds >= segment.start && 
      timeInSeconds < (segment.start + segment.duration)
    ) || null;
  }

  /**
   * Get transcript text for a specific time range
   */
  static getTranscriptRange(
    segments: TranscriptSegment[], 
    startTime: number, 
    endTime: number
  ): string {
    const rangeSegments = segments.filter(segment => 
      segment.start >= startTime && segment.start <= endTime
    );
    return rangeSegments.map(s => s.text).join(' ');
  }
}