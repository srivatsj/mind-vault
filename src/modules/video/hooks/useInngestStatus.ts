import { useState, useEffect, useRef } from 'react';

interface InngestStatus {
  currentStep: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  warnings: string[];
  completedSteps: string[];
  _close?: boolean; // Internal flag to indicate stream closure
}

interface UseInngestStatusResult {
  status: InngestStatus | null;
  loading: boolean;
  error: string | null;
}

export function useInngestStatus(eventId: string | null | undefined, enabled = true): UseInngestStatusResult {
  const [status, setStatus] = useState<InngestStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!eventId || !enabled) {
      setStatus(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Create EventSource connection for real-time updates
    const eventSource = new EventSource(`/api/inngest/${eventId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data: InngestStatus = JSON.parse(event.data);
        setStatus(data);
        setLoading(false);
        setError(null);

        // Close connection if processing is complete
        if (data._close || data.status === 'completed' || data.status === 'failed') {
          eventSource.close();
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
        setError('Error parsing server data');
        setLoading(false);
      }
    };

    eventSource.onerror = (event) => {
      console.error('SSE connection error:', event);
      
      // Check if it's a connection error
      if (eventSourceRef.current && eventSourceRef.current.readyState === EventSource.CLOSED) {
        setError('Connection lost');
      } else {
        setError('Connection error');
      }
      setLoading(false);
    };

    eventSource.onopen = () => {
      setError(null);
    };

    // Cleanup on unmount or eventId/enabled change
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [eventId, enabled]);

  return { status, loading, error };
}