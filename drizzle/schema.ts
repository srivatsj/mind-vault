import { pgTable, unique, text, boolean, timestamp, foreignKey, integer, json } from "drizzle-orm/pg-core"

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("user_email_unique").on(table.email),
]);

export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: 'string' }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const category = pgTable("category", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	color: text().default('#10B981'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("category_name_unique").on(table.name),
]);

export const tag = pgTable("tag", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	color: text().default('#3B82F6'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("tag_name_unique").on(table.name),
]);

export const keyframe = pgTable("keyframe", {
	id: text().primaryKey().notNull(),
	videoSummaryId: text("video_summary_id").notNull(),
	blobUrl: text("blob_url").notNull(),
	timestamp: integer().notNull(),
	description: text(),
	transcriptSegment: text("transcript_segment"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	thumbnailUrl: text("thumbnail_url"),
	confidence: integer(),
	category: text(),
	aiReason: text("ai_reason"),
	fileSize: integer("file_size"),
}, (table) => [
	foreignKey({
			columns: [table.videoSummaryId],
			foreignColumns: [videoSummary.id],
			name: "keyframe_video_summary_id_video_summary_id_fk"
		}).onDelete("cascade"),
]);

export const videoSummaryCategory = pgTable("video_summary_category", {
	id: text().primaryKey().notNull(),
	videoSummaryId: text("video_summary_id").notNull(),
	categoryId: text("category_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.videoSummaryId],
			foreignColumns: [videoSummary.id],
			name: "video_summary_category_video_summary_id_video_summary_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [category.id],
			name: "video_summary_category_category_id_category_id_fk"
		}).onDelete("cascade"),
]);

export const videoSummaryTag = pgTable("video_summary_tag", {
	id: text().primaryKey().notNull(),
	videoSummaryId: text("video_summary_id").notNull(),
	tagId: text("tag_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.videoSummaryId],
			foreignColumns: [videoSummary.id],
			name: "video_summary_tag_video_summary_id_video_summary_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tagId],
			foreignColumns: [tag.id],
			name: "video_summary_tag_tag_id_tag_id_fk"
		}).onDelete("cascade"),
]);

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("session_token_unique").on(table.token),
]);

export const videoSummary = pgTable("video_summary", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	youtubeUrl: text("youtube_url").notNull(),
	youtubeId: text("youtube_id").notNull(),
	title: text().notNull(),
	description: text(),
	channelName: text("channel_name"),
	duration: integer(),
	thumbnailUrl: text("thumbnail_url"),
	transcript: text(),
	summary: text(),
	aiGeneratedContent: json("ai_generated_content"),
	processingStatus: text("processing_status").default('pending').notNull(),
	processingError: text("processing_error"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	processingProgress: integer("processing_progress").default(0),
	currentStep: text("current_step"),
	lastProcessedStep: text("last_processed_step"),
	retryCount: integer("retry_count").default(0),
	jobEventId: text("job_event_id"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "video_summary_user_id_user_id_fk"
		}).onDelete("cascade"),
]);
