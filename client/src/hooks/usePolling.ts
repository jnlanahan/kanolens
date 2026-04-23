import { useState, useEffect, useCallback } from 'react';
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ProgressData {
  currentStep: string;
  status: string;
  progress: number;
  message?: string;
}

interface UsePollingOptions {
  sessionId: number | null;
  enabled?: boolean;
  interval?: number;
}

// Adaptive polling intervals based on analysis stage
const POLLING_INTERVALS = {
  discovery: 1000,      // Fast during setup
  research: 1000,       // Fast during active research
  categorization: 2000, // Medium during categorization
  analysis: 3000,       // Slower during analysis
  table_creation: 3000, // Slower during table creation
  completed: 30000,     // Very slow when completed
  error: 5000,          // Moderate on errors
  default: 2000         // Default fallback
};

export function usePolling({ 
  sessionId, 
  enabled = true, 
  interval: defaultInterval = 2000 
}: UsePollingOptions) {
  const [adaptiveInterval, setAdaptiveInterval] = useState(defaultInterval);
  const [retryCount, setRetryCount] = useState(0);

  // Calculate adaptive interval based on progress data
  const getAdaptiveInterval = useCallback((progressData: ProgressData | undefined) => {
    if (!progressData) return defaultInterval;
    
    // Use specific intervals for known steps
    const stepInterval = POLLING_INTERVALS[progressData.currentStep as keyof typeof POLLING_INTERVALS];
    if (stepInterval) return stepInterval;
    
    // If status is completed, use slow interval
    if (progressData.status === 'completed') return POLLING_INTERVALS.completed;
    
    // If status is error, use error interval
    if (progressData.status === 'error') return POLLING_INTERVALS.error;
    
    return POLLING_INTERVALS.default;
  }, [defaultInterval]);

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: [`/api/analysis/sessions/${sessionId}/progress`],
    queryFn: async (): Promise<ProgressData> => {
      if (!sessionId) throw new Error('No session ID');
      
      try {
        const response = await apiRequest("GET", `/api/analysis/sessions/${sessionId}/progress`);
        const data = await response.json();
        console.log('[Polling] Progress update:', data);
        
        // Reset retry count on successful fetch
        setRetryCount(0);
        
        return data;
      } catch (error) {
        console.error('[Polling] Error:', error);
        
        // Increment retry count for exponential backoff
        setRetryCount(prev => prev + 1);
        
        throw error;
      }
    },
    enabled: enabled && !!sessionId,
    refetchInterval: adaptiveInterval,
    retry: (failureCount, error) => {
      // Implement exponential backoff with max retries
      return failureCount < 3;
    },
    staleTime: 0, // Always fetch fresh data
  });

  // Update interval based on progress data and retry count
  useEffect(() => {
    let newInterval = getAdaptiveInterval(data);
    
    // Apply exponential backoff if there are errors
    if (retryCount > 0) {
      newInterval = Math.min(newInterval * Math.pow(2, retryCount), 30000);
    }
    
    if (newInterval !== adaptiveInterval) {
      console.log(`[Polling] Adjusting interval from ${adaptiveInterval}ms to ${newInterval}ms`);
      setAdaptiveInterval(newInterval);
    }
  }, [data, retryCount, adaptiveInterval, getAdaptiveInterval]);

  return {
    data,
    error,
    isLoading,
    isConnected: !error,
    connectionError: error?.message || null,
    refetch,
    currentInterval: adaptiveInterval,
  };
}