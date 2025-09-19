import { relations } from "drizzle-orm/relations";
import { user, chatConversation, account, videoSummary, keyframe, videoSummaryCategory, category, videoSummaryTag, tag, contentEmbedding, session, chatMessage } from "./schema";

export const chatConversationRelations = relations(chatConversation, ({one, many}) => ({
	user: one(user, {
		fields: [chatConversation.userId],
		references: [user.id]
	}),
	chatMessages: many(chatMessage),
}));

export const userRelations = relations(user, ({many}) => ({
	chatConversations: many(chatConversation),
	accounts: many(account),
	sessions: many(session),
	videoSummaries: many(videoSummary),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const keyframeRelations = relations(keyframe, ({one, many}) => ({
	videoSummary: one(videoSummary, {
		fields: [keyframe.videoSummaryId],
		references: [videoSummary.id]
	}),
	contentEmbeddings: many(contentEmbedding),
}));

export const videoSummaryRelations = relations(videoSummary, ({one, many}) => ({
	keyframes: many(keyframe),
	videoSummaryCategories: many(videoSummaryCategory),
	videoSummaryTags: many(videoSummaryTag),
	contentEmbeddings: many(contentEmbedding),
	user: one(user, {
		fields: [videoSummary.userId],
		references: [user.id]
	}),
}));

export const videoSummaryCategoryRelations = relations(videoSummaryCategory, ({one}) => ({
	videoSummary: one(videoSummary, {
		fields: [videoSummaryCategory.videoSummaryId],
		references: [videoSummary.id]
	}),
	category: one(category, {
		fields: [videoSummaryCategory.categoryId],
		references: [category.id]
	}),
}));

export const categoryRelations = relations(category, ({many}) => ({
	videoSummaryCategories: many(videoSummaryCategory),
}));

export const videoSummaryTagRelations = relations(videoSummaryTag, ({one}) => ({
	videoSummary: one(videoSummary, {
		fields: [videoSummaryTag.videoSummaryId],
		references: [videoSummary.id]
	}),
	tag: one(tag, {
		fields: [videoSummaryTag.tagId],
		references: [tag.id]
	}),
}));

export const tagRelations = relations(tag, ({many}) => ({
	videoSummaryTags: many(videoSummaryTag),
}));

export const contentEmbeddingRelations = relations(contentEmbedding, ({one}) => ({
	videoSummary: one(videoSummary, {
		fields: [contentEmbedding.videoSummaryId],
		references: [videoSummary.id]
	}),
	keyframe: one(keyframe, {
		fields: [contentEmbedding.keyframeId],
		references: [keyframe.id]
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const chatMessageRelations = relations(chatMessage, ({one}) => ({
	chatConversation: one(chatConversation, {
		fields: [chatMessage.conversationId],
		references: [chatConversation.id]
	}),
}));