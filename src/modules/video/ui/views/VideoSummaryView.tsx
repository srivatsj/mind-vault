"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { 
  ArrowLeft, 
  Video, 
  ExternalLink,
  Clock,
  User,
  Calendar,
  Tag,
  Folder,
  Image as ImageIcon,
  FileText,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { useVideoStream } from "../../hooks/useVideoStream";
import { RichTextEditor } from "../components/RichTextEditor";
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

  const formatDuration = (seconds: number | null | undefined): string => {
    if (!seconds) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

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

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 overflow-y-auto">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Video Information */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-2xl leading-tight mb-2">{summary.title}</CardTitle>
                    <CardDescription className="flex items-center gap-4 text-base">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {summary.channelName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDuration(summary.duration)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(summary.createdAt).toLocaleDateString()}
                      </span>
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => window.open(summary.youtubeUrl, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Watch on YouTube
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Embedded YouTube Video */}
                <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6">
                  <iframe
                    src={`https://www.youtube.com/embed/${summary.youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&\n?#]+)/)?.[1]}`}
                    title={summary.title}
                    className="w-full h-full"
                    allowFullScreen
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
                
                {/* Tags and Categories */}
                {(summary.tags?.length || summary.categories?.length) && (
                  <div className="space-y-3 mb-6">
                    {summary.categories && summary.categories.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Folder className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Categories:</span>
                        {summary.categories.map((category) => (
                          <Badge 
                            key={category.id} 
                            variant="secondary"
                            style={{ backgroundColor: category.color || '#10B981' }}
                            className="text-white"
                          >
                            {category.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {summary.tags && summary.tags.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Tags:</span>
                        {summary.tags.map((tag) => (
                          <Badge 
                            key={tag.id} 
                            variant="outline"
                            style={{ borderColor: tag.color || '#3B82F6', color: tag.color || '#3B82F6' }}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Original Description */}
                {summary.description && (
                  <div className="text-sm text-muted-foreground border-l-4 border-muted pl-4">
                    <h4 className="font-medium text-foreground mb-2">Original Description</h4>
                    <p className="whitespace-pre-wrap line-clamp-4">{summary.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Generated Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    AI Summary
                  </CardTitle>
                  {summary.aiGeneratedContent?.summary?.difficulty && (
                    <Badge variant="outline">
                      Difficulty: {summary.aiGeneratedContent.summary.difficulty}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <RichTextEditor
                  content={editedSummary}
                  onChange={handleSummaryChange}
                  placeholder="Edit the AI-generated summary..."
                />
              </CardContent>
            </Card>

            {/* Key Points */}
            {summary.aiGeneratedContent?.summary?.keyPoints && summary.aiGeneratedContent.summary.keyPoints.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Key Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {summary.aiGeneratedContent.summary.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Topics */}
            {summary.aiGeneratedContent?.summary?.topics && summary.aiGeneratedContent.summary.topics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Topics Covered</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {summary.aiGeneratedContent.summary.topics.map((topic, index) => (
                      <Badge key={index} variant="secondary" className="mr-2 mb-2">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Keyframes */}
            {summary.keyframes && summary.keyframes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Key Moments ({summary.keyframes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {summary.keyframes.map((keyframe) => (
                      <div key={keyframe.id} className="space-y-2">
                        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                          <Image
                            src={keyframe.blobUrl}
                            alt={keyframe.description || `Keyframe at ${formatTimestamp(keyframe.timestamp)}`}
                            className="w-full h-full object-cover"
                            width={320}
                            height={180}
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-primary">
                              {formatTimestamp(keyframe.timestamp)}
                            </span>
                            {keyframe.confidence && (
                              <Badge variant="outline" className="text-xs">
                                {Math.round(keyframe.confidence * 100)}%
                              </Badge>
                            )}
                          </div>
                          {keyframe.description && (
                            <p className="text-xs text-muted-foreground">
                              {keyframe.description}
                            </p>
                          )}
                          {keyframe.category && (
                            <Badge variant="secondary" className="text-xs">
                              {keyframe.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transcript Section */}
            {summary.transcript && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Transcript</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-64 overflow-y-auto text-sm">
                    <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                      {summary.transcript}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};