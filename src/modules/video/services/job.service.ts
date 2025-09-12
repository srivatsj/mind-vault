import { typedInngest } from '@/lib/inngest';

export interface TriggerVideoProcessingInput {
  videoSummaryId: string;
  userId: string;
  youtubeUrl: string;
  youtubeId: string;
  title: string;
  description?: string;
  channelName?: string;
  duration?: number;
  thumbnailUrl?: string;
}

export class JobService {
  /**
   * Trigger video processing pipeline
   */
  static async triggerVideoProcessing(input: TriggerVideoProcessingInput): Promise<{ eventId: string }> {
    const result = await typedInngest.send({
      name: 'video/process',
      data: input
    });

    return { eventId: result.ids[0] };
  }

  /**
   * Trigger manual cleanup of temporary files
   */
  static async triggerCleanupTempFiles(tempDir: string, videoSummaryId: string): Promise<{ eventId: string }> {
    const result = await typedInngest.send({
      name: 'video/cleanup-temp-files',
      data: {
        tempDir,
        videoSummaryId
      }
    });

    return { eventId: result.ids[0] };
  }

  /**
   * Trigger retry for failed processing
   */
  static async triggerProcessingRetry(videoSummaryId: string): Promise<{ eventId: string }> {
    const result = await typedInngest.send({
      name: 'video/processing-failed',
      data: {
        videoSummaryId
      }
    });

    return { eventId: result.ids[0] };
  }

  /**
   * Get job status (placeholder - would need actual implementation based on Inngest API)
   */
  static async getJobStatus(eventId: string): Promise<{
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress?: number;
    error?: string;
  }> {
    // This would require integration with Inngest's API to get actual job status
    // For now, return a placeholder - eventId would be used in actual implementation
    console.log(`Job status requested for eventId: ${eventId}`);
    return {
      status: 'pending'
    };
  }
}