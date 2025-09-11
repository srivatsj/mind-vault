import { pgTable, text, timestamp, boolean, json, integer } from "drizzle-orm/pg-core";

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
    summary?: string;
    keyPoints?: string[];
    diagrams?: string[];
    suggestedTags?: string[];
  }>(),
  processingStatus: text("processing_status", { 
    enum: ["pending", "processing", "completed", "failed"] 
  }).default("pending").notNull(),
  processingError: text("processing_error"),
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
  timestamp: integer("timestamp").notNull(), // timestamp in video (seconds)
  description: text("description"),
  transcriptSegment: text("transcript_segment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
