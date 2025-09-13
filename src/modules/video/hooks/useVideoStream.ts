import { useState, useEffect } from 'react';

interface VideoSummary {
  id: string;
  title: string;
  description: string | null;
  channelName: string | null;
  duration: number | null;
  thumbnailUrl: string | null;
  youtubeUrl: string;

  processingStatus: "pending" | "extracting_transcript" | "extracting_keyframes" | "uploading_assets" | "generating_summary" | "completed" | "failed";
  processingError?: string | null;
  jobEventId?: string | null;
  createdAt: string | Date;
}

interface UseVideoStreamResult {
  summary: VideoSummary | null;
  loading: boolean;
  error: string;
}

export function useVideoStream(summaryId: string): UseVideoStreamResult {
  const [summary, setSummary] = useState<VideoSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!summaryId) return;

    const fetchVideoData = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch(`/api/videos/${summaryId}`);
        
        if (!response.ok) {
          if (response.status === 401) {
            setError('Unauthorized');
          } else if (response.status === 404) {
            setError('Video not found');
          } else {
            setError('Failed to fetch video data');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setSummary(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching video data:', err);
        setError('Failed to fetch video data');
        setLoading(false);
      }
    };

    fetchVideoData();
  }, [summaryId]);

  return { summary, loading, error };
}