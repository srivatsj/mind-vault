import { db } from '@/db';
import { chatConversation, chatMessage } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export interface ChatConversation {
  id: string;
  userId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  messageCount?: number;
  lastMessage?: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  contextData?: {
    retrievedContent?: Array<{
      contentId: string;
      contentType: string;
      snippet: string;
      similarity: number;
      videoTitle: string;
      timestamp?: number;
      keyframeUrl?: string;
    }>;
    searchQuery?: string;
    totalResults?: number;
  };
  createdAt: Date;
}

export interface CreateConversationData {
  userId: string;
  title?: string;
}

export interface CreateMessageData {
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  contextData?: ChatMessage['contextData'];
}

export class ChatDAO {
  /**
   * Create a new chat conversation
   */
  static async createConversation(data: CreateConversationData): Promise<ChatConversation> {
    const id = nanoid();

    const result = await db
      .insert(chatConversation)
      .values({
        id,
        userId: data.userId,
        title: data.title || null,
      })
      .returning();

    return {
      id: result[0].id,
      userId: result[0].userId,
      title: result[0].title,
      createdAt: result[0].createdAt,
      updatedAt: result[0].updatedAt,
    };
  }

  /**
   * Get conversation by ID
   */
  static async getConversationById(id: string, userId: string): Promise<ChatConversation | null> {
    const result = await db
      .select()
      .from(chatConversation)
      .where(and(
        eq(chatConversation.id, id),
        eq(chatConversation.userId, userId)
      ))
      .limit(1);

    if (!result.length) {
      return null;
    }

    const conv = result[0];
    return {
      id: conv.id,
      userId: conv.userId,
      title: conv.title,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    };
  }

