import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import Header from "@/components/Layout/Header";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import type { AnalysisSession } from "@shared/schema";

export default function Home() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(
    id ? parseInt(id) : null
  );

  // Fetch user sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery<AnalysisSession[]>({
    queryKey: ["/api/analysis/sessions"],
    retry: false,
  });

  // Fetch current session details
  const { data: currentSession } = useQuery({
    queryKey: ["/api/analysis/sessions", currentSessionId],
    enabled: !!currentSessionId,
    retry: false,
  });

  // Create new session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: { title: string; products: string[]; targetCustomer?: string }) => {
      const response = await apiRequest("POST", "/api/analysis/sessions", data);
      return response.json();
    },
    onSuccess: (newSession: AnalysisSession) => {
      setCurrentSessionId(newSession.id);
      queryClient.invalidateQueries({ queryKey: ["/api/analysis/sessions"] });
      toast({
        title: "Analysis Session Created",
        description: "Your new competitive analysis session is ready.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Create Session",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-create first session if none exists
  useEffect(() => {
    if (!sessionsLoading && sessions && Array.isArray(sessions)) {
      if (sessions.length === 0 && !currentSessionId) {
        createSessionMutation.mutate({
          title: "New Competitive Analysis",
          products: [],
          targetCustomer: "Product Managers",
        });
      } else if (!currentSessionId && sessions.length > 0) {
        setCurrentSessionId(sessions[0].id);
      }
    }
  }, [sessions, sessionsLoading, currentSessionId, createSessionMutation]);

  const handleCreateSession = () => {
    createSessionMutation.mutate({
      title: `Analysis ${new Date().toLocaleDateString()}`,
      products: [],
      targetCustomer: "Product Managers",
    });
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      <Header 
        onCreateSession={handleCreateSession}
        sessions={sessions || []}
        currentSessionId={currentSessionId}
        onSessionSelect={setCurrentSessionId}
      />
      
      {/* Analysis Setup Content */}
      <div className="flex-1 flex justify-center items-start pt-8">
        <div className="max-w-4xl w-full px-4">
          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
            <p className="text-blue-800 dark:text-blue-200">
              Our AI will research your products and suggest additional competitors and key features to analyze. You'll be able to 
              review and modify these suggestions before we create your Kano Model comparison.
            </p>
          </div>
          
          {/* Setup Complete Message */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Analysis Session Active
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This analysis session is ready. Use the navigation above to view results or start a new analysis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
