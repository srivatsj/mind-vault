import { pgTable, text, timestamp, boolean, json, integer, vector, index } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// Video summaries table
export const videoSummary = pgTable("video_summary", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  youtubeUrl: text("youtube_url").notNull(),
  youtubeId: text("youtube_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  channelName: text("channel_name"),
  duration: integer("duration"), // in seconds
  thumbnailUrl: text("thumbnail_url"),
  transcript: text("transcript"),
  summary: text("summary"),
  aiGeneratedContent: json("ai_generated_content").$type<{
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
  }>(),
  processingStatus: text("processing_status", { 
    enum: ["pending", "extracting_transcript", "extracting_keyframes", "uploading_assets", "generating_summary", "completed", "failed"] 
  }).default("pending").notNull(),
  processingError: text("processing_error"),
  processingProgress: integer("processing_progress").default(0), // 0-100 percentage
  currentStep: text("current_step"), // Human readable current operation
  lastProcessedStep: text("last_processed_step"), // For resume capability
  retryCount: integer("retry_count").default(0), // Automatic retry tracking
  jobEventId: text("job_event_id"), // Inngest event ID for tracking
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Tags table
export const tag = pgTable("tag", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").default("#3B82F6"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Categories table  
export const category = pgTable("category", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  color: text("color").default("#10B981"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Video summary tags junction table
export const videoSummaryTag = pgTable("video_summary_tag", {
  id: text("id").primaryKey(),
  videoSummaryId: text("video_summary_id")
    .notNull()
    .references(() => videoSummary.id, { onDelete: "cascade" }),
  tagId: text("tag_id")
    .notNull()
    .references(() => tag.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Video summary categories junction table
export const videoSummaryCategory = pgTable("video_summary_category", {
  id: text("id").primaryKey(),
  videoSummaryId: text("video_summary_id")
    .notNull()
    .references(() => videoSummary.id, { onDelete: "cascade" }),
  categoryId: text("category_id")
    .notNull()
    .references(() => category.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Keyframes table for extracted video frames
export const keyframe = pgTable("keyframe", {
  id: text("id").primaryKey(),
  videoSummaryId: text("video_summary_id")
    .notNull()
    .references(() => videoSummary.id, { onDelete: "cascade" }),
  blobUrl: text("blob_url").notNull(),
  thumbnailUrl: text("thumbnail_url"), // Smaller thumbnail version
  timestamp: integer("timestamp").notNull(), // timestamp in video (seconds)
  description: text("description"),
  transcriptSegment: text("transcript_segment"),
  confidence: integer("confidence"), // AI confidence score (0-100)
  category: text("category"), // intro, main_point, demo, conclusion, etc.
  aiReason: text("ai_reason"), // Why AI selected this keyframe
  fileSize: integer("file_size"), // File size in bytes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Content embeddings for semantic search
export const contentEmbedding = pgTable("content_embedding", {
  id: text("id").primaryKey(),
  videoSummaryId: text("video_summary_id")
    .notNull()
    .references(() => videoSummary.id, { onDelete: "cascade" }),
  contentType: text("content_type", {
    enum: ["transcript_segment", "keyframe", "summary", "description", "key_point"]
  }).notNull(),
  contentText: text("content_text").notNull(),
  embedding: vector("embedding", { dimensions: 768 }), // Gemini text embeddings (text-embedding-004)
  keyframeId: text("keyframe_id").references(() => keyframe.id, { onDelete: "cascade" }),
  timestamp: integer("timestamp"), // For transcript segments (seconds)
  metadata: json("metadata").$type<{
    segmentIndex?: number;
    confidence?: number;
    category?: string;
    duration?: number;
    topics?: string[];
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  embeddingIndex: index("content_embedding_vector_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  contentTypeIndex: index("content_type_idx").on(table.contentType),
  videoIndex: index("video_summary_idx").on(table.videoSummaryId),
}));

// Chat conversations
export const chatConversation = pgTable("chat_conversation", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Chat messages with RAG context
export const chatMessage = pgTable("chat_message", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => chatConversation.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  contextData: json("context_data").$type<{
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
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
