"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Image from "next/image";
import {
  ArrowLeft,
  Video,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  XCircle
} from "lucide-react";
import { useVideoStream } from "../../hooks/useVideoStream";
import { useInngestStatus } from "../../hooks/useInngestStatus";

interface VideoProcessingViewProps {
  summaryId: string;
}

export const VideoProcessingView = ({ summaryId }: VideoProcessingViewProps) => {
  const router = useRouter();
  const { summary, loading, error } = useVideoStream(summaryId);
  // Only use SSE for videos that are actively processing
  const enableSSE = Boolean(summary?.jobEventId && summary?.processingStatus &&
    !['completed', 'failed'].includes(summary.processingStatus));
  const { status: inngestStatus } = useInngestStatus(summary?.jobEventId, enableSSE);

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

  // Create proper status mapping that respects database status for completed/failed
  const getDatabaseStatusInfo = (dbStatus: string) => {
    const statusMapping: Record<string, { status: 'pending' | 'processing' | 'completed' | 'failed'; step: string; progress: number }> = {
      'pending': { status: 'pending' as const, step: 'Queued', progress: 5 },
      'extracting_transcript': { status: 'processing' as const, step: 'Extracting transcript', progress: 20 },
      'generating_summary': { status: 'processing' as const, step: 'Generating AI summary', progress: 40 },
      'extracting_keyframes': { status: 'processing' as const, step: 'Creating visual highlights', progress: 60 },
      'uploading_assets': { status: 'processing' as const, step: 'Uploading assets', progress: 80 },
      'completed': { status: 'completed' as const, step: 'Completed', progress: 100 },
      'failed': { status: 'failed' as const, step: 'Failed', progress: 0 }
    };
    return statusMapping[dbStatus] || statusMapping['pending'];
  };

  // Use SSE status for active processing, database status for completed/failed
  const shouldUseSSE = summary.processingStatus && !['completed', 'failed'].includes(summary.processingStatus);
  const dbStatusInfo = getDatabaseStatusInfo(summary.processingStatus);

  const displayStatus = shouldUseSSE && inngestStatus?.status ? inngestStatus.status : dbStatusInfo.status;
  const statusInfo = getStatusInfo(displayStatus);
  const displayProgress = shouldUseSSE && inngestStatus?.progress !== undefined ? inngestStatus.progress : dbStatusInfo.progress;
  const currentStep = shouldUseSSE && inngestStatus?.currentStep ? inngestStatus.currentStep : dbStatusInfo.step;
  const StatusIcon = statusInfo.icon;

  // Define all processing steps in ACTUAL pipeline execution order
  const allSteps = ['Extracting transcript', 'Generating AI summary', 'Creating visual highlights', 'Uploading assets'];

  // Check if individual steps succeeded by examining the data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const checkIndividualStepSuccess = (stepName: string, videoSummary: any): boolean => {
    switch (stepName) {
      case 'Extracting transcript':
        // Check if transcript exists and is not empty
        return Boolean(videoSummary.transcript && typeof videoSummary.transcript === 'string' && videoSummary.transcript.trim().length > 0);

      case 'Generating AI summary':
        // Check if AI-generated content exists with correct nested structure
        const aiContent = videoSummary.aiGeneratedContent;
        const summaryObj = aiContent?.summary;
        const actualSummary = summaryObj?.summary;

        // The actual summary text is at aiGeneratedContent.summary.summary
        return Boolean(actualSummary && typeof actualSummary === 'string' && actualSummary.trim().length > 0);

      case 'Creating visual highlights':
        // Check if keyframes were extracted successfully
        const keyframes = videoSummary.aiGeneratedContent?.keyframeIntervals;
        return Boolean(keyframes && Array.isArray(keyframes) && keyframes.length > 0);

      case 'Uploading assets':
        // This step is harder to verify without checking blob storage
        // For now, assume it succeeded if we got this far and other steps worked
        return true;

      default:
        return true;
    }
  };

  // Get step states for UI display - CONSISTENT validation for all scenarios
  const getStepStates = () => {
    const states: Record<string, 'pending' | 'current' | 'completed' | 'failed'> = {};

    // Always validate completed steps against actual data - no exceptions!
    const validateStep = (stepName: string): 'completed' | 'failed' => {
      return checkIndividualStepSuccess(stepName, summary) ? 'completed' : 'failed';
    };

    // For SSE (actively processing videos)
    if (shouldUseSSE && inngestStatus) {
      const completed = inngestStatus.completedSteps || [];
      const current = inngestStatus.currentStep;
      const isJobFailed = inngestStatus.status === 'failed';

      allSteps.forEach((step) => {
        if (completed.includes(step)) {
          // ALWAYS validate completed steps - even during processing
          states[step] = validateStep(step);
        } else if (current === step) {
          states[step] = isJobFailed ? 'failed' : 'current';
        } else {
          states[step] = 'pending';
        }
      });
      return states;
    }

    // For database-based status (completed/failed/non-SSE videos)
    const dbStatus = summary.processingStatus;

    if (dbStatus === 'completed') {
      // All steps should be validated for completed videos
      allSteps.forEach((step) => {
        states[step] = validateStep(step);
      });
    } else if (dbStatus === 'failed') {
      // For failed jobs, validate what we can and mark the rest as failed
      allSteps.forEach((step) => {
        states[step] = validateStep(step);
      });
    } else {
      // For processing states (extracting_transcript, generating_summary, etc.)
      const statusToStepIndex: Record<string, number> = {
        'pending': -1,
        'extracting_transcript': 0,
        'generating_summary': 1,
        'extracting_keyframes': 2,
        'uploading_assets': 3
      };

      const currentStepIndex = statusToStepIndex[dbStatus] ?? -1;

      allSteps.forEach((step, index) => {
        if (index < currentStepIndex) {
          // Previous steps - validate against data
          states[step] = validateStep(step);
        } else if (index === currentStepIndex) {
          states[step] = 'current';
        } else {
          states[step] = 'pending';
        }
      });
    }

    return states;
  };

  const stepStates = getStepStates();
  const errorMessage = inngestStatus?.warnings?.[0] || summary.processingError;

  // Get specific error message for a failed step
  const getStepErrorMessage = (stepName: string): string => {
    switch (stepName) {
      case 'Extracting transcript':
        return 'No transcript available for this video';
      case 'Generating AI summary':
        return 'Failed to generate AI summary';
      case 'Creating visual highlights':
        return 'No keyframes could be extracted';
      case 'Uploading assets':
        return 'Failed to upload assets to storage';
      default:
        return errorMessage || 'Step failed';
    }
  };

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
                <TooltipProvider>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Video metadata extracted</span>
                  </div>
                  {allSteps.map((stepName) => {
                    const stepState = stepStates[stepName] || 'pending';

                    const getStepStyle = (state: string) => {
                      switch (state) {
                        case 'completed':
                          return { dial: "bg-green-500", text: "", icon: null };
                        case 'current':
                          return { dial: "bg-blue-500 animate-pulse", text: "font-medium", icon: <RefreshCw className="h-3 w-3 animate-spin text-blue-500" /> };
                        case 'failed':
                          return { dial: "bg-red-500", text: "text-red-600", icon: <XCircle className="h-3 w-3 text-red-500" /> };
                        case 'pending':
                        default:
                          return { dial: "bg-gray-300", text: "", icon: null };
                      }
                    };

                    const style = getStepStyle(stepState);

                    return (
                      <div key={stepName} className="flex items-center gap-3 text-sm">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`w-2 h-2 rounded-full ${style.dial}`} />
                          </TooltipTrigger>
                          {stepState === 'failed' && (
                            <TooltipContent>
                              <p className="text-xs max-w-xs">{getStepErrorMessage(stepName)}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                        <span className={style.text}>
                          {stepName}
                        </span>
                        {style.icon}
                      </div>
                    );
                  })}
                </TooltipProvider>
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};