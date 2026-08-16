import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { StreamConfig, StreamStatusInfo } from '../types.js';
import { api, getStoredToken } from '../services/api.js';
import { useAuth } from './AuthContext.js';

interface StreamContextType {
  status: StreamStatusInfo | null;
  isLoading: boolean;
  isActionPending: boolean;
  actionMessage: string | null;
  error: string | null;
  startStream: (config: StreamConfig) => Promise<boolean>;
  stopStream: () => Promise<boolean>;
  restartStream: () => Promise<boolean>;
  refreshStatus: () => Promise<void>;
  clearError: () => void;
}

const defaultStatus: StreamStatusInfo = {
  status: 'IDLE',
  active: false,
  loop: true,
  quality: '1080p',
  bitrate: '4000k',
  fps: 30,
  hasAudio: true,
  autoReconnect: true,
  uptimeSeconds: 0,
  uptimeFormatted: '00:00:00',
  reconnectCount: 0,
  currentLoopCount: 1,
};

const StreamContext = createContext<StreamContextType | undefined>(undefined);

export const StreamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<StreamStatusInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionPending, setIsActionPending] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.getStreamStatus();
      setStatus(data.status);
    } catch (err: any) {
      console.warn('[StreamContext] Polling status failed:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Set up EventSource SSE connection for real-time push updates
  useEffect(() => {
    if (!isAuthenticated) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setStatus(null);
      return;
    }

    fetchStatus();

    const token = getStoredToken();
    if (!token) return;

    try {
      const sse = new EventSource(`/api/stream/status/live?token=${encodeURIComponent(token)}`);
      eventSourceRef.current = sse;

      sse.onmessage = (event) => {
        try {
          const newStatus = JSON.parse(event.data) as StreamStatusInfo;
          setStatus(newStatus);
          setIsLoading(false);
        } catch (e) {
          // ignore
        }
      };

      sse.onerror = () => {
        // SSE might drop if navigating or reconnecting, fallback to polling
        sse.close();
        eventSourceRef.current = null;
      };
    } catch (err) {
      console.warn('[StreamContext] Failed to initialize SSE, using polling.');
    }

    // Backup polling timer every 3 seconds to guarantee freshness
    const pollInterval = setInterval(() => {
      fetchStatus();
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isAuthenticated, fetchStatus]);

  const startStream = async (config: StreamConfig): Promise<boolean> => {
    setIsActionPending(true);
    setActionMessage('Initializing FFmpeg 24/7 stream process...');
    setError(null);
    try {
      const result = await api.startStream(config);
      setStatus(result.status);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to start stream.');
      return false;
    } finally {
      setIsActionPending(false);
      setActionMessage(null);
      fetchStatus();
    }
  };

  const stopStream = async (): Promise<boolean> => {
    setIsActionPending(true);
    setActionMessage('Gracefully terminating stream process...');
    setError(null);
    try {
      const result = await api.stopStream();
      setStatus(result.status);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to stop stream.');
      return false;
    } finally {
      setIsActionPending(false);
      setActionMessage(null);
      fetchStatus();
    }
  };

  const restartStream = async (): Promise<boolean> => {
    setIsActionPending(true);
    setActionMessage('Restarting 24/7 RTMP stream...');
    setError(null);
    try {
      const result = await api.restartStream();
      setStatus(result.status);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to restart stream.');
      return false;
    } finally {
      setIsActionPending(false);
      setActionMessage(null);
      fetchStatus();
    }
  };

  const clearError = () => setError(null);

  return (
    <StreamContext.Provider
      value={{
        status: status || defaultStatus,
        isLoading,
        isActionPending,
        actionMessage,
        error,
        startStream,
        stopStream,
        restartStream,
        refreshStatus: fetchStatus,
        clearError,
      }}
    >
      {children}
    </StreamContext.Provider>
  );
};

export const useStream = (): StreamContextType => {
  const context = useContext(StreamContext);
  if (!context) {
    throw new Error('useStream must be used within a StreamProvider');
  }
  return context;
};
