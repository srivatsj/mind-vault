import { db } from "@/db";
import { videoSummary, videoSummaryTag, videoSummaryCategory, keyframe, tag, category } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface CreateVideoSummaryInput {
  userId: string;
  youtubeUrl: string;
  youtubeId: string;
  title: string;
  description?: string;
  channelName?: string;
  duration?: number;
  thumbnailUrl?: string;
}

export interface UpdateVideoSummaryInput {
  id: string;
  transcript?: string;
  summary?: string;
  aiGeneratedContent?: {
    summary?: string;
    keyPoints?: string[];
    diagrams?: string[];
    suggestedTags?: string[];
  };
  processingStatus?: "pending" | "extracting_transcript" | "extracting_keyframes" | "uploading_assets" | "generating_summary" | "completed" | "failed";
  processingError?: string;
}

export interface VideoSummaryWithRelations {
  id: string;
  userId: string;
  youtubeUrl: string;
  youtubeId: string;
  title: string;
  description: string | null;
  channelName: string | null;
  duration: number | null;
  thumbnailUrl: string | null;
  transcript: string | null;
  summary: string | null;
  aiGeneratedContent: {
    summary?: {
      summary: string;
      keyPoints: string[];
      topics: string[];
      difficulty: string;
      estimatedReadTime: number;
    };
    keyframeIntervals?: Array<{
      timestamp: number;
      reason: string;
      confidence: number;
      category: string;
    }>;
    tags?: string[];
    categories?: string[];
    diagrams?: string[];
    suggestedTags?: string[];
  } | null;
  keyframeIntervals?: Array<{
    timestamp: number;
    reason: string;
    confidence: number;
    category: string;
  }>;
  processingStatus: "pending" | "extracting_transcript" | "extracting_keyframes" | "uploading_assets" | "generating_summary" | "completed" | "failed";
  processingError: string | null;
  createdAt: Date;
  updatedAt: Date;
  tags?: Array<{ id: string; name: string; color: string | null }>;
  categories?: Array<{ id: string; name: string; color: string | null }>;
  keyframes?: Array<{ id: string; blobUrl: string; timestamp: number; description: string | null }>;
}

export class VideoSummaryDao {
  static async create(input: CreateVideoSummaryInput): Promise<string> {
    const summaryId = nanoid();
    
    await db.insert(videoSummary).values({
      id: summaryId,
      ...input,
      processingStatus: "pending",
    });

    return summaryId;
  }

  static async findById(id: string, userId: string): Promise<VideoSummaryWithRelations | null> {
    const summary = await db.query.videoSummary.findFirst({
      where: and(
        eq(videoSummary.id, id),
        eq(videoSummary.userId, userId)
      ),
    });

    if (!summary) return null;

    return summary as VideoSummaryWithRelations;
  }

  static async findByUserAndYouTubeId(userId: string, youtubeId: string): Promise<VideoSummaryWithRelations | null> {
    const summary = await db.query.videoSummary.findFirst({
      where: and(
        eq(videoSummary.userId, userId),
        eq(videoSummary.youtubeId, youtubeId)
      ),
    });

    if (!summary) return null;

    return summary as VideoSummaryWithRelations;
  }

  static async findAllByUser(userId: string): Promise<VideoSummaryWithRelations[]> {
    const summaries = await db.query.videoSummary.findMany({
      where: eq(videoSummary.userId, userId),
      orderBy: [desc(videoSummary.createdAt)],
    });

    return summaries as VideoSummaryWithRelations[];
  }

  static async update(input: UpdateVideoSummaryInput): Promise<void> {
    const { id, ...updateData } = input;
    
    // Exclude aiGeneratedContent from spread and handle separately if needed
    const { aiGeneratedContent, ...safeUpdateData } = updateData;
    
    const finalUpdateData: Record<string, unknown> = {
      ...safeUpdateData,
      updatedAt: new Date(),
    };
    
    if (aiGeneratedContent) {
      finalUpdateData.aiGeneratedContent = aiGeneratedContent;
    }
    
    await db
      .update(videoSummary)
      .set(finalUpdateData)
      .where(eq(videoSummary.id, id));
  }

  static async delete(id: string, userId: string): Promise<void> {
    await db
      .delete(videoSummary)
      .where(and(
        eq(videoSummary.id, id),
        eq(videoSummary.userId, userId)
      ));
  }

  static async addTag(videoSummaryId: string, tagId: string): Promise<void> {
    const relationId = nanoid();
    await db.insert(videoSummaryTag).values({
      id: relationId,
      videoSummaryId,
      tagId,
    });
  }

  static async addCategory(videoSummaryId: string, categoryId: string): Promise<void> {
    const relationId = nanoid();
    await db.insert(videoSummaryCategory).values({
      id: relationId,
      videoSummaryId,
      categoryId,
    });
  }

  static async addKeyframe(
    videoSummaryId: string, 
    keyframeData: {
      timestamp: number;
      imageUrl: string;
      thumbnailUrl?: string;
      description?: string;
      confidence?: number;
      category?: string;
      aiReason?: string;
      fileSize?: number;
    }
  ): Promise<string> {
    const keyframeId = nanoid();
    await db.insert(keyframe).values({
      id: keyframeId,
      videoSummaryId,
      blobUrl: keyframeData.imageUrl,
      thumbnailUrl: keyframeData.thumbnailUrl,
      timestamp: Math.floor(keyframeData.timestamp), // Ensure integer timestamp
      description: keyframeData.description,
      confidence: keyframeData.confidence ? Math.round(keyframeData.confidence * 100) : undefined,
      category: keyframeData.category,
      aiReason: keyframeData.aiReason,
      fileSize: keyframeData.fileSize,
    });
    return keyframeId;
  }

