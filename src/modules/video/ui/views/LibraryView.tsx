"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  Video,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  ExternalLink,
  Calendar,
  User
} from "lucide-react";
import { getAllVideoSummaries } from "../../actions/video.actions";

interface VideoSummary {
  id: string;
  title: string;
  description: string | null;
  channelName: string | null;
  duration: number | null;
  thumbnailUrl: string | null;
  youtubeUrl: string;
  processingStatus: "pending" | "processing" | "completed" | "failed";
  processingError?: string | null;
  createdAt: string | Date;
}

export const LibraryView = () => {
  const [videos, setVideos] = useState<VideoSummary[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<VideoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const router = useRouter();

  const loadVideos = async () => {
    try {
      const result = await getAllVideoSummaries();
      if (result.success && Array.isArray(result.data)) {
        setVideos(result.data as VideoSummary[]);
        setFilteredVideos(result.data as VideoSummary[]);
      } else {
        setError(result.error || "Failed to load videos");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  useEffect(() => {
    let filtered = videos;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(video =>
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.channelName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(video => video.processingStatus === statusFilter);
    }

    setFilteredVideos(filtered);
  }, [videos, searchQuery, statusFilter]);

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

  const formatDate = (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return {
          icon: Clock,
          label: "Queued",
          color: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
          iconColor: "text-yellow-600"
        };
      case "processing":
        return {
          icon: RefreshCw,
          label: "Processing",
          color: "bg-blue-500/20 text-blue-700 border-blue-500/30",
          iconColor: "text-blue-600"
        };
      case "completed":
        return {
          icon: CheckCircle,
          label: "Completed",
          color: "bg-green-500/20 text-green-700 border-green-500/30",
          iconColor: "text-green-600"
        };
      case "failed":
        return {
          icon: AlertCircle,
          label: "Failed",
          color: "bg-red-500/20 text-red-700 border-red-500/30",
          iconColor: "text-red-600"
        };
      default:
        return {
          icon: Clock,
          label: "Unknown",
          color: "bg-gray-500/20 text-gray-700 border-gray-500/30",
          iconColor: "text-gray-600"
        };
    }
  };

  const getStatusCounts = () => {
    return {
      all: videos.length,
      pending: videos.filter(v => v.processingStatus === "pending").length,
      processing: videos.filter(v => v.processingStatus === "processing").length,
      completed: videos.filter(v => v.processingStatus === "completed").length,
      failed: videos.filter(v => v.processingStatus === "failed").length,
    };
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="flex h-16 items-center px-6">
            <h1 className="text-xl font-semibold">Library</h1>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading your videos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="flex h-16 items-center px-6">
            <h1 className="text-xl font-semibold">Library</h1>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Error Loading Library
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={loadVideos} className="w-full">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="flex h-16 items-center justify-between px-6">
          <h1 className="text-xl font-semibold">Library</h1>
          <Button onClick={() => router.push("/add")} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Video
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b bg-muted/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search videos, channels, or descriptions..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              className="gap-1"
            >
              All ({statusCounts.all})
            </Button>
            <Button
              variant={statusFilter === "completed" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("completed")}
              className="gap-1"
            >
              <CheckCircle className="h-3 w-3" />
              Completed ({statusCounts.completed})
            </Button>
            <Button
              variant={statusFilter === "processing" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("processing")}
              className="gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Processing ({statusCounts.processing})
            </Button>
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("pending")}
              className="gap-1"
            >
              <Clock className="h-3 w-3" />
              Queued ({statusCounts.pending})
            </Button>
            {statusCounts.failed > 0 && (
              <Button
                variant={statusFilter === "failed" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("failed")}
                className="gap-1"
              >
                <AlertCircle className="h-3 w-3" />
                Failed ({statusCounts.failed})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {filteredVideos.length === 0 ? (
          <div className="text-center py-12">
            <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {videos.length === 0 ? "No videos yet" : "No videos found"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {videos.length === 0 
                ? "Start by adding your first YouTube video to process"
                : "Try adjusting your search or filter criteria"}
            </p>
            {videos.length === 0 && (
              <Button onClick={() => router.push("/add")} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Video
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredVideos.map((video) => {
              const statusInfo = getStatusInfo(video.processingStatus);
              const StatusIcon = statusInfo.icon;
              
              return (
                <Card 
                  key={video.id} 
                  className="group hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-primary/20"
                  onClick={() => router.push(`/videos/${video.id}`)}
                >
                  <CardHeader className="p-0">
                    <div className="aspect-video bg-muted rounded-t-lg overflow-hidden relative">
                      {video.thumbnailUrl ? (
                        <Image
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          width={320}
                          height={180}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      
                      {/* Duration badge */}
                      {video.duration && (
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
                          {formatDuration(video.duration)}
                        </div>
                      )}
                      
                      {/* Status badge */}
                      <div className="absolute top-2 left-2">
                        <Badge className={`gap-1 text-xs ${statusInfo.color}`}>
                          <StatusIcon className={`h-3 w-3 ${statusInfo.iconColor} ${video.processingStatus === 'processing' ? 'animate-spin' : ''}`} />
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h3 className="font-medium line-clamp-2 text-sm leading-tight group-hover:text-primary transition-colors">
                        {video.title}
                      </h3>
                      
                      {video.channelName && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="truncate">{video.channelName}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(video.createdAt)}</span>
                      </div>
                    </div>
                  </CardContent>
                  
                  <div className="px-4 pb-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/videos/${video.id}`);
                        }}
                      >
                        <Video className="h-3 w-3" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(video.youtubeUrl, "_blank");
                        }}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};