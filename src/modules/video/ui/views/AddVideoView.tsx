"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Video, ArrowLeft, Play } from "lucide-react";
import { processYouTubeVideo } from "../../actions/video.actions";
import { YouTubeService } from "../../services/youtube.service";

export const AddVideoView = () => {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!url.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }

    startTransition(async () => {
      const result = await processYouTubeVideo(url);
      
      if (result.success && result.summaryId) {
        router.push(`/videos/${result.summaryId}`);
      } else {
        setError(result.error || "An error occurred");
      }
    });
  };

  const handleBack = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Add YouTube Video</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Process YouTube Video
            </CardTitle>
            <CardDescription>
              Enter a YouTube URL to extract transcript, generate AI summary, and create keyframes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="youtube-url">YouTube URL</Label>
                <Input
                  id="youtube-url"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (error) setError("");
                  }}
                  disabled={isPending}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Supports youtube.com/watch, youtu.be, and youtube.com/embed URLs
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isPending || !url.trim()}
                  className="flex-1"
                >
                  {isPending ? "Processing..." : "Process Video"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUrl("")}
                  disabled={isPending}
                >
                  Clear
                </Button>
              </div>
            </form>

            {/* Preview Section */}
            {url && YouTubeService.validateYouTubeUrl(url) && (
              <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-3">Preview</h4>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-32 h-18 bg-muted rounded-lg overflow-hidden">
                      <img
                        src={`https://img.youtube.com/vi/${YouTubeService.extractVideoId(url)}/hqdefault.jpg`}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to medium quality thumbnail if high quality fails
                          const target = e.target as HTMLImageElement;
                          if (target.src.includes('hqdefault')) {
                            target.src = `https://img.youtube.com/vi/${YouTubeService.extractVideoId(url)}/mqdefault.jpg`;
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground mb-1">
                      <span className="font-medium">Video ID:</span>{" "}
                      <code className="bg-background px-1 py-0.5 rounded text-xs">
                        {YouTubeService.extractVideoId(url)}
                      </code>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Thumbnail will be fetched from YouTube
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">What happens next?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
              <p>Extract video metadata and transcript</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
              <p>Generate AI-powered summary and key points</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
              <p>Extract keyframes and create visual diagrams</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
              <p>Suggest relevant tags and categories</p>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};