import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { EmbeddingService, SearchResult, SearchFilters } from './embedding.service';
import { db } from '@/db';
import { videoSummary } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface RAGQuery {
  query: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  filters?: SearchFilters;
  includeVisuals?: boolean;
  maxResults?: number;
}

export interface RAGResponse {
  answer: string;
  sources: Array<{
    videoTitle: string;
    videoId: string;
    snippet: string;
    timestamp?: number;
    keyframeUrl?: string;
    thumbnailUrl?: string;
    similarity: number;
  }>;
  searchQuery: string;
  totalResults: number;
  processingTime: number;
}

export interface ContentMatch {
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

export class RAGService {
  private static model = google('gemini-2.0-flash-exp');

  /**
   * Main RAG query processing
   */
  static async query(ragQuery: RAGQuery): Promise<RAGResponse> {
    const startTime = Date.now();

    const {
      query,
      conversationHistory = [],
      filters = {},
      includeVisuals = true,
      maxResults = 8
    } = ragQuery;

    // 1. Enhance query with conversation context
    const enhancedQuery = this.enhanceQueryWithContext(query, conversationHistory);

    // 2. Retrieve relevant content
    const searchFilters: SearchFilters = {
      ...filters,
      limit: maxResults,
      includeKeyframes: includeVisuals,
      minSimilarity: 0.3
    };

    const relevantContent = await EmbeddingService.searchSimilar(enhancedQuery, searchFilters);

    if (relevantContent.length === 0) {
      return {
        answer: "I couldn't find any relevant content in your videos for that query. Try asking about topics covered in your uploaded videos, or rephrase your question.",
        sources: [],
        searchQuery: enhancedQuery,
        totalResults: 0,
        processingTime: Date.now() - startTime
      };
    }

    // 3. Generate contextual response
    const answer = await this.generateContextualResponse(query, relevantContent, conversationHistory);

    // 4. Format sources for response
    const sources = relevantContent.map(content => ({
      videoTitle: content.videoTitle,
      videoId: content.videoId,
      snippet: content.snippet,
      timestamp: content.timestamp,
      keyframeUrl: content.keyframeUrl,
      thumbnailUrl: content.thumbnailUrl,
      similarity: content.similarity
    }));

    return {
      answer,
      sources,
      searchQuery: enhancedQuery,
      totalResults: relevantContent.length,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Enhance query with conversation context
   */
  private static enhanceQueryWithContext(
    query: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): string {
    if (conversationHistory.length === 0) {
      return query;
    }

    // Get last few messages for context
    const recentContext = conversationHistory.slice(-4);
    const contextString = recentContext
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    // For follow-up questions, expand with context
    const isFollowUp = /^(what about|how about|tell me more|explain|can you|show me|find|that|this|it)/i.test(query.trim());

    if (isFollowUp && recentContext.length > 0) {
      return `Context: ${contextString}\n\nCurrent query: ${query}`;
    }

    return query;
  }

  /**
   * Generate contextual response using retrieved content
   */
  static async generateContextualResponse(
    originalQuery: string,
    relevantContent: ContentMatch[],
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<string> {
    // Group content by video for better organization
    const contentByVideo = this.groupContentByVideo(relevantContent);

    // Create context string with visual indicators and image references
    const contextSections = Object.entries(contentByVideo).map(([videoTitle, contents]) => {
      const videoContent = contents.map(content => {
        let prefix = '';
        let imageRef = '';

        switch (content.contentType) {
          case 'keyframe':
            prefix = '🖼️ [Visual]';
            // Add image reference for keyframes
            if (content.keyframeUrl) {
              imageRef = ` [KEYFRAME_IMAGE:${content.keyframeUrl}]`;
            }
            break;
          case 'transcript_segment':
            prefix = content.timestamp ? `🎬 [${this.formatTimestamp(content.timestamp)}]` : '🎬 [Transcript]';
            break;
          case 'summary':
            prefix = '📋 [Summary]';
            break;
          case 'key_point':
            prefix = '🔑 [Key Point]';
            break;
          default:
            prefix = '📄';
        }

        return `${prefix} ${content.snippet}${imageRef}`;
      }).join('\n');

      return `**${videoTitle}:**\n${videoContent}`;
    }).join('\n\n');

    // Build conversation context
    const recentHistory = conversationHistory.slice(-3);
    const historyContext = recentHistory.length > 0
      ? `Previous conversation:\n${recentHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}\n\n`
      : '';

    const prompt = `You are an AI assistant helping users understand their video content. Answer the user's question based on the provided context from their videos.

${historyContext}User Question: "${originalQuery}"

Content from your videos:
${contextSections}

Instructions:
1. Answer the question directly and comprehensively using the provided content
2. Reference specific videos and timestamps when relevant
3. **IMPORTANT: When visual content from keyframes is relevant, include the images in your response using this exact format: [IMAGE:URL] where URL is the keyframe image URL from [KEYFRAME_IMAGE:URL] references in the content**
4. If visual content is mentioned, note it explicitly (e.g., "As shown in this screenshot: [IMAGE:URL]" or "Here's what the interface looks like: [IMAGE:URL]")
5. Use a conversational, helpful tone
6. If the content doesn't fully answer the question, say so and suggest what information might be missing
7. Structure your response with clear formatting using markdown
8. Include relevant emojis to make the response more engaging

Format your response as:
- Start with a direct answer
- Provide detailed explanation using the context
- Include relevant keyframe images using [IMAGE:URL] syntax when visual content helps explain the answer
- Reference specific sources with timestamps when available
- End with any additional insights or suggestions

**CRITICAL: Always include keyframe images in your response when they are relevant to the user's question by using [IMAGE:URL] syntax.**

Do not make up information not present in the provided content.`;

    try {
      const result = await generateText({
        model: this.model,
        prompt,
        temperature: 0.7,
      });

      return result.text;
    } catch (error) {
      console.error('Failed to generate contextual response:', error);
      return `I found relevant content about "${originalQuery}" in your videos, but I'm having trouble generating a response right now. Please try again in a moment.`;
    }
  }

  /**
   * Group content by video for better organization
   */
  private static groupContentByVideo(content: ContentMatch[]): Record<string, ContentMatch[]> {
    return content.reduce((acc, item) => {
      const title = item.videoTitle || 'Unknown Video';
      if (!acc[title]) {
        acc[title] = [];
      }
      acc[title].push(item);
      return acc;
    }, {} as Record<string, ContentMatch[]>);
  }

  /**
   * Format timestamp as MM:SS
   */
  private static formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Suggest follow-up questions based on content
   */
  static async suggestFollowUps(
    originalQuery: string,
    relevantContent: ContentMatch[]
  ): Promise<string[]> {
    if (relevantContent.length === 0) {
      return [];
    }

    // Extract topics and generate suggestions
    const topics = new Set<string>();
    const videoTitles = new Set<string>();

    relevantContent.forEach(content => {
      videoTitles.add(content.videoTitle);

      // Extract potential topics from metadata
      if (content.metadata?.topics && Array.isArray(content.metadata.topics)) {
        content.metadata.topics.forEach((topic: string) => topics.add(topic));
      }
    });

    const suggestions: string[] = [];

    // Add video-specific suggestions
    if (videoTitles.size > 1) {
      const firstVideo = Array.from(videoTitles)[0];
      suggestions.push(`Tell me more about "${firstVideo}"`);
    }

    // Add topic-based suggestions
    Array.from(topics).slice(0, 2).forEach(topic => {
      suggestions.push(`How does ${topic} work?`);
    });

    // Add timestamp-based suggestions for visual content
    const visualContent = relevantContent.filter(c => c.keyframeUrl);
    if (visualContent.length > 0) {
      suggestions.push(`Show me visual examples of this concept`);
    }

    // Generic follow-ups
    if (relevantContent.length > 3) {
      suggestions.push(`Find similar content in my other videos`);
    }

    return suggestions.slice(0, 4); // Return max 4 suggestions
  }

  /**
   * Quick search for auto-suggestions
   */
  static async quickSearch(query: string, limit: number = 5): Promise<Array<{
    title: string;
    snippet: string;
    videoTitle: string;
  }>> {
    if (query.length < 3) {
      return [];
    }

    try {
      const results = await EmbeddingService.searchSimilar(query, {
        limit,
        minSimilarity: 0.4,
        includeKeyframes: false // Focus on text content for suggestions
      });

      return results.map(result => ({
        title: `${result.videoTitle} - ${result.contentType}`,
        snippet: result.snippet.substring(0, 100) + '...',
        videoTitle: result.videoTitle
      }));
    } catch (error) {
      console.error('Quick search failed:', error);
      return [];
    }
  }

  /**
   * Get related content for a specific video
   */
  static async getRelatedContent(videoId: string, limit: number = 5): Promise<SearchResult[]> {
    // Get video details first
    const video = await db
      .select({ title: videoSummary.title, description: videoSummary.description })
      .from(videoSummary)
      .where(eq(videoSummary.id, videoId))
      .limit(1);

    if (!video.length) {
      return [];
    }

    const videoData = video[0];
    const searchQuery = `${videoData.title} ${videoData.description || ''}`.substring(0, 500);

    return await EmbeddingService.searchSimilar(searchQuery, {
      videoIds: [videoId], // Only search within this video
      limit,
      minSimilarity: 0.2,
      includeKeyframes: true
    });
  }
}