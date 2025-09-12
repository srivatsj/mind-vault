import { relations } from "drizzle-orm/relations";
import { user, account, videoSummary, keyframe, videoSummaryCategory, category, videoSummaryTag, tag, session } from "./schema";

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	accounts: many(account),
	sessions: many(session),
	videoSummaries: many(videoSummary),
}));

export const keyframeRelations = relations(keyframe, ({one}) => ({
	videoSummary: one(videoSummary, {
		fields: [keyframe.videoSummaryId],
		references: [videoSummary.id]
	}),
}));

export const videoSummaryRelations = relations(videoSummary, ({one, many}) => ({
	keyframes: many(keyframe),
	videoSummaryCategories: many(videoSummaryCategory),
	videoSummaryTags: many(videoSummaryTag),
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

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));