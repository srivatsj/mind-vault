import { google } from '@ai-sdk/google';
import { db } from '@/db';
import { contentEmbedding, videoSummary, keyframe } from '@/db/schema';
import { eq, desc, gt, sql, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { MultimodalEmbeddingService } from './multimodal-embedding.service';

export interface ContentChunk {
  id: string;
  videoSummaryId: string;
  contentType: 'transcript_segment' | 'keyframe' | 'summary' | 'description' | 'key_point';
  contentText: string;
  keyframeId?: string;
  timestamp?: number;
  metadata?: {
    segmentIndex?: number;
    confidence?: number;
    category?: string;
    duration?: number;
    topics?: string[];
    hasVisual?: boolean;
    imageUrl?: string;
  };
}

export interface SearchResult {
  contentId: string;
  contentType: string;
  snippet: string;
  similarity: number;
  videoTitle: string;
  videoId: string;
  timestamp?: number;
  keyframeUrl?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchFilters {
  videoIds?: string[];
  contentTypes?: string[];
  minSimilarity?: number;
  limit?: number;
  includeKeyframes?: boolean;
}

export class EmbeddingService {
  private static model = google('gemini-pro');

  /**
   * Generate embeddings for all content in a video
   */
  static async generateEmbeddingsForVideo(videoSummaryId: string): Promise<void> {
    console.log(`Generating embeddings for video: ${videoSummaryId}`);

    // Get video data
    const video = await db
      .select()
      .from(videoSummary)
      .where(eq(videoSummary.id, videoSummaryId))
      .limit(1);

    if (!video.length) {
      throw new Error(`Video not found: ${videoSummaryId}`);
    }

    const videoData = video[0];
    const chunks: ContentChunk[] = [];

    // 1. Process transcript segments (30-60 second chunks)
    if (videoData.transcript) {
      const transcriptChunks = this.createTranscriptChunks(videoData.transcript, videoSummaryId);
      chunks.push(...transcriptChunks);
    }

    // 2. Process summary content
    if (videoData.summary) {
      chunks.push({
        id: nanoid(),
        videoSummaryId,
        contentType: 'summary',
        contentText: videoData.summary,
        metadata: {
          category: 'summary'
        }
      });
    }

    // 3. Process AI-generated key points
    if (videoData.aiGeneratedContent?.summary?.keyPoints) {
      videoData.aiGeneratedContent.summary.keyPoints.forEach((point, index) => {
        chunks.push({
          id: nanoid(),
          videoSummaryId,
          contentType: 'key_point',
          contentText: point,
          metadata: {
            segmentIndex: index,
            category: 'key_point'
          }
        });
      });
    }

    // 4. Process keyframes with descriptions AND images
    const keyframes = await db
      .select()
      .from(keyframe)
      .where(eq(keyframe.videoSummaryId, videoSummaryId));

    keyframes.forEach(kf => {
      if (kf.description || kf.transcriptSegment || kf.blobUrl) {
        const contentText = [
          kf.description,
          kf.transcriptSegment,
          kf.aiReason
        ].filter(Boolean).join(' | ');

        // Create both text-only and multimodal embeddings for keyframes with images
        if (contentText.trim()) {
          chunks.push({
            id: nanoid(),
            videoSummaryId,
            contentType: 'keyframe',
            contentText,
            keyframeId: kf.id,
            timestamp: kf.timestamp,
            metadata: {
              category: kf.category || undefined,
              confidence: kf.confidence || undefined,
              hasVisual: !!kf.blobUrl,
              imageUrl: kf.blobUrl || undefined
            }
          });
        }
      }
    });

    // 5. Generate embeddings for all chunks
    await this.embedChunks(chunks);

    console.log(`Generated ${chunks.length} embeddings for video: ${videoSummaryId}`);
  }

  /**
   * Create transcript chunks (30-60 second segments)
   */
  private static createTranscriptChunks(transcript: string, videoSummaryId: string): ContentChunk[] {
    const chunks: ContentChunk[] = [];

    try {
      // Try to parse as transcript segments first
      const segments = JSON.parse(transcript);
      if (Array.isArray(segments) && segments[0]?.start !== undefined) {
        // This is structured transcript data
        return this.chunkTranscriptSegments(segments, videoSummaryId);
      }
    } catch {
      // Fall back to text chunking
    }

    // Chunk plain text transcript
    const words = transcript.split(' ');
    const chunkSize = 200; // ~30-60 seconds of speech
    const overlap = 50; // Overlap between chunks

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunkWords = words.slice(i, i + chunkSize);
      const chunkText = chunkWords.join(' ');

      if (chunkText.trim()) {
        chunks.push({
          id: nanoid(),
          videoSummaryId,
          contentType: 'transcript_segment',
          contentText: chunkText,
          metadata: {
            segmentIndex: Math.floor(i / (chunkSize - overlap)),
            category: 'transcript'
          }
        });
      }
    }

    return chunks;
  }

  /**
   * Chunk structured transcript segments
   */
  private static chunkTranscriptSegments(segments: { start: number; end: number; text: string }[], videoSummaryId: string): ContentChunk[] {
    const chunks: ContentChunk[] = [];
    const targetDuration = 45; // Target 45 seconds per chunk

    let currentChunk: { start: number; end: number; text: string }[] = [];
    let currentDuration = 0;

    segments.forEach(segment => {
      const duration = segment.end - segment.start;

      if (currentDuration + duration > targetDuration && currentChunk.length > 0) {
        // Create chunk from accumulated segments
        const chunkText = currentChunk.map(s => s.text).join(' ');
        const startTime = currentChunk[0].start;

        chunks.push({
          id: nanoid(),
          videoSummaryId,
          contentType: 'transcript_segment',
          contentText: chunkText,
          timestamp: Math.floor(startTime),
          metadata: {
            segmentIndex: chunks.length,
            duration: currentDuration,
            category: 'transcript'
          }
        });

        // Reset for next chunk
        currentChunk = [segment];
        currentDuration = duration;
      } else {
        currentChunk.push(segment);
        currentDuration += duration;
      }
    });

    // Handle remaining segments
    if (currentChunk.length > 0) {
      const chunkText = currentChunk.map(s => s.text).join(' ');
      const startTime = currentChunk[0].start;

      chunks.push({
        id: nanoid(),
        videoSummaryId,
        contentType: 'transcript_segment',
        contentText: chunkText,
        timestamp: Math.floor(startTime),
        metadata: {
          segmentIndex: chunks.length,
          duration: currentDuration,
          category: 'transcript'
        }
      });
    }

    return chunks;
  }

  /**
   * Generate embeddings for chunks and save to database
   */
  private static async embedChunks(chunks: ContentChunk[]): Promise<void> {
    const batchSize = 5; // Process in small batches to avoid rate limits

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (chunk) => {
          try {
            let embedding: number[];

            // Use multimodal embedding for keyframes with images
            if (chunk.contentType === 'keyframe' && chunk.metadata?.hasVisual && chunk.metadata?.imageUrl) {
              console.log(`Generating multimodal embedding for keyframe: ${chunk.keyframeId}`);
              embedding = await MultimodalEmbeddingService.embedKeyframeContent(
                chunk.metadata.imageUrl,
                chunk.contentText,
                {
                  approach: 'vision-description', // Use Gemini Vision to analyze images
                  imageWeight: 0.7, // Give more weight to visual content
                  textWeight: 0.3
                }
              );
            } else {
              // Use text-only embedding for other content
              embedding = await this.embedText(chunk.contentText);
            }

            await db.insert(contentEmbedding).values({
              id: chunk.id,
              videoSummaryId: chunk.videoSummaryId,
              contentType: chunk.contentType,
              contentText: chunk.contentText,
              embedding: embedding, // Drizzle ORM vector type
              keyframeId: chunk.keyframeId,
              timestamp: chunk.timestamp,
              metadata: chunk.metadata
            });

          } catch (error) {
            console.error(`Failed to embed chunk ${chunk.id}:`, error);
          }
        })
      );

      // Small delay between batches
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Generate embedding for a single text using Gemini
   */
  static async embedText(text: string): Promise<number[]> {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');

      if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set');
      }

      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

      console.log(`Generating Gemini embedding for text: ${text.substring(0, 100)}...`);

      const result = await model.embedContent(text.substring(0, 8192)); // Limit to model's context

      if (!result.embedding?.values) {
        throw new Error('No embedding values returned from Gemini');
      }

      console.log(`✅ Generated embedding with ${result.embedding.values.length} dimensions`);
      return result.embedding.values;
    } catch (error) {
      console.error('Failed to generate Gemini embedding:', error);

      // Fallback to mock embedding for development
      console.warn('Using fallback mock embedding due to API error');
      return new Array(768).fill(0).map(() => Math.random() - 0.5); // Use Gemini's actual dimension
    }
  }

  /**
   * Generate multimodal embedding for image + text using Gemini Vision
   */
  static async embedImageWithText(
    imageUrl: string,
    textContent: string
  ): Promise<number[]> {
    try {
      console.log(`Generating multimodal embedding for image: ${imageUrl.substring(0, 50)}, text: ${textContent.substring(0, 100)}`);

      // Use the proper MultimodalEmbeddingService
      const { MultimodalEmbeddingService } = await import('./multimodal-embedding.service');

      return await MultimodalEmbeddingService.embedKeyframeContent(
        imageUrl,
        textContent,
        {
          approach: 'vision-description',
          imageWeight: 0.7,
          textWeight: 0.3
        }
      );
    } catch (error) {
      console.error('Failed to generate multimodal embedding:', error);

      // Fallback to text-only embedding
      console.warn('Falling back to text-only embedding');
      return await this.embedText(textContent);
    }
  }

  /**
   * Simple hash function for mock embeddings
   */
  private static simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash * 0.00001; // Normalize
  }

  /**
   * Search for similar content using vector similarity
   */
  static async searchSimilar(
    query: string,
    filters: SearchFilters = {}
  ): Promise<SearchResult[]> {
    const {
      videoIds,
      contentTypes,
      minSimilarity = 0.3,
      limit = 10,
      includeKeyframes = true
    } = filters;

    // Generate query embedding
    const queryEmbedding = await this.embedText(query);

    // Build search query with filters
    const searchQuery = db
      .select({
        contentId: contentEmbedding.id,
        contentType: contentEmbedding.contentType,
        snippet: contentEmbedding.contentText,
        similarity: sql<number>`1 - (${contentEmbedding.embedding} <=> ${JSON.stringify(queryEmbedding)})`,
        videoTitle: videoSummary.title,
        videoId: videoSummary.id,
        timestamp: contentEmbedding.timestamp,
        keyframeId: contentEmbedding.keyframeId,
        metadata: contentEmbedding.metadata
      })
      .from(contentEmbedding)
      .leftJoin(videoSummary, eq(contentEmbedding.videoSummaryId, videoSummary.id));

    // Apply filters
    const conditions = [
      gt(
        sql<number>`1 - (${contentEmbedding.embedding} <=> ${JSON.stringify(queryEmbedding)})`,
        minSimilarity
      )
    ];

    if (videoIds?.length) {
      conditions.push(sql`${contentEmbedding.videoSummaryId} = ANY(${videoIds})`);
    }

    if (contentTypes?.length) {
      conditions.push(sql`${contentEmbedding.contentType} = ANY(${contentTypes})`);
    }

    if (!includeKeyframes) {
      conditions.push(sql`${contentEmbedding.contentType} != 'keyframe'`);
    }

    const results = await searchQuery
      .where(and(...conditions))
      .orderBy(desc(sql<number>`1 - (${contentEmbedding.embedding} <=> ${JSON.stringify(queryEmbedding)})`))
      .limit(limit);

    // Enrich results with keyframe URLs if applicable
    return Promise.all(
      results.map(async (result) => {
        let keyframeUrl: string | undefined;
        let thumbnailUrl: string | undefined;

        if (result.keyframeId) {
          const kf = await db
            .select({ blobUrl: keyframe.blobUrl, thumbnailUrl: keyframe.thumbnailUrl })
            .from(keyframe)
            .where(eq(keyframe.id, result.keyframeId))
            .limit(1);

          if (kf.length) {
            keyframeUrl = kf[0].blobUrl || undefined;
            thumbnailUrl = kf[0].thumbnailUrl || undefined;
          }
        }

        return {
          contentId: result.contentId,
          contentType: result.contentType,
          snippet: result.snippet.substring(0, 300) + (result.snippet.length > 300 ? '...' : ''),
          similarity: result.similarity,
          videoTitle: result.videoTitle || 'Unknown Video',
          videoId: result.videoId || '',
          timestamp: result.timestamp || undefined,
          keyframeUrl,
          thumbnailUrl,
          metadata: result.metadata || undefined
        };
      })
    );
  }

  /**
   * Delete all embeddings for a video
   */
  static async deleteVideoEmbeddings(videoSummaryId: string): Promise<void> {
    await db
      .delete(contentEmbedding)
      .where(eq(contentEmbedding.videoSummaryId, videoSummaryId));
  }

  /**
   * Get embedding statistics
   */
  static async getEmbeddingStats(): Promise<{
    totalEmbeddings: number;
    byContentType: Record<string, number>;
    recentlyCreated: number;
  }> {
    const total = await db
      .select({ count: sql<number>`count(*)` })
      .from(contentEmbedding);

    const byType = await db
      .select({
        contentType: contentEmbedding.contentType,
        count: sql<number>`count(*)`
      })
      .from(contentEmbedding)
      .groupBy(contentEmbedding.contentType);

    const recent = await db
      .select({ count: sql<number>`count(*)` })
      .from(contentEmbedding)
      .where(sql`${contentEmbedding.createdAt} > NOW() - INTERVAL '24 hours'`);

    return {
      totalEmbeddings: total[0]?.count || 0,
      byContentType: byType.reduce((acc, item) => ({
        ...acc,
        [item.contentType]: item.count
      }), {}),
      recentlyCreated: recent[0]?.count || 0
    };
  }
}