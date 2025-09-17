"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Video,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { useVideoStream } from "../../hooks/useVideoStream";
import { UnifiedBlockNoteEditor } from "../components/UnifiedBlockNoteEditor";
import { getVideoSummary, updateVideoSummary } from "../../actions/video.actions";

interface VideoSummaryViewProps {
  summaryId: string;
}

interface KeyframeData {
  id: string;
  timestamp: number;
  blobUrl: string;
  description?: string;
  confidence?: number;
  category?: string;
  aiReason?: string;
}

interface VideoSummaryData {
  id: string;
  title: string;
  description?: string;
  channelName?: string;
  duration?: number | null;
  thumbnailUrl?: string;
  youtubeUrl: string;
  transcript?: string;
  summary?: string;
  processingStatus: string;
  aiGeneratedContent?: {
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
  };
  keyframes?: KeyframeData[];
  tags?: Array<{ id: string; name: string; color?: string }>;
  categories?: Array<{ id: string; name: string; color?: string }>;
  createdAt: string;
  updatedAt: string;
}

export const VideoSummaryView = ({ summaryId }: VideoSummaryViewProps) => {
  const router = useRouter();
  const { loading: videoLoading, error: videoError } = useVideoStream(summaryId);
  const [summary, setSummary] = useState<VideoSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editedSummary, setEditedSummary] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load detailed summary data
  useEffect(() => {
    const loadSummary = async () => {
      try {
        const result = await getVideoSummary(summaryId);
        if (result.success && result.data) {
          const summaryData = result.data as VideoSummaryData;
          setSummary(summaryData);
          setEditedSummary(summaryData.aiGeneratedContent?.summary?.summary || summaryData.summary || "");
        } else {
          setError(result.error || "Failed to load video summary");
        }
      } catch (err) {
        setError("An unexpected error occurred");
        console.error("Error loading summary:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, [summaryId]);


  const handleSaveSummary = useCallback(async () => {
    if (!summary || !editedSummary.trim()) return;
    
    setIsSaving(true);
    try {
      const result = await updateVideoSummary(summaryId, editedSummary);
      if (result.success) {
        // Update local state
        setSummary(prev => prev ? {
          ...prev,
          aiGeneratedContent: {
            ...prev.aiGeneratedContent,
            summary: prev.aiGeneratedContent?.summary ? {
              ...prev.aiGeneratedContent.summary,
              summary: editedSummary
            } : {
              summary: editedSummary,
              keyPoints: [],
              topics: [],
              difficulty: "Unknown",
              estimatedReadTime: 0
            }
          }
        } : null);
      } else {
        console.error("Failed to save changes:", result.error);
      }
    } catch (error) {
      console.error("Error saving summary:", error);
    } finally {
      setIsSaving(false);
    }
  }, [summaryId, editedSummary, summary]);

  const handleSummaryChange = useCallback((newContent: string) => {
    setEditedSummary(newContent);
    
    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    // Set new timeout for autosave (2 seconds after user stops typing)
    const timeout = setTimeout(() => {
      if (newContent.trim() !== (summary?.aiGeneratedContent?.summary?.summary || summary?.summary || "").trim()) {
        handleSaveSummary();
      }
    }, 2000);
    
    setSaveTimeout(timeout);
  }, [saveTimeout, handleSaveSummary, summary]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  // Show loading state
  if (loading || videoLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading video summary...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || videoError || !summary) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="container flex h-16 items-center px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
        <div className="container max-w-2xl px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || videoError || "Video summary not found"}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // If video is not completed, redirect to processing page
  if (summary.processingStatus !== "completed") {
    router.push(`/videos/${summaryId}`);
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur-sm">
        <div className="flex h-16 items-center px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/library")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold truncate max-w-md">{summary.title}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isSaving && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Unified Editor */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-8 py-8 overflow-y-auto">
        <UnifiedBlockNoteEditor
          videoData={summary}
          content={editedSummary}
          onChange={handleSummaryChange}
          className="min-h-full pb-32"
        />
      </div>
    </div>
  );
};