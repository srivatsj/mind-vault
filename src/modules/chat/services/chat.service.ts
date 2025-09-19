import { ChatDAO } from '../data/chat.dao';
import { RAGService, RAGQuery } from './rag.service';
import { EmbeddingService } from './embedding.service';

export interface ChatResponse {
  messageId: string;
  content: string;
  sources: Array<{
    videoTitle: string;
    videoId: string;
    snippet: string;
    timestamp?: number;
    keyframeUrl?: string;
    thumbnailUrl?: string;
    similarity: number;
  }>;
  searchQuery?: string;
  totalResults?: number;
  processingTime?: number;
  followUpSuggestions?: string[];
}

export interface SendMessageRequest {
  conversationId: string;
  message: string;
  userId: string;
  filters?: {
    videoIds?: string[];
    contentTypes?: string[];
    includeVisuals?: boolean;
  };
}

export interface CreateConversationRequest {
  userId: string;
  initialMessage?: string;
  title?: string;
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  lastMessage: string | null;
  messageCount: number;
  updatedAt: Date;
}

export class ChatService {
  /**
   * Create a new conversation, optionally with an initial message
   */
  static async createConversation(request: CreateConversationRequest): Promise<{
    conversationId: string;
    response?: ChatResponse;
  }> {
    const { userId, initialMessage, title } = request;

    // Create conversation
    const conversation = await ChatDAO.createConversation({
      userId,
      title: title || (initialMessage ? await this.generateTitleFromMessage(initialMessage) : undefined)
    });

    // If there's an initial message, process it immediately
    if (initialMessage) {
      const response = await this.sendMessage({
        conversationId: conversation.id,
        message: initialMessage,
        userId
      });

      return {
        conversationId: conversation.id,
        response
      };
    }

    return {
      conversationId: conversation.id
    };
  }