  /**
   * Update processing status
   */
  static async updateProcessingStatus(
    id: string,
    status: "pending" | "extracting_transcript" | "extracting_keyframes" | "uploading_assets" | "generating_summary" | "completed" | "failed",
    error?: string,
    progress?: number,
    currentStep?: string,
    jobEventId?: string
  ): Promise<void> {
    const updateData: Partial<typeof videoSummary.$inferInsert> = {
      processingStatus: status,
      updatedAt: new Date(),
    };

    if (error !== undefined) updateData.processingError = error;
    if (progress !== undefined) updateData.processingProgress = progress;
    if (currentStep !== undefined) updateData.currentStep = currentStep;
    if (jobEventId !== undefined) updateData.jobEventId = jobEventId;

    await db
      .update(videoSummary)
      .set(updateData)
      .where(eq(videoSummary.id, id));
  }

  /**
   * Update AI-generated content
   */
  static async updateAIContent(
    id: string,
    aiContent: {
      summary?: {
        summary: string;
        keyPoints: string[];
        topics: string[];
        difficulty: string;
        estimatedReadTime: number;
      };
      keyframeIntervals?: Array<{
        timestamp: number;
        reason: string;
        confidence: number;
        category: string;
      }>;
      tags?: string[];
      categories?: string[];
    }
  ): Promise<void> {
    await db
      .update(videoSummary)
      .set({
        aiGeneratedContent: aiContent,
        // Also populate the legacy summary field for backward compatibility and search
        summary: aiContent.summary?.summary || null,
        updatedAt: new Date(),
      })
      .where(eq(videoSummary.id, id));
  }

  /**
   * Update transcript text
   */
  static async updateTranscript(id: string, transcript: string): Promise<void> {
    await db
      .update(videoSummary)
      .set({
        transcript,
        updatedAt: new Date(),
      })
      .where(eq(videoSummary.id, id));
  }

  /**
   * Create or get existing tag by name
   */
  static async createOrGetTag(name: string, color: string = "#3B82F6"): Promise<string> {
    // Try to find existing tag
    const existingTag = await db.query.tag.findFirst({
      where: eq(tag.name, name)
    });

    if (existingTag) {
      return existingTag.id;
    }

    // Create new tag
    const tagId = nanoid();
    await db.insert(tag).values({
      id: tagId,
      name,
      color,
    });

    return tagId;
  }

  /**
   * Create or get existing category by name
   */
  static async createOrGetCategory(name: string, description?: string, color: string = "#10B981"): Promise<string> {
    // Try to find existing category
    const existingCategory = await db.query.category.findFirst({
      where: eq(category.name, name)
    });

    if (existingCategory) {
      return existingCategory.id;
    }

    // Create new category
    const categoryId = nanoid();
    await db.insert(category).values({
      id: categoryId,
      name,
      description,
      color,
    });

    return categoryId;
  }

  /**
   * Add tags to video summary (handles creation and linking)
   */
  static async addTags(videoSummaryId: string, tagNames: string[]): Promise<void> {
    for (const tagName of tagNames) {
      try {
        const tagId = await this.createOrGetTag(tagName);
        
        // Check if relationship already exists
        const existingRelation = await db.query.videoSummaryTag.findFirst({
          where: and(
            eq(videoSummaryTag.videoSummaryId, videoSummaryId),
            eq(videoSummaryTag.tagId, tagId)
          )
        });

        if (!existingRelation) {
          await this.addTag(videoSummaryId, tagId);
        }
      } catch (error) {
        console.warn(`Failed to add tag "${tagName}":`, error);
      }
    }
  }

  /**
   * Add categories to video summary (handles creation and linking)
   */
  static async addCategories(videoSummaryId: string, categoryNames: string[]): Promise<void> {
    for (const categoryName of categoryNames) {
      try {
        const categoryId = await this.createOrGetCategory(categoryName);
        
        // Check if relationship already exists
        const existingRelation = await db.query.videoSummaryCategory.findFirst({
          where: and(
            eq(videoSummaryCategory.videoSummaryId, videoSummaryId),
            eq(videoSummaryCategory.categoryId, categoryId)
          )
        });

        if (!existingRelation) {
          await this.addCategory(videoSummaryId, categoryId);
        }
      } catch (error) {
        console.warn(`Failed to add category "${categoryName}":`, error);
      }
    }
  }

  /**
   * Update AI content and create tag/category relationships
   */
  static async updateAIContentWithRelations(
    id: string,
    aiContent: {
      summary?: {
        summary: string;
        keyPoints: string[];
        topics: string[];
        difficulty: string;
        estimatedReadTime: number;
      };
      keyframeIntervals?: Array<{
        timestamp: number;
        reason: string;
        confidence: number;
        category: string;
      }>;
      tags?: string[];
      categories?: string[];
    }
  ): Promise<void> {
    // Update AI generated content (includes both JSON and legacy summary field)
    await this.updateAIContent(id, aiContent);

    // Create tag and category relationships
    if (aiContent.tags && aiContent.tags.length > 0) {
      await this.addTags(id, aiContent.tags);
    }

    if (aiContent.categories && aiContent.categories.length > 0) {
      await this.addCategories(id, aiContent.categories);
    }
  }
}