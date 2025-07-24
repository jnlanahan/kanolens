import { useQuery } from "@tanstack/react-query";

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

export function usePolling({ 
  sessionId, 
  enabled = true, 
  interval = 2000 
}: UsePollingOptions) {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: [`/api/analysis/sessions/${sessionId}/progress`],
    queryFn: async (): Promise<ProgressData> => {
      if (!sessionId) throw new Error('No session ID');
      
      const response = await fetch(`/api/analysis/sessions/${sessionId}/progress`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[Polling] Progress update:', data);
      return data;
    },
    enabled: enabled && !!sessionId,
    refetchInterval: interval,
    retry: false,
    staleTime: 0, // Always fetch fresh data
  });

  return {
    data,
    error,
    isLoading,
    isConnected: true, // Always connected with HTTP
    connectionError: error?.message || null,
    refetch,
  };
}