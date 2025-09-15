'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { ChatService } from '../services/chat.service';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

// Server Action wrapper to ensure authentication
async function requireAuth() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (!session?.user?.id) {
    redirect('/sign-in');
  }
  return session.user.id;
}

/**
 * Create a new chat conversation
 */
export async function createChatConversation(request: {
  initialMessage?: string;
  title?: string;
}): Promise<{
  success: true;
  conversationId: string;
  response?: {
    messageId: string;
    content: string;
    sources: Array<{
      videoTitle: string;
      videoId: string;
      snippet: string;
      timestamp?: number;
      keyframeUrl?: string;
      similarity: number;
    }>;
    followUpSuggestions?: string[];
  };
} | {
  success: false;
  error: string;
}> {
  try {
    const userId = await requireAuth();

    const result = await ChatService.createConversation({
      userId,
      initialMessage: request.initialMessage,
      title: request.title
    });

    revalidatePath('/chat');
    return {
      success: true,
      conversationId: result.conversationId,
      response: result.response ? {
        messageId: result.response.messageId,
        content: result.response.content,
        sources: result.response.sources,
        followUpSuggestions: result.response.followUpSuggestions
      } : undefined
    };
  } catch (error) {
    console.error('Failed to create conversation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create conversation'
    };
  }
}

/**
 * Send a message to a conversation
 */
export async function sendChatMessage(request: {
  conversationId: string;
  message: string;
  filters?: {
    videoIds?: string[];
    contentTypes?: string[];
    includeVisuals?: boolean;
  };
}): Promise<{
  success: true;
  response: {
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
  };
} | {
  success: false;
  error: string;
}> {
  try {
    const userId = await requireAuth();

    const response = await ChatService.sendMessage({
      conversationId: request.conversationId,
      message: request.message,
      userId,
      filters: request.filters
    });

    revalidatePath(`/chat/${request.conversationId}`);
    return {
      success: true,
      response
    };
  } catch (error) {
    console.error('Failed to send message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message'
    };
  }
}

/**
 * Get user's chat conversations
 */
export async function getChatConversations() {
  try {
    const userId = await requireAuth();
    const conversations = await ChatService.getUserConversations(userId);
    return {
      success: true,
      conversations
    };
  } catch (error) {
    console.error('Failed to get conversations:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get conversations'
    };
  }
}

/**
 * Get conversation history
 */
export async function getChatHistory(conversationId: string) {
  try {
    const userId = await requireAuth();
    const messages = await ChatService.getConversationHistory(conversationId, userId);
    return {
      success: true,
      messages
    };
  } catch (error) {
    console.error('Failed to get chat history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get chat history'
    };
  }
}

/**
 * Update conversation title
 */
export async function updateChatTitle(conversationId: string, title: string) {
  try {
    const userId = await requireAuth();
    await ChatService.updateConversationTitle(conversationId, userId, title);
    revalidatePath('/chat');
    revalidatePath(`/chat/${conversationId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update title:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update title'
    };
  }
}

/**
 * Delete conversation
 */
export async function deleteChatConversation(conversationId: string) {
  try {
    const userId = await requireAuth();
    await ChatService.deleteConversation(conversationId, userId);
    revalidatePath('/chat');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete conversation'
    };
  }
}

/**
 * Search chat history
 */
export async function searchChatHistory(query: string) {
  try {
    const userId = await requireAuth();
    const results = await ChatService.searchChatHistory(userId, query);
    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('Failed to search chat history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search chat history'
    };
  }
}

/**
 * Get search suggestions for autocomplete
 */
export async function getChatSearchSuggestions(query: string) {
  try {
    if (query.length < 3) {
      return { success: true, suggestions: [] };
    }

    const suggestions = await ChatService.getSearchSuggestions(query);
    return {
      success: true,
      suggestions
    };
  } catch (error) {
    console.error('Failed to get search suggestions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get suggestions'
    };
  }
}

/**
 * Regenerate assistant response
 */
export async function regenerateChatResponse(messageId: string, conversationId: string) {
  try {
    const userId = await requireAuth();
    const response = await ChatService.regenerateResponse(messageId, conversationId, userId);
    revalidatePath(`/chat/${conversationId}`);
    return {
      success: true,
      response
    };
  } catch (error) {
    console.error('Failed to regenerate response:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to regenerate response'
    };
  }
}

/**
 * Get chat statistics
 */
export async function getChatStats() {
  try {
    const userId = await requireAuth();
    const stats = await ChatService.getChatStats(userId);
    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Failed to get chat stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get chat stats'
    };
  }
}

/**
 * Generate embeddings for a video (admin function)
 */
export async function generateVideoEmbeddings(videoSummaryId: string) {
  try {
    await requireAuth(); // Ensure user is authenticated
    await ChatService.generateVideoEmbeddings(videoSummaryId);
    revalidatePath('/chat');
    return { success: true };
  } catch (error) {
    console.error('Failed to generate embeddings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate embeddings'
    };
  }
}