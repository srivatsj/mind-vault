import { typedInngest } from '@/lib/inngest';
import { getVideoConfig } from '@/lib/config';
import { TranscriptService } from '../services/transcript.service';
import { KeyframeService } from '../services/keyframe.service';
import { AIService } from '../services/ai.service';
import { StorageService } from '../services/storage.service';
import { VideoSummaryDao } from '../data/video-summary.dao';
import { MultimodalEmbeddingService } from '../../chat/services/multimodal-embedding.service';

/**
 * Main video processing orchestration job
 * Coordinates the entire video processing pipeline
 */
export const videoProcessingJob = typedInngest.createFunction(
  { 
    id: 'video-processing-pipeline',
    name: 'Process Video for AI Analysis'
  },
  { event: 'video/process' },
  async ({ event, step }) => {
    const { data } = event;
    const config = getVideoConfig();
    // const inngestConfig = getInngestConfig(); // TODO: Use this for job configuration
    
    console.log(`Starting video processing for: ${data.title}`);

    // Step 1: Extract transcript
    const transcript = await step.run('extract-transcript', async () => {
      console.log(`Extracting transcript for video: ${data.youtubeId}`);
      
      try {
        const result = await TranscriptService.extractTranscript(data.youtubeId);
        
        // Update database with transcript extraction status and data
        await VideoSummaryDao.updateProcessingStatus(
          data.videoSummaryId,
          'extracting_transcript',
          result.success ? undefined : result.error,
          result.success ? 20 : undefined,
          'Extracting video transcript'
        );

        // Store transcript in database if successful
        if (result.success) {
          await VideoSummaryDao.updateTranscript(
            data.videoSummaryId,
            result.fullText
          );
        }

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Transcript extraction failed';
        await VideoSummaryDao.updateProcessingStatus(
          data.videoSummaryId,
          'failed',
          errorMessage
        );
        throw error;
      }
    });

    // Send transcript extracted event
    await step.sendEvent('transcript-extracted', {
      name: 'video/transcript-extracted',
      data: {
        videoSummaryId: data.videoSummaryId,
        transcript
      }
    });

    // Step 2: Generate AI analysis (keyframe intervals + summary)
    const aiAnalysis = await step.run('ai-analysis', async () => {
      console.log(`Running AI analysis for: ${data.title}`);
      
      try {
        const analysisInput = {
          title: data.title,
          description: data.description,
          duration: data.duration || 0,
          transcript: transcript.success ? transcript.segments : undefined,
          channelName: data.channelName,
          youtubeUrl: data.youtubeUrl
        };

        const result = await AIService.analyzeVideo(analysisInput);
        
        // Update database status
        await VideoSummaryDao.updateProcessingStatus(
          data.videoSummaryId,
          'generating_summary',
          undefined,
          40,
          'Generating AI analysis and summary'
        );

        if (result.success) {
          // Validate and filter keyframe intervals against video duration
          const validatedKeyframes = result.keyframeIntervals 
            ? AIService.validateKeyframeIntervals(result.keyframeIntervals, data.duration || 0)
            : [];
          
          console.log(`Validated ${validatedKeyframes.length} keyframes out of ${result.keyframeIntervals?.length || 0} generated`);
          
          // Update database with AI-generated content and create tag/category relationships
          await VideoSummaryDao.updateAIContentWithRelations(data.videoSummaryId, {
            summary: result.summary,
            keyframeIntervals: validatedKeyframes,
            tags: result.tags,
            categories: result.categories
          });
        }

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'AI analysis failed';
        console.error('AI Analysis step failed:', error);
        await VideoSummaryDao.updateProcessingStatus(
          data.videoSummaryId,
          'failed',
          errorMessage
        );
        throw error;
      }
    });

    // Send AI analysis complete event
    await step.sendEvent('ai-analysis-complete', {
      name: 'video/ai-analysis-complete',
      data: {
        videoSummaryId: data.videoSummaryId,
        analysis: aiAnalysis
      }
    });

    // Step 3: Extract keyframes using validated intervals from database
    const keyframeExtraction = await step.run('extract-keyframes', async () => {
      if (!aiAnalysis.success) {
        throw new Error('Cannot extract keyframes without successful AI analysis');
      }

      // Get validated keyframes from database (these have been filtered for valid timestamps)
      const videoSummary = await VideoSummaryDao.findById(data.videoSummaryId, data.userId);
      const keyframeIntervals = videoSummary?.aiGeneratedContent?.keyframeIntervals;
      
      if (!keyframeIntervals || keyframeIntervals.length === 0) {
        console.log(`No valid keyframes found for: ${data.title}, skipping keyframe extraction`);
        return { success: true, keyframes: [], message: 'No valid keyframes to extract' };
      }

      console.log(`Extracting ${keyframeIntervals.length} validated keyframes for: ${data.title}`);
      
      // Update database status
      await VideoSummaryDao.updateProcessingStatus(
        data.videoSummaryId,
        'extracting_keyframes',
        undefined,
        60,
        'Extracting keyframes from video'
      );
      
      try {
        const intervals = keyframeIntervals.map((kf: { timestamp: number }) => kf.timestamp);
        const result = await KeyframeService.extractKeyframes(data.youtubeId, {
          intervals,
          quality: config.keyframe.quality,
          width: config.keyframe.maxWidth,
          height: config.keyframe.maxHeight
        });

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Keyframe extraction failed';
        console.warn(`Keyframe extraction failed for ${data.title}: ${errorMessage}`);
        
        // Continue processing without keyframes instead of failing entirely
        return { 
          success: false, 
          keyframes: [], 
          tempDir: '', 
          error: errorMessage 
        };
      }
    });

    // Send keyframes extracted event
    await step.sendEvent('keyframes-extracted', {
      name: 'video/keyframes-extracted',
      data: {
        videoSummaryId: data.videoSummaryId,
        keyframes: keyframeExtraction.keyframes,
        tempDir: keyframeExtraction.success && 'tempDir' in keyframeExtraction ? keyframeExtraction.tempDir : undefined,
        error: keyframeExtraction.success ? undefined : (keyframeExtraction as { error?: string }).error
      }
    });

    // Step 4: Upload assets to blob storage
    const assetUpload = await step.run('upload-assets', async () => {
      if (!keyframeExtraction.success) {
        throw new Error('Cannot upload assets without successful keyframe extraction');
      }

      // Skip upload if no keyframes were extracted
      if (!('keyframes' in keyframeExtraction) || !keyframeExtraction.keyframes || keyframeExtraction.keyframes.length === 0) {
        console.log(`No keyframes to upload for: ${data.title}, skipping asset upload`);
        return { success: true, message: 'No assets to upload' };
      }

      console.log(`Uploading assets for: ${data.title}`);
      
      // Update database status
      await VideoSummaryDao.updateProcessingStatus(
        data.videoSummaryId,
        'uploading_assets',
        undefined,
        80,
        'Uploading assets to cloud storage'
      );
      
      try {
        const keyframePaths = keyframeExtraction.keyframes
          .map((kf: { path?: string } | null) => kf?.path)
          .filter((path): path is string => Boolean(path));
        
        // Upload keyframes
        const keyframeUploads = await StorageService.uploadKeyframes(
          data.youtubeId,
          keyframePaths,
          { folder: `videos/${data.videoSummaryId}` }
        );

        // Upload transcript if available
        let transcriptUpload;
        if (transcript.success) {
          transcriptUpload = await StorageService.uploadTranscript(
            data.youtubeId,
            transcript,
            { folder: `videos/${data.videoSummaryId}` }
          );
        }

        // Upload AI analysis results
        let analysisUpload;
        if (aiAnalysis.success) {
          analysisUpload = await StorageService.uploadAnalysisResults(
            data.youtubeId,
            aiAnalysis,
            { folder: `videos/${data.videoSummaryId}` }
          );
        }

        return {
          keyframes: keyframeUploads.keyframes,
          transcript: transcriptUpload,
          analysis: analysisUpload
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Asset upload failed';
        await VideoSummaryDao.updateProcessingStatus(
          data.videoSummaryId,
          'failed',
          errorMessage
        );
        throw error;
      }
    });

    // Send assets uploaded event
    await step.sendEvent('assets-uploaded', {
      name: 'video/assets-uploaded',
      data: {
        videoSummaryId: data.videoSummaryId,
        uploadResults: assetUpload
      }
    });

    // Step 5: Generate multimodal embeddings
    await step.run('generate-embeddings', async () => {
      console.log(`Generating multimodal embeddings for: ${data.title}`);

      try {
        // Update database status
        await VideoSummaryDao.updateProcessingStatus(
          data.videoSummaryId,
          'generating_embeddings',
          undefined,
          90,
          'Generating multimodal embeddings'
        );

        // Get updated video summary with all processed data
        const videoSummary = await VideoSummaryDao.findById(data.videoSummaryId, data.userId);
        if (!videoSummary) {
          throw new Error('Video summary not found for embedding generation');
        }

        const embeddings = [];

        // 1. Generate embedding for main summary content
        if (videoSummary.aiGeneratedContent?.summary?.summary) {
          const summaryEmbedding = await MultimodalEmbeddingService.embedKeyframeContent(
            videoSummary.thumbnailUrl || '',
            videoSummary.aiGeneratedContent.summary.summary,
            { approach: 'vision-description' }
          );

          embeddings.push({
            contentType: 'summary' as const,
            contentText: videoSummary.aiGeneratedContent.summary.summary,
            embedding: summaryEmbedding,
            metadata: {
              topics: videoSummary.aiGeneratedContent.summary.topics,
              difficulty: videoSummary.aiGeneratedContent.summary.difficulty,
              estimatedReadTime: videoSummary.aiGeneratedContent.summary.estimatedReadTime
            }
          });
        }

        // 2. Generate embeddings for key points
        if (videoSummary.aiGeneratedContent?.summary?.keyPoints) {
          for (const [index, keyPoint] of videoSummary.aiGeneratedContent.summary.keyPoints.entries()) {
            const keyPointEmbedding = await MultimodalEmbeddingService.generateTextEmbedding(keyPoint);

            embeddings.push({
              contentType: 'key_point' as const,
              contentText: keyPoint,
              embedding: keyPointEmbedding,
              metadata: {
                segmentIndex: index,
                topics: videoSummary.aiGeneratedContent.summary.topics
              }
            });
          }
        }

        // 3. Generate embeddings for keyframes with their descriptions
        const keyframes = await VideoSummaryDao.getKeyframes(data.videoSummaryId);
        for (const keyframe of keyframes) {
          if (keyframe.blobUrl && keyframe.description) {
            const keyframeEmbedding = await MultimodalEmbeddingService.embedKeyframeContent(
              keyframe.blobUrl,
              keyframe.description,
              { approach: 'vision-description' }
            );

            embeddings.push({
              contentType: 'keyframe' as const,
              contentText: keyframe.description,
              embedding: keyframeEmbedding,
              keyframeId: keyframe.id,
              timestamp: keyframe.timestamp,
              metadata: {
                confidence: keyframe.confidence ?? undefined,
                category: keyframe.category ?? undefined
              }
            });
          }
        }

        // 4. Generate embeddings for transcript segments (if available)
        if (transcript.success && transcript.segments) {
          // Process transcript in meaningful chunks (every 30 seconds or logical breaks)
          const segmentDuration = 30; // seconds
          const transcriptChunks = [];

          for (let i = 0; i < transcript.segments.length; i += segmentDuration) {
            const segmentGroup = transcript.segments.slice(i, i + segmentDuration);
            const combinedText = segmentGroup.map(s => s.text).join(' ');
            const startTime = segmentGroup[0]?.start || 0;
            const lastSegment = segmentGroup[segmentGroup.length - 1];
            const endTime = lastSegment ? lastSegment.start + lastSegment.duration : startTime + segmentDuration;

            if (combinedText.trim().length > 10) { // Only process meaningful content
              transcriptChunks.push({
                text: combinedText.trim(),
                startTime,
                endTime,
                segmentIndex: Math.floor(i / segmentDuration)
              });
            }
          }

          for (const chunk of transcriptChunks) {
            const transcriptEmbedding = await MultimodalEmbeddingService.generateTextEmbedding(chunk.text);

            embeddings.push({
              contentType: 'transcript_segment' as const,
              contentText: chunk.text,
              embedding: transcriptEmbedding,
              timestamp: Math.floor(chunk.startTime),
              metadata: {
                segmentIndex: chunk.segmentIndex,
                duration: chunk.endTime - chunk.startTime
              }
            });
          }
        }

        // 5. Save all embeddings to database
        await VideoSummaryDao.saveEmbeddings(data.videoSummaryId, embeddings);

        console.log(`✅ Generated ${embeddings.length} multimodal embeddings for: ${data.title}`);

        return { success: true, embeddingsCount: embeddings.length };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Embedding generation failed';
        console.error('Embedding generation step failed:', error);

        // Continue processing even if embeddings fail (non-critical for basic functionality)
        console.warn(`Continuing processing without embeddings for ${data.title}: ${errorMessage}`);
        return { success: false, error: errorMessage };
      }
    });

    // Step 6: Update database with final results
    await step.run('finalize-processing', async () => {
      console.log(`Finalizing processing for: ${data.title}`);
      
      try {
        // Save keyframe records to database
        if ('keyframes' in assetUpload && assetUpload.keyframes && aiAnalysis.keyframeIntervals) {
          for (let i = 0; i < assetUpload.keyframes.length; i++) {
            const keyframe = assetUpload.keyframes[i];
            const interval = aiAnalysis.keyframeIntervals[i];
            
            // Ensure timestamp is an integer (database schema requirement)
            const timestamp = Math.floor(interval?.timestamp || 0);
            
            await VideoSummaryDao.addKeyframe(data.videoSummaryId, {
              timestamp,
              imageUrl: keyframe.url,
              description: interval?.reason || `Keyframe at ${timestamp}s`,
              confidence: interval?.confidence,
              category: interval?.category,
              aiReason: interval?.reason,
              fileSize: keyframe.size
            });
          }
        }

        // Update processing status to completed
        await VideoSummaryDao.updateProcessingStatus(
          data.videoSummaryId, 
          'completed',
          undefined,
          100,
          'Processing completed successfully'
        );
        
        console.log(`Successfully completed processing for: ${data.title}`);
        
        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Finalization failed';
        await VideoSummaryDao.updateProcessingStatus(
          data.videoSummaryId,
          'failed',
          errorMessage
        );
        throw error;
      }
    });

    // Step 7: Cleanup temporary files
    await step.sendEvent('cleanup-temp-files', {
      name: 'video/cleanup-temp-files',
      data: {
        tempDir: keyframeExtraction.success && 'tempDir' in keyframeExtraction ? keyframeExtraction.tempDir : undefined,
        videoSummaryId: data.videoSummaryId
      }
    });

    // Send final completion event
    await step.sendEvent('processing-complete', {
      name: 'video/processing-complete',
      data: {
        videoSummaryId: data.videoSummaryId,
        success: true
      }
    });

    return {
      videoSummaryId: data.videoSummaryId,
      success: true,
      transcript: transcript.success,
      keyframes: keyframeExtraction.keyframes.length,
      uploadedAssets: {
        keyframes: 'keyframes' in assetUpload ? assetUpload.keyframes.length : 0,
        transcript: 'transcript' in assetUpload ? !!assetUpload.transcript : false,
        analysis: 'analysis' in assetUpload ? !!assetUpload.analysis : false
      }
    };
  }
);

/**
 * Cleanup job for temporary files
 */
export const cleanupTempFilesJob = typedInngest.createFunction(
  {
    id: 'cleanup-temp-files',
    name: 'Cleanup Temporary Files'
  },
  { event: 'video/cleanup-temp-files' },
  async ({ event }) => {
    const { tempDir } = event.data;
    
    try {
      await KeyframeService.cleanup(tempDir);
      console.log(`Successfully cleaned up temp directory: ${tempDir}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to cleanup temp directory ${tempDir}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Cleanup failed' };
    }
  }
);

/**
 * Error handling and retry job
 */
export const videoProcessingRetryJob = typedInngest.createFunction(
  {
    id: 'video-processing-retry',
    name: 'Retry Failed Video Processing'
  },
  { event: 'video/processing-failed' },
  async ({ event }) => {
    // This job would handle retry logic for failed processing
    // Implementation depends on specific retry requirements
    console.log(`Retry logic for video ${event.data.videoSummaryId} needs implementation`);
    return { retried: false };
  }
);
