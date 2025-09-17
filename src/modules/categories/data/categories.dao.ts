import { db } from '@/db';
import { category, videoSummaryCategory, videoSummary } from '@/db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string;
  createdAt: Date;
  videoCount?: number;
  recentVideos?: Array<{
    id: string;
    title: string;
    thumbnailUrl: string | null;
    createdAt: Date;
  }>;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
  color?: string;
}

export class CategoriesDAO {
  /**
   * Create a new category
   */
  static async createCategory(data: CreateCategoryData): Promise<Category> {
    const id = nanoid();

    const result = await db
      .insert(category)
      .values({
        id,
        name: data.name,
        description: data.description || null,
        color: data.color || '#10B981',
      })
      .returning();

    return {
      id: result[0].id,
      name: result[0].name,
      description: result[0].description,
      color: result[0].color || '#10B981',
      createdAt: result[0].createdAt,
      videoCount: 0,
    };
  }

  /**
   * Get all categories with video counts
   */
  static async getAllCategories(): Promise<Category[]> {
    const categories = await db
      .select({
        id: category.id,
        name: category.name,
        description: category.description,
        color: category.color,
        createdAt: category.createdAt,
        videoCount: sql<number>`count(${videoSummaryCategory.videoSummaryId})`,
      })
      .from(category)
      .leftJoin(videoSummaryCategory, eq(category.id, videoSummaryCategory.categoryId))
      .groupBy(category.id)
      .orderBy(desc(sql<number>`count(${videoSummaryCategory.videoSummaryId})`), category.name);

    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      color: cat.color || '#10B981',
      createdAt: cat.createdAt,
      videoCount: cat.videoCount || 0,
    }));
  }

  /**
   * Get category by ID with recent videos
   */
  static async getCategoryById(id: string, includeVideos = false): Promise<Category | null> {
    const categoryResult = await db
      .select()
      .from(category)
      .where(eq(category.id, id))
      .limit(1);

    if (!categoryResult.length) {
      return null;
    }

    const cat = categoryResult[0];

    // Get video count
    const videoCountResult = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(videoSummaryCategory)
      .where(eq(videoSummaryCategory.categoryId, id));

    const videoCount = videoCountResult[0]?.count || 0;

    let recentVideos: Category['recentVideos'] = undefined;

    if (includeVideos) {
      const videosResult = await db
        .select({
          id: videoSummary.id,
          title: videoSummary.title,
          thumbnailUrl: videoSummary.thumbnailUrl,
          createdAt: videoSummary.createdAt,
        })
        .from(videoSummaryCategory)
        .innerJoin(videoSummary, eq(videoSummaryCategory.videoSummaryId, videoSummary.id))
        .where(eq(videoSummaryCategory.categoryId, id))
        .orderBy(desc(videoSummary.createdAt))
        .limit(6);

      recentVideos = videosResult;
    }

    return {
      id: cat.id,
      name: cat.name,
      description: cat.description,
      color: cat.color || '#10B981',
      createdAt: cat.createdAt,
      videoCount,
      recentVideos,
    };
  }

  /**
   * Update category
   */
  static async updateCategory(id: string, data: UpdateCategoryData): Promise<void> {
    await db
      .update(category)
      .set({
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.color && { color: data.color }),
      })
      .where(eq(category.id, id));
  }

  /**
   * Delete category and all video relationships
   */
  static async deleteCategory(id: string): Promise<void> {
    // Foreign key constraints will handle cascade deletion of relationships
    await db
      .delete(category)
      .where(eq(category.id, id));
  }

  /**
   * Get videos for a category
   */
  static async getCategoryVideos(categoryId: string, limit = 20, offset = 0) {
    const videos = await db
      .select({
        id: videoSummary.id,
        title: videoSummary.title,
        description: videoSummary.description,
        thumbnailUrl: videoSummary.thumbnailUrl,
        channelName: videoSummary.channelName,
        duration: videoSummary.duration,
        processingStatus: videoSummary.processingStatus,
        createdAt: videoSummary.createdAt,
      })
      .from(videoSummaryCategory)
      .innerJoin(videoSummary, eq(videoSummaryCategory.videoSummaryId, videoSummary.id))
      .where(eq(videoSummaryCategory.categoryId, categoryId))
      .orderBy(desc(videoSummary.createdAt))
      .limit(limit)
      .offset(offset);

    return videos;
  }

  /**
   * Add video to category
   */
  static async addVideoToCategory(videoId: string, categoryId: string): Promise<void> {
    // Check if relationship already exists
    const existing = await db
      .select()
      .from(videoSummaryCategory)
      .where(
        and(
          eq(videoSummaryCategory.videoSummaryId, videoId),
          eq(videoSummaryCategory.categoryId, categoryId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      const relationId = nanoid();
      await db
        .insert(videoSummaryCategory)
        .values({
          id: relationId,
          videoSummaryId: videoId,
          categoryId,
        });
    }
  }

  /**
   * Remove video from category
   */
  static async removeVideoFromCategory(videoId: string, categoryId: string): Promise<void> {
    await db
      .delete(videoSummaryCategory)
      .where(
        and(
          eq(videoSummaryCategory.videoSummaryId, videoId),
          eq(videoSummaryCategory.categoryId, categoryId)
        )
      );
  }

  /**
   * Get categories for a video
   */
  static async getVideoCategories(videoId: string): Promise<Category[]> {
    const categories = await db
      .select({
        id: category.id,
        name: category.name,
        description: category.description,
        color: category.color,
        createdAt: category.createdAt,
      })
      .from(videoSummaryCategory)
      .innerJoin(category, eq(videoSummaryCategory.categoryId, category.id))
      .where(eq(videoSummaryCategory.videoSummaryId, videoId))
      .orderBy(category.name);

    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      color: cat.color || '#10B981',
      createdAt: cat.createdAt,
    }));
  }

  /**
   * Search categories by name
   */
  static async searchCategories(query: string, limit = 10): Promise<Category[]> {
    const categories = await db
      .select({
        id: category.id,
        name: category.name,
        description: category.description,
        color: category.color,
        createdAt: category.createdAt,
        videoCount: sql<number>`count(${videoSummaryCategory.videoSummaryId})`,
      })
      .from(category)
      .leftJoin(videoSummaryCategory, eq(category.id, videoSummaryCategory.categoryId))
      .where(sql`${category.name} ILIKE ${`%${query}%`}`)
      .groupBy(category.id)
      .orderBy(category.name)
      .limit(limit);

    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      color: cat.color || '#10B981',
      createdAt: cat.createdAt,
      videoCount: cat.videoCount || 0,
    }));
  }

  /**
   * Get category statistics
   */
  static async getCategoryStats(): Promise<{
    totalCategories: number;
    categoriesWithVideos: number;
    totalUniqueVideos: number;
    totalVideoAssignments: number;
    averageVideosPerCategory: number;
    topCategories: Array<{
      id: string;
      name: string;
      color: string;
      videoCount: number;
    }>;
  }> {
    const totalResult = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(category);

    const withVideosResult = await db
      .select({
        count: sql<number>`count(distinct ${category.id})`,
      })
      .from(category)
      .innerJoin(videoSummaryCategory, eq(category.id, videoSummaryCategory.categoryId));

    // Get total video assignments across all categories (for average calculation)
    const totalVideoAssignmentsResult = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(videoSummaryCategory);

    // Get count of unique videos that have been categorized
    const uniqueVideosResult = await db
      .select({
        count: sql<number>`count(distinct ${videoSummaryCategory.videoSummaryId})`,
      })
      .from(videoSummaryCategory);

    const topCategories = await db
      .select({
        id: category.id,
        name: category.name,
        color: category.color,
        videoCount: sql<number>`count(${videoSummaryCategory.videoSummaryId})`,
      })
      .from(category)
      .leftJoin(videoSummaryCategory, eq(category.id, videoSummaryCategory.categoryId))
      .groupBy(category.id)
      .orderBy(desc(sql<number>`count(${videoSummaryCategory.videoSummaryId})`))
      .limit(5);

    const totalCategories = totalResult[0]?.count || 0;
    const categoriesWithVideos = withVideosResult[0]?.count || 0;
    const totalVideoAssignments = totalVideoAssignmentsResult[0]?.count || 0;
    const totalUniqueVideos = uniqueVideosResult[0]?.count || 0;
    const averageVideosPerCategory = categoriesWithVideos > 0 ? totalVideoAssignments / categoriesWithVideos : 0;

    return {
      totalCategories,
      categoriesWithVideos,
      totalUniqueVideos,
      totalVideoAssignments,
      averageVideosPerCategory: Math.round(averageVideosPerCategory * 100) / 100,
      topCategories: topCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        color: cat.color || '#10B981',
        videoCount: cat.videoCount
      })),
    };
  }
}