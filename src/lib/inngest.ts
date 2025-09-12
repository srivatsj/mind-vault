import { Inngest } from 'inngest';

export const inngest = new Inngest({ 
  id: 'mind-vault',
  name: 'Mind Vault Video Processing'
});

// Event types for type safety
export type VideoProcessingEvents = {
  'video/process': {
    data: {
      videoSummaryId: string;
      userId: string;
      youtubeUrl: string;
      youtubeId: string;
      title: string;
      description?: string;
      channelName?: string;
      duration?: number;
      thumbnailUrl?: string;
    };
  };
  
  'video/transcript-extracted': {
    data: {
      videoSummaryId: string;
      transcript: {
        success: boolean;
        segments: Array<{
          text: string;
          start: number;
          duration: number;
        }>;
        fullText: string;
        source: string;
        error?: string;
      };
    };
  };

  'video/keyframes-extracted': {
    data: {
      videoSummaryId: string;
      keyframes: Array<{
        timestamp: number;
        filename: string;
        path: string;
        size?: number;
      }>;
      tempDir: string;
      error?: string;
    };
  };

  'video/assets-uploaded': {
    data: {
      videoSummaryId: string;
      uploadResults: {
        keyframes: Array<{
          url: string;
          filename: string;
          size: number;
        }>;
        transcript?: {
          url: string;
          filename: string;
          size: number;
        };
        analysis?: {
          url: string;
          filename: string;
          size: number;
        };
      };
    };
  };

  'video/ai-analysis-complete': {
    data: {
      videoSummaryId: string;
      analysis: {
        success: boolean;
        keyframeIntervals?: Array<{
          timestamp: number;
          reason: string;
          confidence: number;
          category: string;
        }>;
        summary?: {
          summary: string;
          keyPoints: string[];
          topics: string[];
          difficulty: string;
          estimatedReadTime: number;
        };
        tags?: string[];
        categories?: string[];
        error?: string;
      };
    };
  };

  'video/processing-complete': {
    data: {
      videoSummaryId: string;
      success: boolean;
      error?: string;
    };
  };

  'video/cleanup-temp-files': {
    data: {
      tempDir: string;
      videoSummaryId: string;
    };
  };
};

// Create typed Inngest client
export const typedInngest = inngest;