  /**
   * Get conversations for a user with message preview
   */
  static async getConversationsByUser(userId: string, limit: number = 20): Promise<ChatConversation[]> {
    const conversations = await db
      .select({
        id: chatConversation.id,
        userId: chatConversation.userId,
        title: chatConversation.title,
        createdAt: chatConversation.createdAt,
        updatedAt: chatConversation.updatedAt,
      })
      .from(chatConversation)
      .where(eq(chatConversation.userId, userId))
      .orderBy(desc(chatConversation.updatedAt))
      .limit(limit);

    // Get message count and last message for each conversation
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const messageStats = await db
          .select({
            count: sql<number>`count(*)`,
            lastMessage: sql<string>`
              (SELECT content FROM ${chatMessage}
               WHERE ${chatMessage.conversationId} = ${conv.id}
               ORDER BY ${chatMessage.createdAt} DESC
               LIMIT 1)
            `
          })
          .from(chatMessage)
          .where(eq(chatMessage.conversationId, conv.id));

        return {
          ...conv,
          messageCount: messageStats[0]?.count || 0,
          lastMessage: messageStats[0]?.lastMessage || null,
        };
      })
    );

    return enrichedConversations;
  }

  /**
   * Update conversation title
   */
  static async updateConversationTitle(id: string, userId: string, title: string): Promise<void> {
    await db
      .update(chatConversation)
      .set({
        title,
        updatedAt: new Date()
      })
      .where(and(
        eq(chatConversation.id, id),
        eq(chatConversation.userId, userId)
      ));
  }

  /**
   * Delete conversation and all messages
   */
  static async deleteConversation(id: string, userId: string): Promise<void> {
    // Messages will be cascade deleted due to foreign key constraint
    await db
      .delete(chatConversation)
      .where(and(
        eq(chatConversation.id, id),
        eq(chatConversation.userId, userId)
      ));
  }

  /**
   * Create a new chat message
   */
  static async createMessage(data: CreateMessageData): Promise<ChatMessage> {
    const id = nanoid();

    const result = await db
      .insert(chatMessage)
      .values({
        id,
        conversationId: data.conversationId,
        role: data.role,
        content: data.content,
        contextData: data.contextData || undefined,
      })
      .returning();

    // Update conversation timestamp
    await db
      .update(chatConversation)
      .set({ updatedAt: new Date() })
      .where(eq(chatConversation.id, data.conversationId));

    return {
      id: result[0].id,
      conversationId: result[0].conversationId,
      role: result[0].role,
      content: result[0].content,
      contextData: result[0].contextData || undefined,
      createdAt: result[0].createdAt,
    };
  }

  /**
   * Get messages for a conversation
   */
  static async getMessagesByConversation(
    conversationId: string,
    userId: string,
    limit: number = 50
  ): Promise<ChatMessage[]> {
    // First verify user owns the conversation
    const conversation = await this.getConversationById(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const messages = await db
      .select()
      .from(chatMessage)
      .where(eq(chatMessage.conversationId, conversationId))
      .orderBy(chatMessage.createdAt) // Oldest first for conversation flow
      .limit(limit);

    return messages.map(msg => ({
      id: msg.id,
      conversationId: msg.conversationId,
      role: msg.role,
      content: msg.content,
      contextData: msg.contextData || undefined,
      createdAt: msg.createdAt,
    }));
  }

  /**
   * Get recent messages for context (newest first)
   */
  static async getRecentMessages(
    conversationId: string,
    count: number = 5
  ): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    const messages = await db
      .select({
        role: chatMessage.role,
        content: chatMessage.content,
      })
      .from(chatMessage)
      .where(eq(chatMessage.conversationId, conversationId))
      .orderBy(desc(chatMessage.createdAt))
      .limit(count);

    return messages.reverse(); // Return oldest first for context
  }

  /**
   * Update message content (for edits)
   */
  static async updateMessage(id: string, content: string): Promise<void> {
    await db
      .update(chatMessage)
      .set({ content })
      .where(eq(chatMessage.id, id));
  }

  /**
   * Delete a message
   */
  static async deleteMessage(id: string): Promise<void> {
    await db
      .delete(chatMessage)
      .where(eq(chatMessage.id, id));
  }

  /**
   * Search messages by content
   */
  static async searchMessages(
    userId: string,
    query: string,
    limit: number = 20
  ): Promise<Array<ChatMessage & { conversationTitle: string | null }>> {
    const results = await db
      .select({
        id: chatMessage.id,
        conversationId: chatMessage.conversationId,
        role: chatMessage.role,
        content: chatMessage.content,
        contextData: chatMessage.contextData,
        createdAt: chatMessage.createdAt,
        conversationTitle: chatConversation.title,
      })
      .from(chatMessage)
      .leftJoin(chatConversation, eq(chatMessage.conversationId, chatConversation.id))
      .where(and(
        eq(chatConversation.userId, userId),
        sql`${chatMessage.content} ILIKE ${`%${query}%`}`
      ))
      .orderBy(desc(chatMessage.createdAt))
      .limit(limit);

    return results.map(result => ({
      id: result.id,
      conversationId: result.conversationId,
      role: result.role,
      content: result.content,
      contextData: result.contextData || undefined,
      createdAt: result.createdAt,
      conversationTitle: result.conversationTitle,
    }));
  }

  /**
   * Get chat statistics for a user
   */
  static async getChatStats(userId: string): Promise<{
    totalConversations: number;
    totalMessages: number;
    recentActivity: number;
  }> {
    const conversations = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatConversation)
      .where(eq(chatConversation.userId, userId));

    const messages = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatMessage)
      .leftJoin(chatConversation, eq(chatMessage.conversationId, chatConversation.id))
      .where(eq(chatConversation.userId, userId));

    const recentActivity = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatMessage)
      .leftJoin(chatConversation, eq(chatMessage.conversationId, chatConversation.id))
      .where(and(
        eq(chatConversation.userId, userId),
        sql`${chatMessage.createdAt} > NOW() - INTERVAL '7 days'`
      ));

    return {
      totalConversations: conversations[0]?.count || 0,
      totalMessages: messages[0]?.count || 0,
      recentActivity: recentActivity[0]?.count || 0,
    };
  }

  /**
   * Generate conversation title from first message
   */
  static async generateConversationTitle(conversationId: string): Promise<string> {
    const firstMessage = await db
      .select({ content: chatMessage.content })
      .from(chatMessage)
      .where(and(
        eq(chatMessage.conversationId, conversationId),
        eq(chatMessage.role, 'user')
      ))
      .orderBy(chatMessage.createdAt)
      .limit(1);

    if (!firstMessage.length) {
      return 'New Chat';
    }

    const content = firstMessage[0].content;

    // Simple title generation - take first sentence or first 50 characters
    const firstSentence = content.split(/[.!?]/)[0];
    if (firstSentence.length <= 50) {
      return firstSentence.trim();
    }

    return content.substring(0, 47).trim() + '...';
  }

  /**
   * Clean up old conversations (optional maintenance)
   */
  static async cleanupOldConversations(userId: string, daysOld: number = 90): Promise<number> {
    const result = await db
      .delete(chatConversation)
      .where(and(
        eq(chatConversation.userId, userId),
        sql`${chatConversation.updatedAt} < NOW() - INTERVAL '${daysOld} days'`
      ))
      .returning({ id: chatConversation.id });

    return result.length;
  }
}