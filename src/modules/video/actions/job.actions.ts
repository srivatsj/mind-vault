'use server';

import { JobService, type TriggerVideoProcessingInput } from '../services/job.service';

export async function triggerVideoProcessingAction(input: TriggerVideoProcessingInput) {
  try {
    return await JobService.triggerVideoProcessing(input);
  } catch (error) {
    throw new Error(`Failed to trigger video processing: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function triggerCleanupTempFilesAction(tempDir: string, videoSummaryId: string) {
  try {
    return await JobService.triggerCleanupTempFiles(tempDir, videoSummaryId);
  } catch (error) {
    throw new Error(`Failed to trigger cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function triggerProcessingRetryAction(videoSummaryId: string) {
  try {
    return await JobService.triggerProcessingRetry(videoSummaryId);
  } catch (error) {
    throw new Error(`Failed to trigger retry: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getDetailedJobInfoAction() {
  try {
    return await JobService.getDetailedJobInfo();
  } catch (error) {
    throw new Error(`Failed to get job info: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}