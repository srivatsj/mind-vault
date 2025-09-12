import { serve } from 'inngest/next';
import { typedInngest } from '@/lib/inngest';
import { 
  videoProcessingJob, 
  cleanupTempFilesJob, 
  videoProcessingRetryJob 
} from '@/modules/video/jobs/video-processing.jobs';

// Create the handler
export const { GET, POST, PUT } = serve({
  client: typedInngest,
  functions: [
    videoProcessingJob,
    cleanupTempFilesJob,
    videoProcessingRetryJob
  ]
});