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
import { useInngestStatus } from "../../hooks/useInngestStatus";

interface VideoProcessingViewProps {
  summaryId: string;
}

export const VideoProcessingView = ({ summaryId }: VideoProcessingViewProps) => {
  const router = useRouter();
  const { summary, loading, error } = useVideoStream(summaryId);
  const { status: inngestStatus } = useInngestStatus(summary?.jobEventId, !!summary?.jobEventId);

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
        return {
          icon: RefreshCw,
          label: "Extracting Transcript",
          color: "bg-blue-500",
          progress: 25
        };
      case "extracting_keyframes":
        return {
          icon: RefreshCw,
          label: "Extracting Keyframes",
          color: "bg-blue-500",
          progress: 50
        };
      case "uploading_assets":
        return {
          icon: RefreshCw,
          label: "Uploading Assets",
          color: "bg-blue-500",
          progress: 70
        };
      case "generating_summary":
        return {
          icon: RefreshCw,
          label: "Generating AI Summary",
          color: "bg-blue-500",
          progress: 85
        };
      case "processing":
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

  // Prefer Inngest status for real-time updates, fallback to database status
  const displayStatus = inngestStatus?.status || 
    (summary.processingStatus === 'completed' ? 'completed' : 
     summary.processingStatus === 'failed' ? 'failed' : 'processing');
  const statusInfo = getStatusInfo(displayStatus);
  const displayProgress = inngestStatus?.progress ?? statusInfo.progress;
  const currentStep = inngestStatus?.currentStep || statusInfo.label;
  const StatusIcon = statusInfo.icon;

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
                      displayStatus === "processing" ? "animate-spin" : ""
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
                    {Math.round(displayProgress)}%
                  </span>
                </div>
                
                <Progress value={displayProgress} className="w-full" />
                
                {currentStep && (
                  <p className="text-sm text-muted-foreground">
                    {currentStep}
                  </p>
                )}
                
                {inngestStatus?.warnings && inngestStatus.warnings.length > 0 && (
                  <div className="space-y-1">
                    {inngestStatus.warnings.map((warning, index) => (
                      <p key={index} className="text-sm text-yellow-600 flex items-center gap-2">
                        <AlertCircle className="h-3 w-3" />
                        {warning}
                      </p>
                    ))}
                  </div>
                )}
                
                {(displayStatus === "failed") && (inngestStatus?.warnings?.[0] || summary.processingError) && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-sm">
                      {inngestStatus?.warnings?.[0] || summary.processingError}
                    </AlertDescription>
                  </Alert>
                )}
                
                {displayStatus === "completed" && (
                  <Button
                    onClick={() => router.push(`/videos/${summaryId}/summary`)}
                    className="w-full"
                  >
                    View Summary
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Processing Steps */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Processing Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Video metadata extracted</span>
                </div>
                {['Extracting transcript', 'Creating visual highlights', 'Uploading assets', 'Generating AI summary'].map((stepName) => (
                  <div key={stepName} className="flex items-center gap-3 text-sm">
                    <div className={`w-2 h-2 rounded-full ${
                      (inngestStatus?.completedSteps?.includes(stepName)) 
                        ? "bg-green-500" 
                        : (inngestStatus?.currentStep === stepName || currentStep === stepName)
                          ? "bg-blue-500 animate-pulse"
                          : "bg-gray-300"
                    }`} />
                    <span className={(inngestStatus?.currentStep === stepName || currentStep === stepName) ? "font-medium" : ""}>
                      {stepName}
                    </span>
                    {(inngestStatus?.currentStep === stepName || currentStep === stepName) && displayStatus === "processing" && (
                      <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};