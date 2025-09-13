import { JobService } from '@/modules/video/services/job.service';
import { InngestStatusService } from '@/modules/video/services/inngest-status.service';

// Mock the Inngest client
jest.mock('@/lib/inngest', () => ({
  typedInngest: {
    send: jest.fn()
  }
}));

// Mock InngestStatusService
jest.mock('@/modules/video/services/inngest-status.service', () => ({
  InngestStatusService: {
    getUserFriendlyStatus: jest.fn(),
    getDetailedRunInfo: jest.fn(),
  },
}));

describe('JobService', () => {
  const mockVideoData = {
    videoSummaryId: 'test-summary-id',
    userId: 'test-user-id',
    youtubeUrl: 'https://www.youtube.com/watch?v=testVideoId',
    youtubeId: 'testVideoId',
    title: 'Test Video Title',
    description: 'Test video description',
    channelName: 'Test Channel',
    duration: 600,
    thumbnailUrl: 'https://img.youtube.com/vi/testVideoId/hqdefault.jpg'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock implementation for getUserFriendlyStatus before each test
    (InngestStatusService.getUserFriendlyStatus as jest.Mock).mockImplementation(
      async () => {
        if (!process.env.INNGEST_SIGNING_KEY) {
          return {
            currentStep: 'Initializing',
            progress: 0,
            status: 'pending',
            warnings: [],
            completedSteps: [],
          };
        }
        // Default mock for when INNGEST_SIGNING_KEY is set (not relevant for this test file, but good practice)
        return {
          currentStep: 'Mocked Step',
          progress: 50,
          status: 'processing',
          warnings: [],
          completedSteps: [],
        };
      }
    );
  });

  describe('triggerVideoProcessing', () => {
    it('should trigger video processing job successfully', async () => {
      const mockTypedInngest = jest.mocked(await import('@/lib/inngest')).typedInngest;
      mockTypedInngest.send.mockResolvedValue({
        ids: ['test-event-id']
      });

      const result = await JobService.triggerVideoProcessing(mockVideoData);

      expect(result.eventId).toBe('test-event-id');
      expect(mockTypedInngest.send).toHaveBeenCalledWith({
        name: 'video/process',
        data: mockVideoData
      });
    });

    it('should handle errors when triggering video processing', async () => {
      const mockTypedInngest = jest.mocked(await import('@/lib/inngest')).typedInngest;
      mockTypedInngest.send.mockRejectedValue(new Error('Inngest error'));

      await expect(
        JobService.triggerVideoProcessing(mockVideoData)
      ).rejects.toThrow('Inngest error');
    });
  });

  describe('triggerCleanupTempFiles', () => {
    it('should trigger cleanup job successfully', async () => {
      const mockTypedInngest = jest.mocked(await import('@/lib/inngest')).typedInngest;
      mockTypedInngest.send.mockResolvedValue({
        ids: ['cleanup-event-id']
      });

      const result = await JobService.triggerCleanupTempFiles('/tmp/test', 'test-summary-id');

      expect(result.eventId).toBe('cleanup-event-id');
      expect(mockTypedInngest.send).toHaveBeenCalledWith({
        name: 'video/cleanup-temp-files',
        data: {
          tempDir: '/tmp/test',
          videoSummaryId: 'test-summary-id'
        }
      });
    });
  });

  describe('triggerProcessingRetry', () => {
    it('should trigger retry job successfully', async () => {
      const mockTypedInngest = jest.mocked(await import('@/lib/inngest')).typedInngest;
      mockTypedInngest.send.mockResolvedValue({
        ids: ['retry-event-id']
      });

      const result = await JobService.triggerProcessingRetry('test-summary-id');

      expect(result.eventId).toBe('retry-event-id');
      expect(mockTypedInngest.send).toHaveBeenCalledWith({
        name: 'video/processing-failed',
        data: {
          videoSummaryId: 'test-summary-id'
        }
      });
    });
  });

});