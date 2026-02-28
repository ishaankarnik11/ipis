import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface UploadProgressState {
  stage: string;
  percent: number;
  isComplete: boolean;
  error: string | null;
  connectionLost: boolean;
}

const INITIAL_STATE: UploadProgressState = {
  stage: '',
  percent: 0,
  isComplete: false,
  error: null,
  connectionLost: false,
};

/**
 * SSE-based hook for tracking upload progress (billing recalculation).
 * Uses browser-native EventSource — NOT TanStack Query.
 * One reconnect attempt after 3s, then sets connectionLost.
 */
export function useUploadProgress(uploadEventId: string | null): UploadProgressState {
  const [state, setState] = useState<UploadProgressState>(INITIAL_STATE);
  const queryClient = useQueryClient();
  const retryCountRef = useRef(0);

  useEffect(() => {
    if (!uploadEventId) {
      setState(INITIAL_STATE);
      return;
    }

    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      es = new EventSource(`/api/v1/uploads/progress/${uploadEventId}`);

      es.onmessage = (event) => {
        const data = JSON.parse(event.data);
        retryCountRef.current = 0;

        switch (data.type) {
          case 'UPLOAD_PROGRESS':
            setState({
              stage: data.stage ?? '',
              percent: data.percent ?? 0,
              isComplete: false,
              error: null,
              connectionLost: false,
            });
            break;
          case 'RECALC_COMPLETE':
            setState({
              stage: 'Complete',
              percent: 100,
              isComplete: true,
              error: null,
              connectionLost: false,
            });
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['dashboards'] });
            queryClient.invalidateQueries({ queryKey: ['uploads', 'history'] });
            queryClient.invalidateQueries({ queryKey: ['uploads', 'latestByType'] });
            es?.close();
            break;
          case 'RECALC_FAILED':
            setState((prev) => ({
              ...prev,
              stage: 'Failed',
              error: data.error ?? 'Recalculation failed',
              connectionLost: false,
            }));
            es?.close();
            break;
        }
      };

      es.onerror = () => {
        es?.close();
        if (retryCountRef.current < 1) {
          retryCountRef.current++;
          retryTimeout = setTimeout(connect, 3000);
        } else {
          setState((prev) => ({ ...prev, connectionLost: true }));
        }
      };
    }

    connect();

    return () => {
      es?.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [uploadEventId, queryClient]);

  return state;
}
