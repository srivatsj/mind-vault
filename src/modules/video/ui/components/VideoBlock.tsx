"use client";

import { createReactBlockSpec } from "@blocknote/react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  ImageIcon,
  Calendar,
  User,
  ExternalLink
} from "lucide-react";

interface VideoBlockProps {
  videoId: string;
  title: string;
  youtubeUrl: string;
  channelName?: string;
  duration?: number;
  createdAt: string;
  keyframes?: Array<{
    id: string;
    timestamp: number;
    blobUrl: string;
    description?: string;
    confidence?: number;
    category?: string;
  }>;
  keyPoints?: string[];
}

const formatDuration = (seconds: number | undefined): string => {
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

export const VideoBlock = createReactBlockSpec(
  {
    type: "video",
    propSchema: {
      videoData: {
        default: "",
      },
    },
    content: "none",
  },
  {
    render: (props) => {
      let videoData: VideoBlockProps | null = null;

      try {
        if (props.block.props.videoData) {
          videoData = JSON.parse(props.block.props.videoData as string);
        }
      } catch (error) {
        console.error("Failed to parse video data:", error);
        return (
          <div className="p-4 border border-red-200 rounded-lg bg-red-50">
            <p className="text-red-600">Error loading video data</p>
          </div>
        );
      }

      if (!videoData) {
        return (
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <p className="text-gray-600">No video data available</p>
          </div>
        );
      }

      const youtubeId = videoData.youtubeUrl.match(
        /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&\n?#]+)/
      )?.[1];

      return (
        <div className="not-prose w-full space-y-6 pt-8">
          {/* Video Header */}
          <div className="space-y-4 text-center">
            <h2 className="text-2xl font-semibold">{videoData.title}</h2>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              {videoData.channelName && (
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {videoData.channelName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDuration(videoData.duration)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(videoData.createdAt).toLocaleDateString()}
              </span>
              <a
                href={videoData.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="h-4 w-4" />
                Watch on YouTube
              </a>
            </div>
          </div>

          {/* Video Embed */}
          {youtubeId && (
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?modestbranding=1&rel=0&showinfo=0&controls=1&iv_load_policy=3&disablekb=1`}
                title={videoData.title}
                className="w-full h-full"
                allowFullScreen
                style={{ border: 0 }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          )}

          {/* Key Moments - Single Flow Layout */}
          {videoData.keyframes && videoData.keyframes.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Key Moments ({videoData.keyframes.length})
              </h3>
              <div className="space-y-6 mt-6">
                {videoData.keyframes.map((keyframe) => (
                  <div key={keyframe.id} className="flex gap-4 items-start">
                    <div className="flex-shrink-0">
                      <div className="w-32 h-20 bg-muted rounded overflow-hidden">
                        <Image
                          src={keyframe.blobUrl}
                          alt={keyframe.description || `Keyframe at ${formatTimestamp(keyframe.timestamp)}`}
                          className="w-full h-full object-cover"
                          width={128}
                          height={80}
                        />
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-primary">
                          {formatTimestamp(keyframe.timestamp)}
                        </span>
                        {keyframe.confidence && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round(keyframe.confidence * 100)}%
                          </Badge>
                        )}
                        {keyframe.category && (
                          <Badge variant="secondary" className="text-xs">
                            {keyframe.category}
                          </Badge>
                        )}
                      </div>
                      {keyframe.description && (
                        <p className="text-sm text-muted-foreground">
                          {keyframe.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    },
  }
);