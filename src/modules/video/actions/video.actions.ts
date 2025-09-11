"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { VideoSummaryDao } from "../data/video-summary.dao";
import { YouTubeService } from "../services/youtube.service";

export interface ProcessVideoResult {
  success: boolean;
  summaryId?: string;
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

    // TODO: Trigger background processing job
    // This will be implemented when we add Inngest
    console.log(`Video processing job queued for summary ID: ${summaryId}`);

    return {
      success: true,
      summaryId
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
      redirect("/sign-in");
    }

    // Fetch video summary
    const summary = await VideoSummaryDao.findById(summaryId, session.user.id);

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
      redirect("/sign-in");
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