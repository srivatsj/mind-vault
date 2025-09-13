
interface UserFriendlyStatus {
  currentStep: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  warnings: string[];
  completedSteps: string[];
}

interface DetailedRunInfo {
  runId: string;
  status: string;
  duration?: number;
  steps: Array<{
    name: string;
    status: string;
    duration?: number;
    error?: string;
    output?: unknown;
  }>;
  error?: string;
}


export class InngestStatusService {
  /**
   * Get user-friendly status for UI display
   * Uses database status as primary source, with optional API enhancement
   */
  static async getUserFriendlyStatus(eventId: string): Promise<UserFriendlyStatus> {
    // Always use database as primary source of truth
    const dbStatus = await this.getDatabaseBasedStatus(eventId);
    
    // In development, try to enhance with local dev server data if available
    if (process.env.NODE_ENV !== 'production') {
      try {
        const localInngestUrl = process.env.INNGEST_DEV_SERVER_URL || 'http://localhost:8288';
        const response = await fetch(`${localInngestUrl}/v1/events`);
        
        if (response.ok) {
          // TODO: Parse events data to find matching eventId and enhance status
          // For now, just return database status
        }
      } catch {
        // Dev server not available, continue with database status
      }
    }
    
    return dbStatus;
  }

  /**
   * Get status based on database processing status
   */
  private static async getDatabaseBasedStatus(eventId: string): Promise<UserFriendlyStatus> {
    try {
      // Import here to avoid circular dependencies
      const { VideoSummaryDao } = await import('../data/video-summary.dao');
      
      // Find video summary by event ID
      const summary = await VideoSummaryDao.findByEventId(eventId);
      
      if (!summary) {
        return {
          currentStep: 'Initializing',
          progress: 0,
          status: 'pending',
          warnings: [],
          completedSteps: []
        };
      }

      const dbStatus = summary.processingStatus;
      const statusMapping = {
        'pending': { status: 'pending' as const, step: 'Queued for processing', progress: 0 },
        'extracting_transcript': { status: 'processing' as const, step: 'Extracting transcript', progress: 20 },
        'generating_summary': { status: 'processing' as const, step: 'Generating AI summary', progress: 40 },
        'extracting_keyframes': { status: 'processing' as const, step: 'Creating visual highlights', progress: 60 },
        'uploading_assets': { status: 'processing' as const, step: 'Uploading assets', progress: 80 },
        'completed': { status: 'completed' as const, step: 'Completed', progress: 100 },
        'failed': { status: 'failed' as const, step: 'Failed', progress: 10 }
      };

      const mappedStatus = statusMapping[dbStatus] || statusMapping['pending'];
      
      return {
        currentStep: mappedStatus.step,
        progress: mappedStatus.progress,
        status: mappedStatus.status,
        warnings: summary.processingError ? [summary.processingError] : [],
        completedSteps: this.getCompletedStepsFromDbStatus(dbStatus)
      };
    } catch (error) {
      console.error('Error getting database status:', error);
      // Return default pending status if database query fails
      return {
        currentStep: 'Initializing',
        progress: 0,
        status: 'pending',
        warnings: [],
        completedSteps: []
      };
    }
  }

  private static getCompletedStepsFromDbStatus(status: string): string[] {
    const allSteps = ['Extracting transcript', 'Generating AI summary', 'Creating visual highlights', 'Uploading assets'];
    const stepMap: Record<string, string[]> = {
      'pending': [],
      'extracting_transcript': [],
      'generating_summary': [allSteps[0]], // transcript completed
      'extracting_keyframes': [allSteps[0], allSteps[1]], // transcript + AI summary completed
      'uploading_assets': [allSteps[0], allSteps[1], allSteps[2]], // transcript + AI summary + keyframes completed
      'completed': allSteps,
      'failed': []
    };

    return stepMap[status] || [];
  }

  /**
   * Get detailed run info for debugging
   * Currently returns null as we're using database-based status
   */
  static async getDetailedRunInfo(): Promise<DetailedRunInfo | null> {
    // TODO: Implement if needed for debugging
    return null;
  }
}