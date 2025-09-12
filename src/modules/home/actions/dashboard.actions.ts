"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { videoSummary, tag, category, videoSummaryTag, videoSummaryCategory } from "@/db/schema";
import { eq, desc, count, and } from "drizzle-orm";

export interface DashboardStats {
  totalVideos: number;
  completedVideos: number;
  processingVideos: number;
  totalCategories: number;
  totalTags: number;
  recentActivity: Array<{
    id: string;
    title: string;
    type: 'video' | 'summary';
    status: string;
    createdAt: string;
    thumbnailUrl?: string;
    categories?: string[];
  }>;
  topCategories: Array<{
    name: string;
    count: number;
    color: string;
  }>;
  topTags: Array<{
    name: string;
    count: number;
    color: string;
  }>;
}

export interface DashboardResult {
  success: boolean;
  data?: DashboardStats;
  error?: string;
}

export async function getDashboardData(): Promise<DashboardResult> {
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

    const userId = session.user.id;

    // Get video counts by status
    const videoStats = await db
      .select({
        status: videoSummary.processingStatus,
        count: count()
      })
      .from(videoSummary)
      .where(eq(videoSummary.userId, userId))
      .groupBy(videoSummary.processingStatus);

    // Calculate totals
    const totalVideos = videoStats.reduce((acc, stat) => acc + stat.count, 0);
    const completedVideos = videoStats.find(s => s.status === 'completed')?.count || 0;
    const processingVideos = videoStats.filter(s => 
      ['pending', 'extracting_transcript', 'extracting_keyframes', 'uploading_assets', 'generating_summary'].includes(s.status)
    ).reduce((acc, stat) => acc + stat.count, 0);

    // Get recent activity (latest 5 videos)
    const recentVideos = await db
      .select({
        id: videoSummary.id,
        title: videoSummary.title,
        processingStatus: videoSummary.processingStatus,
        createdAt: videoSummary.createdAt,
        thumbnailUrl: videoSummary.thumbnailUrl,
      })
      .from(videoSummary)
      .where(eq(videoSummary.userId, userId))
      .orderBy(desc(videoSummary.createdAt))
      .limit(5);

    // Get categories for recent videos
    const recentActivity = [];
    for (const video of recentVideos) {
      const videoCategories = await db
        .select({ name: category.name })
        .from(videoSummaryCategory)
        .innerJoin(category, eq(videoSummaryCategory.categoryId, category.id))
        .where(eq(videoSummaryCategory.videoSummaryId, video.id));

      recentActivity.push({
        id: video.id,
        title: video.title,
        type: 'video' as const,
        status: video.processingStatus,
        createdAt: typeof video.createdAt === 'string' ? video.createdAt : video.createdAt.toISOString(),
        thumbnailUrl: video.thumbnailUrl || undefined,
        categories: videoCategories.map(c => c.name)
      });
    }

    // Get top categories
    const topCategories = await db
      .select({
        name: category.name,
        color: category.color,
        count: count()
      })
      .from(category)
      .innerJoin(videoSummaryCategory, eq(category.id, videoSummaryCategory.categoryId))
      .innerJoin(videoSummary, and(
        eq(videoSummaryCategory.videoSummaryId, videoSummary.id),
        eq(videoSummary.userId, userId)
      ))
      .groupBy(category.id, category.name, category.color)
      .orderBy(desc(count()))
      .limit(5);

    // Get top tags
    const topTags = await db
      .select({
        name: tag.name,
        color: tag.color,
        count: count()
      })
      .from(tag)
      .innerJoin(videoSummaryTag, eq(tag.id, videoSummaryTag.tagId))
      .innerJoin(videoSummary, and(
        eq(videoSummaryTag.videoSummaryId, videoSummary.id),
        eq(videoSummary.userId, userId)
      ))
      .groupBy(tag.id, tag.name, tag.color)
      .orderBy(desc(count()))
      .limit(5);

    // Get total category and tag counts
    const totalCategoriesResult = await db
      .select({ count: count() })
      .from(category)
      .innerJoin(videoSummaryCategory, eq(category.id, videoSummaryCategory.categoryId))
      .innerJoin(videoSummary, and(
        eq(videoSummaryCategory.videoSummaryId, videoSummary.id),
        eq(videoSummary.userId, userId)
      ));

    const totalTagsResult = await db
      .select({ count: count() })
      .from(tag)
      .innerJoin(videoSummaryTag, eq(tag.id, videoSummaryTag.tagId))
      .innerJoin(videoSummary, and(
        eq(videoSummaryTag.videoSummaryId, videoSummary.id),
        eq(videoSummary.userId, userId)
      ));

    const dashboardData: DashboardStats = {
      totalVideos,
      completedVideos,
      processingVideos,
      totalCategories: totalCategoriesResult[0]?.count || 0,
      totalTags: totalTagsResult[0]?.count || 0,
      recentActivity,
      topCategories: topCategories.map(c => ({
        name: c.name,
        count: c.count,
        color: c.color || '#10B981'
      })),
      topTags: topTags.map(t => ({
        name: t.name,
        count: t.count,
        color: t.color || '#3B82F6'
      }))
    };

    return {
      success: true,
      data: dashboardData
    };

  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}