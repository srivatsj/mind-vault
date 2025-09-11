import { useState, useEffect, useRef } from 'react';

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

interface UseVideoStreamResult {
  summary: VideoSummary | null;
  loading: boolean;
  error: string;
}

export function useVideoStream(summaryId: string): UseVideoStreamResult {
  const [summary, setSummary] = useState<VideoSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!summaryId) return;

    // Create EventSource connection
    const eventSource = new EventSource(`/api/videos/${summaryId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setSummary(data);
        setLoading(false);
        setError('');
      } catch (err) {
        console.error('Error parsing SSE data:', err);
        setError('Error parsing server data');
        setLoading(false);
      }
    };

    eventSource.onerror = (event) => {
      console.error('SSE connection error:', event);
      
      // Check if it's an authentication error (401)
      if (eventSource.readyState === EventSource.CLOSED) {
        setError('Connection lost');
      }
      setLoading(false);
    };

    eventSource.onopen = () => {
      setError('');
    };

    // Cleanup on unmount or summaryId change
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [summaryId]);

  // Also cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return { summary, loading, error };
}