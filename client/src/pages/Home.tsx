import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import StandardHeader from "@/components/Layout/StandardHeader";
import PageLayout from "@/components/Layout/PageLayout";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { Plus, Home as HomeIcon, Settings, LogOut, User } from "lucide-react";
import type { AnalysisSession } from "@shared/schema";

export default function Home() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
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
  const { data: currentSession } = useQuery<AnalysisSession>({
    queryKey: [`/api/analysis/sessions/${currentSessionId}`],
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

  const handleSignOut = async () => {
    try {
      // Call the JWT logout endpoint
      await apiRequest("POST", "/api/auth/logout");
      
      // Clear local authentication state
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to home page
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out error:", error);
      // Even if the API call fails, clear local storage and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = "/";
    }
  };

  const headerActions = (
    <>
      <Button 
        onClick={handleCreateSession}
        size="sm" 
        className="flex items-center gap-2"
        disabled={createSessionMutation.isPending}
      >
        <Plus className="w-4 h-4" />
        New Analysis
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setLocation("/dashboard")}
        className="flex items-center gap-2"
      >
        <HomeIcon className="w-4 h-4" />
        Dashboard
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setLocation("/account")}
        className="flex items-center gap-2"
      >
        <Settings className="w-4 h-4" />
        Account
      </Button>
      <Button 
        variant="ghost" 
        size="sm"
        onClick={handleSignOut}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </Button>
    </>
  );

  return (
    <PageLayout>
      <StandardHeader 
        title="kanolens" 
        subtitle={currentSession ? `Analysis: ${currentSession.title}` : "Analysis Session"}
        actions={headerActions}
      />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
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
          
          {currentSession && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 max-w-md mx-auto">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {currentSession.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Status: {currentSession.status} • Step: {currentSession.currentStep}
              </p>
              <Button 
                onClick={() => setLocation(`/analysis/${currentSession.id}/results`)}
                className="w-full"
              >
                View Analysis Results
              </Button>
            </div>
          )}
        </div>
      </main>
    </PageLayout>
  );
}
