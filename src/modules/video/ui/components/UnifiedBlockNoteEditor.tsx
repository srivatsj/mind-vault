"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs, defaultStyleSpecs } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useEffect, useState, useCallback } from "react";
import { VideoBlock } from "./VideoBlock";

interface VideoSummaryData {
  id: string;
  title: string;
  description?: string;
  channelName?: string;
  duration?: number | null;
  youtubeUrl: string;
  aiGeneratedContent?: {
    summary?: {
      summary: string;
      keyPoints: string[];
      topics: string[];
      difficulty: string;
      estimatedReadTime: number;
    };
  };
  keyframes?: Array<{
    id: string;
    timestamp: number;
    blobUrl: string;
    description?: string;
    confidence?: number;
    category?: string;
  }>;
  createdAt: string;
}

interface UnifiedBlockNoteEditorProps {
  videoData: VideoSummaryData;
  content: string;
  onChange: (content: string) => void;
  className?: string;
}

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    video: VideoBlock,
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
  },
  styleSpecs: {
    ...defaultStyleSpecs,
  },
});

export const UnifiedBlockNoteEditor = ({
  videoData,
  content,
  onChange,
  className = ""
}: UnifiedBlockNoteEditorProps) => {
  const [isInitialized, setIsInitialized] = useState(false);

  const editor = useCreateBlockNote({
    schema,
  });

  const initializeContent = useCallback(async () => {
    if (isInitialized) return;

    try {
      const blocks = [];

      // Add video block at the top
      blocks.push({
        type: "video" as const,
        props: {
          videoData: JSON.stringify({
            videoId: videoData.id,
            title: videoData.title,
            youtubeUrl: videoData.youtubeUrl,
            channelName: videoData.channelName,
            duration: videoData.duration,
            createdAt: videoData.createdAt,
            keyframes: videoData.keyframes || [],
          }),
        },
      });

      // Add summary content
      if (content && content.trim()) {
        // Parse existing markdown content and add it
        const contentBlocks = await editor.tryParseMarkdownToBlocks(content);
        blocks.push(...contentBlocks);

        // Check if key points are missing from existing content and add them if needed
        const hasKeyPointsInContent = content.toLowerCase().includes('key points') || content.toLowerCase().includes('## key points');
        const keyPoints = videoData.aiGeneratedContent?.summary?.keyPoints || [];

        if (!hasKeyPointsInContent && keyPoints.length > 0) {
          // Add key points heading
          blocks.push({
            type: "heading" as const,
            props: {
              level: 2 as const,
            },
            content: "Key Points",
          });

          // Add each key point as a bullet point
          keyPoints.forEach((point) => {
            if (point && point.trim()) {
              blocks.push({
                type: "bulletListItem" as const,
                content: point.trim(),
              });
            }
          });
        }
      } else if (videoData.aiGeneratedContent?.summary?.summary) {
        // If no content, add the AI summary
        const summaryBlocks = await editor.tryParseMarkdownToBlocks(
          videoData.aiGeneratedContent.summary.summary
        );
        blocks.push(...summaryBlocks);

        // Only add key points if no existing content (first time initialization)
        const keyPoints = videoData.aiGeneratedContent?.summary?.keyPoints || [];
        if (keyPoints.length > 0) {
          // Add key points heading
          blocks.push({
            type: "heading" as const,
            props: {
              level: 2 as const,
            },
            content: "Key Points",
          });

          // Add each key point as a bullet point
          keyPoints.forEach((point) => {
            if (point && point.trim()) {
              blocks.push({
                type: "bulletListItem" as const,
                content: point.trim(),
              });
            }
          });
        }
      } else {
        // Add empty paragraph as fallback
        blocks.push({
          type: "paragraph" as const,
          content: "Add your notes and summary here...",
        });
      }

      // Always add empty space at the end
      blocks.push({
        type: "paragraph" as const,
        content: "",
      });
      blocks.push({
        type: "paragraph" as const,
        content: "",
      });

      editor.replaceBlocks(editor.document, blocks);
      setIsInitialized(true);
    } catch (error) {
      console.error("Failed to initialize editor content:", error);
      setIsInitialized(true);
    }
  }, [editor, videoData, content, isInitialized]);

  useEffect(() => {
    initializeContent();
  }, [initializeContent]);

  const handleChange = useCallback(async () => {
    if (!isInitialized) return;

    try {
      const allBlocks = editor.document;

      // Filter out video blocks and only get text content
      const contentBlocks = allBlocks.filter(block => block.type !== "video");

      if (contentBlocks.length > 0) {
        const markdown = await editor.blocksToMarkdownLossy(contentBlocks);
        onChange(markdown);
      } else {
        onChange("");
      }
    } catch (error) {
      console.error("Failed to convert blocks to markdown:", error);
    }
  }, [editor, onChange, isInitialized]);

  if (!isInitialized) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-muted-foreground">Loading editor...</div>
      </div>
    );
  }

  return (
    <BlockNoteView
      editor={editor}
      onChange={handleChange}
      theme="dark"
      className={className}
    />
  );
};