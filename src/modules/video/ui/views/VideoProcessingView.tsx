"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import {
  ArrowLeft,
  Video,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { useVideoStream } from "../../hooks/useVideoStream";

interface VideoProcessingViewProps {
  summaryId: string;
}

export const VideoProcessingView = ({ summaryId }: VideoProcessingViewProps) => {
  const router = useRouter();
  const { summary, loading, error } = useVideoStream(summaryId);

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return {
          icon: Clock,
          label: "Queued",
          color: "bg-yellow-500",
          progress: 5
        };
      case "extracting_transcript":
      case "generating_summary":
      case "extracting_keyframes":
      case "uploading_assets":
        return {
          icon: RefreshCw,
          label: "Processing",
          color: "bg-blue-500",
          progress: 50
        };
      case "completed":
        return {
          icon: CheckCircle,
          label: "Completed",
          color: "bg-green-500",
          progress: 100
        };
      case "failed":
        return {
          icon: AlertCircle,
          label: "Failed",
          color: "bg-red-500",
          progress: 0
        };
      default:
        return {
          icon: Clock,
          label: "Unknown",
          color: "bg-gray-500",
          progress: 0
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading video information...</p>
        </div>
      </div>
    );
  }

  if (error || !summary) {
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
              {error || "Video summary not found"}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Simple status logic - only use database status
  const statusInfo = getStatusInfo(summary.processingStatus);
  const StatusIcon = statusInfo.icon;

  // Only show detailed steps for completed/failed videos
  const showDetailedSteps = ['completed', 'failed'].includes(summary.processingStatus);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur-sm">
        <div className="flex h-16 items-center px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Video Processing</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex justify-center px-6 py-8 overflow-y-auto">
        <div className="w-full max-w-4xl">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Video Info */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-tight">{summary.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {summary.channelName} • {formatDuration(summary.duration)}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(summary.youtubeUrl, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Watch
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {summary.thumbnailUrl && (
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-4">
                    <Image
                      src={summary.thumbnailUrl}
                      alt={summary.title}
                      className="w-full h-full object-cover"
                      width={640}
                      height={360}
                    />
                  </div>
                )}
                {summary.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {summary.description}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Processing Status */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <StatusIcon
                    className={`h-4 w-4 ${
                      summary.processingStatus !== "completed" && summary.processingStatus !== "failed" ? "animate-spin" : ""
                    }`}
                  />
                  Processing Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="secondary"
                    className={`${statusInfo.color} text-white`}
                  >
                    {statusInfo.label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(statusInfo.progress)}%
                  </span>
                </div>

                <Progress value={statusInfo.progress} className="w-full" />

                {!['completed', 'failed'].includes(summary.processingStatus) && (
                  <p className="text-xs text-muted-foreground">
                    Auto-refreshing every 3 seconds...
                  </p>
                )}

                {summary.processingError && (
                  <p className="text-sm text-red-600">
                    {summary.processingError}
                  </p>
                )}

                {summary.processingStatus === "completed" && (
                  <Button
                    onClick={() => router.push(`/videos/${summaryId}/summary`)}
                    className="w-full"
                  >
                    View Summary
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Processing Steps - Only show for completed/failed videos */}
            {showDetailedSteps && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Processing Steps</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Video metadata extracted</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className={`w-2 h-2 rounded-full ${
                      summary.transcript && summary.transcript.trim().length > 0
                        ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span>Extracting transcript</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className={`w-2 h-2 rounded-full ${
                      summary.aiGeneratedContent?.summary?.summary
                        ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span>Generating AI summary</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className={`w-2 h-2 rounded-full ${
                      summary.aiGeneratedContent?.keyframeIntervals?.length && summary.aiGeneratedContent.keyframeIntervals.length > 0
                        ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span>Creating visual highlights</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Uploading assets</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};