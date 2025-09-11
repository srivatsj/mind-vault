import { db } from "@/db";
import { videoSummary, videoSummaryTag, videoSummaryCategory, keyframe } from "@/db/schema";
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
  processingStatus?: "pending" | "processing" | "completed" | "failed";
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
    summary?: string;
    keyPoints?: string[];
    diagrams?: string[];
    suggestedTags?: string[];
  } | null;
  processingStatus: "pending" | "processing" | "completed" | "failed";
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
    
    await db
      .update(videoSummary)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
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

  static async addKeyframe(videoSummaryId: string, blobUrl: string, timestamp: number, description?: string, transcriptSegment?: string): Promise<string> {
    const keyframeId = nanoid();
    await db.insert(keyframe).values({
      id: keyframeId,
      videoSummaryId,
      blobUrl,
      timestamp,
      description,
      transcriptSegment,
    });
    return keyframeId;
  }
}