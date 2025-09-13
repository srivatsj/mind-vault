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

export class DashboardDao {
  /**
   * Get video statistics grouped by processing status for a user
   */
  static async getVideoStatsByUser(userId: string): Promise<Array<{ status: string; count: number }>> {
    return await db
      .select({
        status: videoSummary.processingStatus,
        count: count()
      })
      .from(videoSummary)
      .where(eq(videoSummary.userId, userId))
      .groupBy(videoSummary.processingStatus);
  }

  /**
   * Get recent videos for dashboard activity feed
   */
  static async getRecentVideosByUser(userId: string, limit: number = 5): Promise<Array<{
    id: string;
    title: string;
    processingStatus: string;
    createdAt: Date;
    thumbnailUrl: string | null;
  }>> {
    return await db
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
      .limit(limit);
  }

  /**
   * Get categories for a specific video
   */
  static async getCategoriesForVideo(videoId: string): Promise<Array<{ name: string }>> {
    return await db
      .select({ name: category.name })
      .from(videoSummaryCategory)
      .innerJoin(category, eq(videoSummaryCategory.categoryId, category.id))
      .where(eq(videoSummaryCategory.videoSummaryId, videoId));
  }

  /**
   * Get top categories by usage count for a user
   */
  static async getTopCategoriesByUser(userId: string, limit: number = 5): Promise<Array<{
    name: string;
    color: string | null;
    count: number;
  }>> {
    return await db
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
      .limit(limit);
  }

  /**
   * Get top tags by usage count for a user
   */
  static async getTopTagsByUser(userId: string, limit: number = 5): Promise<Array<{
    name: string;
    color: string | null;
    count: number;
  }>> {
    return await db
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
      .limit(limit);
  }

  /**
   * Get total count of unique categories used by a user
   */
  static async getTotalCategoriesByUser(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(category)
      .innerJoin(videoSummaryCategory, eq(category.id, videoSummaryCategory.categoryId))
      .innerJoin(videoSummary, and(
        eq(videoSummaryCategory.videoSummaryId, videoSummary.id),
        eq(videoSummary.userId, userId)
      ));

    return result[0]?.count || 0;
  }

  /**
   * Get total count of unique tags used by a user
   */
  static async getTotalTagsByUser(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(tag)
      .innerJoin(videoSummaryTag, eq(tag.id, videoSummaryTag.tagId))
      .innerJoin(videoSummary, and(
        eq(videoSummaryTag.videoSummaryId, videoSummary.id),
        eq(videoSummary.userId, userId)
      ));

    return result[0]?.count || 0;
  }

  /**
   * Get complete dashboard data for a user
   */
  static async getDashboardDataByUser(userId: string): Promise<DashboardStats> {
    // Get video statistics
    const videoStats = await this.getVideoStatsByUser(userId);

    // Calculate totals
    const totalVideos = videoStats.reduce((acc, stat) => acc + stat.count, 0);
    const completedVideos = videoStats.find(s => s.status === 'completed')?.count || 0;
    const processingVideos = videoStats.filter(s =>
      ['pending', 'extracting_transcript', 'extracting_keyframes', 'uploading_assets', 'generating_summary'].includes(s.status)
    ).reduce((acc, stat) => acc + stat.count, 0);

    // Get recent activity
    const recentVideos = await this.getRecentVideosByUser(userId, 5);
    const recentActivity = [];

    for (const video of recentVideos) {
      const videoCategories = await this.getCategoriesForVideo(video.id);

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

    // Get top categories and tags
    const [topCategories, topTags, totalCategories, totalTags] = await Promise.all([
      this.getTopCategoriesByUser(userId, 5),
      this.getTopTagsByUser(userId, 5),
      this.getTotalCategoriesByUser(userId),
      this.getTotalTagsByUser(userId)
    ]);

    return {
      totalVideos,
      completedVideos,
      processingVideos,
      totalCategories,
      totalTags,
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
  }
}