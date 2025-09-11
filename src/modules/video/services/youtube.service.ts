export interface YouTubeVideoInfo {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  duration: number; // in seconds
  thumbnailUrl: string;
}

export interface YouTubeError {
  message: string;
  code?: string;
}

export class YouTubeService {
  private static readonly API_KEY = process.env.YOUTUBE_API_KEY;
  private static readonly BASE_URL = "https://www.googleapis.com/youtube/v3";

  static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  static validateYouTubeUrl(url: string): boolean {
    return this.extractVideoId(url) !== null;
  }

  static async getVideoInfo(videoId: string): Promise<YouTubeVideoInfo> {
    if (!this.API_KEY) {
      throw new Error("YouTube API key not configured");
    }

    const url = `${this.BASE_URL}/videos?id=${videoId}&key=${this.API_KEY}&part=snippet,contentDetails`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      throw new Error("Video not found or unavailable");
    }

    const video = data.items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;

    return {
      id: videoId,
      title: snippet.title,
      description: snippet.description || "",
      channelTitle: snippet.channelTitle,
      duration: this.parseDuration(contentDetails.duration),
      thumbnailUrl: snippet.thumbnails?.maxres?.url || 
                   snippet.thumbnails?.high?.url || 
                   snippet.thumbnails?.medium?.url || "",
    };
  }

  private static parseDuration(duration: string): number {
    // Parse ISO 8601 duration format (PT1H2M10S) to seconds
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || "0");
    const minutes = parseInt(match[2] || "0");
    const seconds = parseInt(match[3] || "0");

    return hours * 3600 + minutes * 60 + seconds;
  }

  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }
}