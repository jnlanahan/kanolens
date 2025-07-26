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

export function usePolling({ 
  sessionId, 
  enabled = true, 
  interval = 2000 
}: UsePollingOptions) {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: [`/api/analysis/sessions/${sessionId}/progress`],
    queryFn: async (): Promise<ProgressData> => {
      if (!sessionId) throw new Error('No session ID');
      
      try {
        const response = await apiRequest("GET", `/api/analysis/sessions/${sessionId}/progress`);
        const data = await response.json();
        console.log('[Polling] Progress update:', data);
        return data;
      } catch (error) {
        console.error('[Polling] Error:', error);
        throw error;
      }
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
    isConnected: !error,
    connectionError: error?.message || null,
    refetch,
  };
}