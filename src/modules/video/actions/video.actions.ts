"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { VideoSummaryDao } from "../data/video-summary.dao";
import { YouTubeService } from "../services/youtube.service";
import { JobService } from "../services/job.service";

export interface ProcessVideoResult {
  success: boolean;
  summaryId?: string;
  eventId?: string;
  error?: string;
}

export interface GetVideoSummaryResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function processYouTubeVideo(youtubeUrl: string): Promise<ProcessVideoResult> {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      redirect("/sign-in");
    }

    // Validate YouTube URL
    if (!YouTubeService.validateYouTubeUrl(youtubeUrl)) {
      return {
        success: false,
        error: "Please enter a valid YouTube URL"
      };
    }

    // Extract video ID
    const videoId = YouTubeService.extractVideoId(youtubeUrl);
    if (!videoId) {
      return {
        success: false,
        error: "Could not extract video ID from URL"
      };
    }

    // Check if video already exists for this user
    const existingSummary = await VideoSummaryDao.findByUserAndYouTubeId(
      session.user.id,
      videoId
    );

    if (existingSummary) {
      return {
        success: true,
        summaryId: existingSummary.id
      };
    }

    // Get video information from YouTube API
    const videoInfo = await YouTubeService.getVideoInfo(videoId);

    // Create video summary record
    const summaryId = await VideoSummaryDao.create({
      userId: session.user.id,
      youtubeUrl,
      youtubeId: videoId,
      title: videoInfo.title,
      description: videoInfo.description,
      channelName: videoInfo.channelTitle,
      duration: videoInfo.duration,
      thumbnailUrl: videoInfo.thumbnailUrl,
    });

    // Trigger background processing job
    const { eventId } = await JobService.triggerVideoProcessing({
      videoSummaryId: summaryId,
      userId: session.user.id,
      youtubeUrl,
      youtubeId: videoId,
      title: videoInfo.title,
      description: videoInfo.description,
      channelName: videoInfo.channelTitle,
      duration: videoInfo.duration,
      thumbnailUrl: videoInfo.thumbnailUrl,
    });

    // Update the record with the job event ID for tracking
    await VideoSummaryDao.updateProcessingStatus(
      summaryId,
      'pending',
      undefined,
      0,
      'Queued for processing',
      eventId
    );

    console.log(`Video processing job queued for summary ID: ${summaryId}, event ID: ${eventId}`);

    return {
      success: true,
      summaryId,
      eventId
    };

  } catch (error) {
    console.error("Error processing YouTube video:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}

export async function getVideoSummary(summaryId: string): Promise<GetVideoSummaryResult> {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        error: "Authentication required"
      };
    }

    // Fetch video summary with all relations
    const summary = await VideoSummaryDao.findByIdWithRelations(summaryId, session.user.id);

    if (!summary) {
      return {
        success: false,
        error: "Video summary not found"
      };
    }

    return {
      success: true,
      data: summary
    };

  } catch (error) {
    console.error("Error fetching video summary:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}

export async function getAllVideoSummaries(): Promise<GetVideoSummaryResult> {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        error: "Authentication required"
      };
    }

    // Fetch all video summaries for user
    const summaries = await VideoSummaryDao.findAllByUser(session.user.id);

    return {
      success: true,
      data: summaries
    };

  } catch (error) {
    console.error("Error fetching video summaries:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}

export interface UpdateSummaryResult {
  success: boolean;
  error?: string;
}

export async function updateVideoSummary(summaryId: string, updatedContent: string): Promise<UpdateSummaryResult> {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        error: "Authentication required"
      };
    }

    // Verify the user owns this video summary
    const existingSummary = await VideoSummaryDao.findById(summaryId, session.user.id);
    if (!existingSummary) {
      return {
        success: false,
        error: "Video summary not found or access denied"
      };
    }

    // Update the AI generated content
    const currentAIContent = existingSummary.aiGeneratedContent || {};
    const currentSummary = currentAIContent.summary;
    
    const updatedAIContent = {
      ...currentAIContent,
      summary: currentSummary ? {
        ...currentSummary,
        summary: updatedContent,
      } : {
        summary: updatedContent,
        keyPoints: [],
        topics: [],
        difficulty: "Unknown",
        estimatedReadTime: 0
      }
    };

    await VideoSummaryDao.updateAIContent(summaryId, updatedAIContent);

    return {
      success: true
    };

  } catch (error) {
    console.error("Error updating video summary:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}