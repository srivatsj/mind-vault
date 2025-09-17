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

    console.log(`🔍 RAG Query: "${query}" (includeVisuals: ${includeVisuals})`);

    // 1. Extract video context from conversation history
    const videoContext = this.extractVideoContext(conversationHistory);
    console.log(`🎯 Video context keywords:`, videoContext);

    // 2. Enhance query with conversation context
    const enhancedQuery = this.enhanceQueryWithContext(query, conversationHistory);

    // 3. Retrieve relevant content with improved filtering
    const searchFilters: SearchFilters = {
      ...filters,
      limit: maxResults * 2, // Get more candidates to filter better
      includeKeyframes: includeVisuals,
      minSimilarity: 0.25 // Lower threshold for better recall
    };

    console.log(`🔍 Enhanced query: "${enhancedQuery}"`);
    console.log(`🔍 Search filters:`, searchFilters);

    const candidateContent = await EmbeddingService.searchSimilar(enhancedQuery, searchFilters);

    // 4. Apply contextual filtering to remove irrelevant content
    const relevantContent = this.filterContentByContext(candidateContent, videoContext, query, maxResults);

    console.log(`🔍 Found ${relevantContent.length} relevant content items`);
    const keyframeCount = relevantContent.filter(c => c.contentType === 'keyframe').length;
    console.log(`🖼️ Keyframes found: ${keyframeCount}`);

    if (keyframeCount > 0) {
      console.log('🖼️ Keyframe details:', relevantContent
        .filter(c => c.contentType === 'keyframe')
        .map(c => ({ snippet: c.snippet.substring(0, 50), keyframeUrl: c.keyframeUrl }))
      );
    }

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

    // Get last few messages for context (more recent history)
    const recentContext = conversationHistory.slice(-6);

    // Extract relevant keywords and topics from recent conversation
    const previousUserQueries = recentContext
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .slice(-2); // Last 2 user messages

    // For follow-up questions, expand with context
    const isFollowUp = /^(what about|how about|tell me more|explain|can you|show me|find|that|this|it|also|and|or)/i.test(query.trim());

    // Also detect references to video content
    const hasVideoReference = /video|shows?|demonstrates?|explains?|example|visual|image|screen|interface/i.test(query);

    if ((isFollowUp || hasVideoReference) && previousUserQueries.length > 0) {
      // Combine recent context with current query for better search
      const contextualQuery = `${previousUserQueries.join(' ')} ${query}`;
      console.log(`Enhanced query with context: "${query}" -> "${contextualQuery}"`);
      return contextualQuery;
    }

    return query;
  }

  /**
   * Extract video context from conversation history
   */
  private static extractVideoContext(
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): string[] {
    const videoKeywords: string[] = [];

    // Look for technical terms and video topics mentioned in recent conversation
    const recentMessages = conversationHistory.slice(-6); // Look further back for context

    for (const message of recentMessages) {
      const content = message.content.toLowerCase();

      // Extract technical keywords with broader matching
      const technicalTerms = content.match(/\b(ssh|diffie-hellman|key exchange|encryption|authentication|security|scaling|horizontal|vertical|database|api|git|github|docker|kubernetes|react|node|javascript|python|java|sql|nosql|works|examples|tutorial|guide)\b/g);

      if (technicalTerms) {
        videoKeywords.push(...technicalTerms);
      }

      // Extract video titles or topics mentioned (more flexible matching)
      const videoTitleMatch = content.match(/video[^.]*?"([^"]+)"/);
      if (videoTitleMatch) {
        videoKeywords.push(videoTitleMatch[1]);
      }

      // Look for specific video titles mentioned
      if (content.includes('ssh') || content.includes('encryption') || content.includes('key')) {
        videoKeywords.push('ssh', 'encryption', 'key');
      }
    }

    console.log(`🔍 Extracted video context from ${recentMessages.length} messages:`, videoKeywords);
    return [...new Set(videoKeywords)]; // Remove duplicates
  }

  /**
   * Filter content by conversation context to avoid cross-topic contamination
   */
  private static filterContentByContext(
    candidateContent: Array<{
      contentId: string;
      contentType: string;
      snippet: string;
      similarity: number;
      videoTitle: string;
      videoId: string;
      timestamp?: number;
      keyframeUrl?: string;
      thumbnailUrl?: string;
    }>,
    videoContext: string[],
    originalQuery: string,
    maxResults: number
  ) {
    if (candidateContent.length === 0) {
      return candidateContent;
    }

    // If we have strong video context (SSH-related conversation), filter more intelligently
    const hasStrongContext = videoContext.some(keyword =>
      ['ssh', 'diffie-hellman', 'key exchange', 'encryption', 'authentication'].includes(keyword.toLowerCase())
    );

    if (hasStrongContext) {
      console.log(`🎯 Strong SSH context detected, applying smart filtering`);

      // First, separate SSH-related content from potentially irrelevant content
      const sshRelatedContent = candidateContent.filter(content => {
        const contentText = `${content.snippet} ${content.videoTitle}`.toLowerCase();

        // Always include content that mentions SSH directly
        const directSSHMatch = /ssh|secure shell|diffie.*hellman|key exchange|public.*key|private.*key|authentication/i.test(contentText);

        if (directSSHMatch) {
          console.log(`✅ SSH-related content: ${content.snippet.substring(0, 50)}`);
          return true;
        }

        // Check if it's from an SSH-related video
        const isSSHVideo = /ssh|key|encryption|security/i.test(content.videoTitle);
        if (isSSHVideo) {
          console.log(`✅ Content from SSH video: ${content.snippet.substring(0, 50)}`);
          return true;
        }

        return false;
      });

      // Then filter out clearly unrelated content (like scaling diagrams)
      const filteredContent = candidateContent.filter(content => {
        const contentText = `${content.snippet} ${content.videoTitle}`.toLowerCase();

        // Exclude scaling/architecture content unless it's about SSH infrastructure
        const isScalingContent = /scaling.*out|horizontal.*scaling|vertical.*scaling|load.*balancer.*scaling|database.*scaling/i.test(contentText);
        const isSSHRelated = /ssh|secure|shell|encryption|key|authentication|diffie.*hellman/i.test(contentText);

        if (isScalingContent && !isSSHRelated) {
          console.log(`🚫 Filtered out scaling content: ${content.snippet.substring(0, 50)}`);
          return false;
        }

        return true;
      });

      // Prioritize SSH-related content, but include other filtered content if needed
      const finalContent = sshRelatedContent.length > 0 ?
        [...sshRelatedContent, ...filteredContent.filter(c => !sshRelatedContent.includes(c))].slice(0, maxResults) :
        filteredContent.slice(0, maxResults);

      console.log(`🎯 Smart filtering: ${candidateContent.length} -> ${finalContent.length} items (${sshRelatedContent.length} SSH-related)`);
      return finalContent;
    }

    // Fallback to original content if context filtering is too aggressive
    return candidateContent.slice(0, maxResults);
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
3. **CRITICAL: When you see [KEYFRAME_IMAGE:URL] in the content, you MUST include the visual content in your response using this exact format: [IMAGE:URL] where URL is the keyframe image URL**
4. For visual explanations, prioritize showing relevant keyframes by using [IMAGE:URL] syntax
5. When describing technical concepts, processes, or interfaces, always check if there are visual examples available and include them
6. Use a conversational, helpful tone
7. Structure your response with clear formatting using markdown
8. Include relevant emojis to make the response more engaging

**VISUAL CONTENT PRIORITY:**
- If the user asks about visual concepts, interfaces, diagrams, code examples, or "how something looks"
- If keyframes are available that show relevant visual information
- ALWAYS include the images using [IMAGE:URL] syntax

Format your response as:
- Start with a direct answer
- Include relevant keyframe images IMMEDIATELY after mentioning visual concepts
- Provide detailed explanation using both text and visual context
- Reference specific sources with timestamps when available
- End with any additional insights or suggestions

**EXAMPLE:** If content mentions "Here's a diagram showing the process [KEYFRAME_IMAGE:https://example.com/image.jpg]", you should write: "Here's a diagram showing the process: [IMAGE:https://example.com/image.jpg]"

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