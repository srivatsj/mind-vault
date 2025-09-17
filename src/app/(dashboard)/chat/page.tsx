'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  MessageCircle,
  Send,
  User,
  Bot,
  History,
  Plus,
  Clock
} from 'lucide-react';
import {
  createChatConversation,
  sendChatMessage,
  getChatStats,
  getChatConversations,
  getChatHistory
} from '@/modules/chat/actions/chat.actions';

// Simple markdown-like formatting component with image support
function MessageContent({ content }: { content: string }) {
  const formatText = (text: string) => {
    return text.split('\n').map((line, i) => {
      const bulletRegex = /^[\s]*[-\*\+]\s+(.+)$/;

      // Check if it's a bullet point
      const bulletMatch = line.match(bulletRegex);
      if (bulletMatch) {
        return (
          <div key={i} className="flex items-start gap-2 mb-1">
            <span className="text-xs mt-1">•</span>
            <span>{formatInlineText(bulletMatch[1])}</span>
          </div>
        );
      }

      // Regular paragraph
      if (line.trim()) {
        return (
          <div key={i} className="mb-2 last:mb-0">
            {formatInlineText(line)}
          </div>
        );
      }

      return <br key={i} />;
    });
  };

  const formatInlineText = (text: string) => {
    const parts: (string | React.ReactElement)[] = [];

    // Debug: Log the text to see what we're working with
    if (text.includes('[IMAGE:')) {
      console.log('Processing text with image:', text);
    }

    // Handle literal [IMAGE:URL] placeholder (when no actual URL is provided)
    text = text.replace(/\[IMAGE:URL\]/g, '📷 *[Visual content referenced but image not available]*');

    // Handle images [IMAGE:URL] first
    const imageRegex = /\[IMAGE:(https?:\/\/[^\]]+)\]/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = imageRegex.exec(text)) !== null) {
      // Add text before the image
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index);
        if (beforeText.trim()) {
          parts.push(beforeText);
        }
      }

      // Add the image
      parts.push(
        <div key={`image-${match.index}`} className="my-3">
          <Image
            src={match[1]}
            alt="Keyframe from video"
            width={400}
            height={225}
            className="rounded border object-cover max-w-full h-auto"
            sizes="(max-width: 768px) 100vw, 400px"
            onError={() => {
              console.log('Failed to load keyframe image:', match?.[1]);
            }}
          />
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last image
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);

      // Handle bold text in remaining text
      const boldParts: (string | React.ReactElement)[] = [];
      let boldLastIndex = 0;

      remainingText.replace(/\*\*(.*?)\*\*/g, (boldMatch, content, index) => {
        if (index > boldLastIndex) {
          boldParts.push(remainingText.slice(boldLastIndex, index));
        }
        boldParts.push(<strong key={`bold-${lastIndex}-${index}`}>{content}</strong>);
        boldLastIndex = index + boldMatch.length;
        return boldMatch;
      });

      if (boldLastIndex < remainingText.length) {
        boldParts.push(remainingText.slice(boldLastIndex));
      }

      parts.push(...boldParts);
    }

    // If no images were found, handle bold text in the entire text
    if (parts.length === 0) {
      let boldLastIndex = 0;
      const boldParts: (string | React.ReactElement)[] = [];

      text.replace(/\*\*(.*?)\*\*/g, (boldMatch, content, index) => {
        if (index > boldLastIndex) {
          boldParts.push(text.slice(boldLastIndex, index));
        }
        boldParts.push(<strong key={`bold-${index}`}>{content}</strong>);
        boldLastIndex = index + boldMatch.length;
        return boldMatch;
      });

      if (boldLastIndex < text.length) {
        boldParts.push(text.slice(boldLastIndex));
      }

      return boldParts.length > 1 ? boldParts : text;
    }

    return parts.length > 0 ? parts : text;
  };

  return <>{formatText(content)}</>;
}


interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatConversation {
  id: string;
  title: string | null;
  updatedAt: Date;
  messageCount?: number;
  lastMessage?: string | null;
}

