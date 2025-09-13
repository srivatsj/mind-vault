import { typedInngest } from '@/lib/inngest';
import { InngestStatusService } from './inngest-status.service';
import { VideoSummaryDao } from '../data/video-summary.dao';

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

    const eventId = result.ids[0];

    // Store event ID in database for status tracking
    await VideoSummaryDao.updateProcessingStatus(
      input.videoSummaryId,
      'pending',
      undefined,
      0,
      'Video processing queued',
      eventId
    );

    return { eventId };
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
   * Get detailed job info for debugging
   */
  static async getDetailedJobInfo() {
    return await InngestStatusService.getDetailedRunInfo();
  }
}