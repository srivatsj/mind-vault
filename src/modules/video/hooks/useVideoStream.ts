import { useState, useEffect, useCallback } from 'react';
import type { VideoSummaryWithRelations } from '../data/video-summary.dao';

interface UseVideoStreamResult {
  summary: VideoSummaryWithRelations | null;
  loading: boolean;
  error: string;
}

export function useVideoStream(summaryId: string): UseVideoStreamResult {
  const [summary, setSummary] = useState<VideoSummaryWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchVideoData = useCallback(async () => {
    try {
      if (loading) {
        setError('');
      }

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
  }, [summaryId, loading]);

  // Initial fetch
  useEffect(() => {
    if (!summaryId) return;
    fetchVideoData();
  }, [summaryId, fetchVideoData]);

  // Auto-polling for processing videos
  useEffect(() => {
    if (!summary || ['completed', 'failed'].includes(summary.processingStatus)) {
      return;
    }

    const interval = setInterval(() => {
      fetchVideoData();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [summary, fetchVideoData]);

  return { summary, loading, error };
}