interface ChatStats {
  totalConversations: number;
  totalMessages: number;
  recentActivity: number;
  availableContent: {
    totalEmbeddings: number;
    contentTypes: Record<string, number>;
  };
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [showConversations, setShowConversations] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadStats();
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadStats = async () => {
    try {
      const result = await getChatStats();
      if (result.success && result.stats) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const result = await getChatConversations();
      if (result.success && result.conversations) {
        setConversations(result.conversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadConversationMessages = async (convId: string) => {
    try {
      const result = await getChatHistory(convId);
      if (result.success && result.messages) {
        const chatMessages = result.messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.createdAt)
        }));
        setMessages(chatMessages);
        setConversationId(convId);
        setShowConversations(false);
      }
    } catch (error) {
      console.error('Failed to load conversation messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    const currentMessage = inputMessage;
    setInputMessage('');

    try {
      let result;

      if (!conversationId) {
        // Create new conversation
        result = await createChatConversation({
          initialMessage: currentMessage,
          title: `Chat: ${currentMessage.substring(0, 30)}...`
        });

        if (result.success) {
          setConversationId(result.conversationId);
          await loadConversations(); // Refresh conversations list
        }
      } else {
        // Send message to existing conversation
        result = await sendChatMessage({
          conversationId,
          message: currentMessage
        });
      }

      if (result.success && result.response) {
        const assistantMessage: ChatMessage = {
          id: result.response.messageId,
          role: 'assistant',
          content: result.response.content,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
        await loadStats();
      } else {
        setMessages(prev => [...prev, createErrorMessage(Date.now().toString() + '_error')]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, createErrorMessage(Date.now().toString() + '_error')]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const createErrorMessage = (messageId: string): ChatMessage => ({
    id: messageId,
    role: 'assistant',
    content: 'Sorry, I encountered an error processing your message. Please try again.',
    timestamp: new Date()
  });


  return (
    <div className="flex flex-col h-full max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-0 bg-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI Chat</h1>
            <p className="text-xs text-gray-600">
              Ask questions about your video content
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConversations(!showConversations)}
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            History
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMessages([]);
              setConversationId(null);
              setShowConversations(false);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

      </div>

      {/* Conversations Sidebar */}
      {showConversations && (
        <div className="border-b bg-white/50 backdrop-blur-sm">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Recent Conversations</h3>
              {stats && (
                <span className="text-xs text-gray-500">
                  {stats.totalConversations} total
                </span>
              )}
            </div>
            <ScrollArea className="h-32">
              {isLoadingConversations ? (
                <div className="flex items-center justify-center h-20">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-4">
                  No conversations yet
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => loadConversationMessages(conv.id)}
                      className={`w-full text-left p-2 rounded-lg hover:bg-white/80 transition-colors border ${
                        conversationId === conv.id
                          ? 'bg-indigo-50 border-indigo-200'
                          : 'border-transparent hover:border-gray-200'
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {conv.title || 'Untitled Chat'}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {new Date(conv.updatedAt).toLocaleDateString()}
                        </span>
                        {conv.messageCount && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              {conv.messageCount} messages
                            </span>
                          </>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <div className="text-xs text-gray-400 mt-1 truncate">
                          {conv.lastMessage.substring(0, 60)}...
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="p-3 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 mb-3">
                <MessageCircle className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Start a conversation
              </h3>
              <p className="text-gray-600 mb-4 max-w-sm text-sm">
                Ask questions about your video content. I can help you find specific information,
                explain concepts, or discover connections across your videos.
              </p>

              {/* Example queries */}
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {[
                  "What topics are covered in my videos?",
                  "Show me examples of React hooks",
                  "Find content about machine learning",
                  "Explain the key concepts from my latest video"
                ].map((example) => (
                  <Button
                    key={example}
                    variant="outline"
                    size="sm"
                    onClick={() => setInputMessage(example)}
                    className="text-sm"
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-2xl ${
                      message.role === 'user'
                        ? 'bg-indigo-500 text-white rounded-2xl px-4 py-3'
                        : 'bg-transparent'
                    }`}
                  >
                    <div className={`${
                      message.role === 'user'
                        ? 'prose prose-sm prose-invert text-white [&>*]:text-white'
                        : 'prose prose-sm text-gray-900'
                    } max-w-none`}>
                      <MessageContent content={message.content} />
                    </div>

                    <div className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-indigo-100' : 'text-gray-400'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>

                  </div>

                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-transparent">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t-0 bg-transparent">
          <div className="flex gap-3">
            <Input
              placeholder="Ask a question about your videos..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isLoading}
              className="flex-1 resize-none bg-white"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Conversation indicator */}
          {conversationId && (
            <div className="text-xs text-gray-500 mt-2">
              Conversation active • {messages.filter(m => m.role === 'user').length} messages
            </div>
          )}
        </div>
      </div>
    </div>
  );
}