  /**
   * Send a message and get RAG-powered response
   */
  static async sendMessage(request: SendMessageRequest): Promise<ChatResponse> {
    const { conversationId, message, userId, filters = {} } = request;

    // Verify user owns the conversation
    const conversation = await ChatDAO.getConversationById(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    // Save user message
    await ChatDAO.createMessage({
      conversationId,
      role: 'user',
      content: message
    });

    // Get conversation history for context
    const conversationHistory = await ChatDAO.getRecentMessages(conversationId, 6);

    // Build RAG query
    const ragQuery: RAGQuery = {
      query: message,
      conversationHistory,
      filters: {
        videoIds: filters.videoIds,
        contentTypes: filters.contentTypes,
        includeKeyframes: filters.includeVisuals !== false, // Default true
        minSimilarity: 0.3,
        limit: 8
      },
      includeVisuals: filters.includeVisuals !== false,
      maxResults: 8
    };

    // Process with RAG
    const ragResponse = await RAGService.query(ragQuery);

    // Generate follow-up suggestions
    const followUpSuggestions = await RAGService.suggestFollowUps(
      ragResponse.sources.map(source => ({
        contentId: '',
        contentType: 'mixed',
        snippet: source.snippet,
        similarity: source.similarity,
        videoTitle: source.videoTitle,
        videoId: source.videoId,
        timestamp: source.timestamp,
        keyframeUrl: source.keyframeUrl,
        thumbnailUrl: source.thumbnailUrl
      }))
    );

    // Save assistant response with context
    const assistantMessage = await ChatDAO.createMessage({
      conversationId,
      role: 'assistant',
      content: ragResponse.answer,
      contextData: {
        retrievedContent: ragResponse.sources.map(source => ({
          contentId: `${source.videoId}-${source.timestamp || 'summary'}`,
          contentType: source.timestamp ? 'transcript_segment' : 'summary',
          snippet: source.snippet,
          similarity: source.similarity,
          videoTitle: source.videoTitle,
          timestamp: source.timestamp,
          keyframeUrl: source.keyframeUrl
        })),
        searchQuery: ragResponse.searchQuery,
        totalResults: ragResponse.totalResults
      }
    });

    // Update conversation title if it's the first exchange and no custom title
    if (!conversation.title && conversationHistory.length <= 2) {
      const generatedTitle = await ChatDAO.generateConversationTitle(conversationId);
      await ChatDAO.updateConversationTitle(conversationId, userId, generatedTitle);
    }

    return {
      messageId: assistantMessage.id,
      content: ragResponse.answer,
      sources: ragResponse.sources,
      searchQuery: ragResponse.searchQuery,
      totalResults: ragResponse.totalResults,
      processingTime: ragResponse.processingTime,
      followUpSuggestions
    };
  }

  /**
   * Get conversation history
   */
  static async getConversationHistory(conversationId: string, userId: string) {
    return await ChatDAO.getMessagesByConversation(conversationId, userId);
  }

  /**
   * Get user's conversations
   */
  static async getUserConversations(userId: string): Promise<ConversationSummary[]> {
    const conversations = await ChatDAO.getConversationsByUser(userId);

    return conversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      lastMessage: conv.lastMessage || null,
      messageCount: conv.messageCount || 0,
      updatedAt: conv.updatedAt
    }));
  }

  /**
   * Delete a conversation
   */
  static async deleteConversation(conversationId: string, userId: string): Promise<void> {
    await ChatDAO.deleteConversation(conversationId, userId);
  }

  /**
   * Update conversation title
   */
  static async updateConversationTitle(conversationId: string, userId: string, title: string): Promise<void> {
    await ChatDAO.updateConversationTitle(conversationId, userId, title);
  }

  /**
   * Search user's chat history
   */
  static async searchChatHistory(userId: string, query: string) {
    return await ChatDAO.searchMessages(userId, query);
  }

  /**
   * Get quick search suggestions as user types
   */
  static async getSearchSuggestions(query: string) {
    return await RAGService.quickSearch(query);
  }

  /**
   * Get chat statistics for user
   */
  static async getChatStats(userId: string) {
    const [chatStats, embeddingStats] = await Promise.all([
      ChatDAO.getChatStats(userId),
      EmbeddingService.getEmbeddingStats()
    ]);

    return {
      ...chatStats,
      availableContent: {
        totalEmbeddings: embeddingStats.totalEmbeddings,
        contentTypes: embeddingStats.byContentType
      }
    };
  }

  /**
   * Generate embeddings for a specific video (admin/processing function)
   */
  static async generateVideoEmbeddings(videoSummaryId: string): Promise<void> {
    await EmbeddingService.generateEmbeddingsForVideo(videoSummaryId);
  }

  /**
   * Regenerate response for a message (if user wants a different answer)
   */
  static async regenerateResponse(
    messageId: string,
    conversationId: string,
    userId: string
  ): Promise<ChatResponse> {
    // Get the user message before this assistant message
    const messages = await ChatDAO.getMessagesByConversation(conversationId, userId);
    const messageIndex = messages.findIndex(m => m.id === messageId);

    if (messageIndex <= 0 || messages[messageIndex].role !== 'assistant') {
      throw new Error('Cannot regenerate this message');
    }

    const userMessage = messages[messageIndex - 1];
    if (userMessage.role !== 'user') {
      throw new Error('Invalid message sequence');
    }

    // Delete the current assistant message
    await ChatDAO.deleteMessage(messageId);

    // Generate new response using the original user message
    const ragQuery: RAGQuery = {
      query: userMessage.content,
      conversationHistory: messages.slice(0, messageIndex - 1).map(m => ({
        role: m.role,
        content: m.content
      })),
      filters: { limit: 8, minSimilarity: 0.3 },
      includeVisuals: true
    };

    const ragResponse = await RAGService.query(ragQuery);

    // Save new assistant response
    const newMessage = await ChatDAO.createMessage({
      conversationId,
      role: 'assistant',
      content: ragResponse.answer,
      contextData: {
        retrievedContent: ragResponse.sources.map(source => ({
          contentId: `${source.videoId}-${source.timestamp || 'summary'}`,
          contentType: source.timestamp ? 'transcript_segment' : 'summary',
          snippet: source.snippet,
          similarity: source.similarity,
          videoTitle: source.videoTitle,
          timestamp: source.timestamp,
          keyframeUrl: source.keyframeUrl
        })),
        searchQuery: ragResponse.searchQuery,
        totalResults: ragResponse.totalResults
      }
    });

    return {
      messageId: newMessage.id,
      content: ragResponse.answer,
      sources: ragResponse.sources,
      searchQuery: ragResponse.searchQuery,
      totalResults: ragResponse.totalResults,
      processingTime: ragResponse.processingTime
    };
  }

  /**
   * Generate title from message content
   */
  private static async generateTitleFromMessage(message: string): Promise<string> {
    // Simple title generation - take first sentence or first 50 characters
    const firstSentence = message.split(/[.!?]/)[0];
    if (firstSentence.length <= 50) {
      return firstSentence.trim();
    }

    return message.substring(0, 47).trim() + '...';
  }

  /**
   * Cleanup old conversations (maintenance function)
   */
  static async cleanupOldConversations(userId: string, daysOld: number = 90): Promise<number> {
    return await ChatDAO.cleanupOldConversations(userId, daysOld);
  }
}