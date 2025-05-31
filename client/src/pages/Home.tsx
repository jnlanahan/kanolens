import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AnalysisSession, ChatMessage, KanoTableData } from "@shared/schema";
import Header from "@/components/Layout/Header";
import ChatInterface from "@/components/Chat/ChatInterface";
import SuggestionPanel from "@/components/Chat/SuggestionPanel";
import KanoTable from "@/components/KanoTable/KanoTable";
import ProgressTracker from "@/components/ProgressTracker/ProgressTracker";

export default function Home() {
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [showProgressTracker, setShowProgressTracker] = useState(false);
  const [showChatInterface, setShowChatInterface] = useState(false);
  const { toast } = useToast();

  // Fetch all sessions
  const { data: sessions, isLoading: sessionLoading } = useQuery({
    queryKey: ["/api/analysis/sessions"],
    retry: false,
  });

  // Fetch chat messages for current session
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: [`/api/analysis/sessions/${currentSessionId}/messages`],
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

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; metadata?: any }) => {
      const response = await apiRequest(
        "POST", 
        `/api/analysis/sessions/${currentSessionId}/messages`, 
        data
      );
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/analysis/sessions/${currentSessionId}/messages`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/analysis/sessions"] 
      });

      // Force refresh if table data was created
      if (data?.sessionUpdate?.data?.tableData) {
        queryClient.removeQueries({ queryKey: ["/api/analysis/sessions"] });
        setTimeout(() => {
          queryClient.refetchQueries({ 
            queryKey: ["/api/analysis/sessions"] 
          });
        }, 500);
      }

      // Hide chat interface after table edit responses
      if (data?.assistantMessage?.metadata?.isTableEditResponse) {
        setShowChatInterface(false);
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to Send Message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-create first session if none exists
  useEffect(() => {
    if (sessions && Array.isArray(sessions) && sessions.length === 0 && !createSessionMutation.isPending) {
      createSessionMutation.mutate({
        title: `Analysis ${new Date().toLocaleDateString()}`,
        products: [],
        targetCustomer: "Product Managers",
      });
    }
  }, [sessions]);

  // Auto-select first session
  useEffect(() => {
    if (sessions && Array.isArray(sessions) && sessions.length > 0 && !currentSessionId) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessions, currentSessionId]);

  const currentSession = sessions && Array.isArray(sessions) ? 
    sessions.find((s: AnalysisSession) => s.id === currentSessionId) : null;

  const handleSendMessage = (content: string, metadata?: any) => {
    if (!currentSessionId) return;

    // Only show progress tracker when user approves suggestions (clicks "Proceed with Analysis")
    if (content.toLowerCase().includes("yes") || content.toLowerCase().includes("proceed")) {
      setShowProgressTracker(true);
      setShowChatInterface(false); // Hide chat during analysis
    }

    sendMessageMutation.mutate({ content, metadata });
  };

  const handleCreateSession = () => {
    const timestamp = new Date().toLocaleString('en-US', { 
      month: 'numeric', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    });
    createSessionMutation.mutate({
      title: `New Analysis ${timestamp}`,
      products: [],
      targetCustomer: '',
    });
  };

  // Helper function to extract suggestions from messages
  const extractSuggestions = useCallback((messages: ChatMessage[]) => {
    const lastAssistantMessage = messages
      .slice()
      .reverse()
      .find(msg => msg.role === 'assistant' && 
        (msg.content.includes('**Additional Competitive Product:**') || 
         msg.content.includes('**Competitive Products to Compare:**') || 
         msg.content.includes('**Suggested Additional') ||
         msg.content.includes('**Relevant Features/Benefits:**') ||
         msg.content.includes('**Key Features/Benefits') ||
         msg.content.includes('### Suggested Competitive Products') ||
         msg.content.includes('### Relevant Features/Benefits')));

    if (!lastAssistantMessage) return null;

    const content = lastAssistantMessage.content;
    const lines = content.split('\n');
    const suggestions = { products: [] as string[], features: [] as string[] };
    let currentSection = '';

    for (const line of lines) {
      if (line.includes('**Suggested Competitive Products:**') ||
          line.includes('**Additional Competitive Product:**') ||
          line.includes('**Competitive Products to Compare:**') || 
          line.includes('**Suggested Additional') ||
          line.includes('### Suggested Competitive Products')) {
        currentSection = 'products';
      } else if (line.includes('**Key Features/Benefits') ||
                 line.includes('**Relevant Features/Benefits:**') ||
                 line.includes('**Relevant Features/Benefits') ||
                 line.includes('### Relevant Features/Benefits')) {
        currentSection = 'features';
      } else if ((line.match(/^\d+\.\s/) || line.match(/^\d+\.\s\*\*/) || line.startsWith('**')) && currentSection) {
        let item = line.replace(/^\d+\.\s/, '').replace(/^\d+\.\s\*\*/, '').replace(/^\*\*/, '').replace(/\*\*.*$/, '').trim();
        if (currentSection === 'products') {
          // Extract product name from various formats
          if (item.includes(' - ')) {
            item = item.split(' - ')[0].trim();
          }
          suggestions.products.push(item);
        } else if (currentSection === 'features') {
          // Extract feature name from various formats
          if (item.includes(' - ')) {
            item = item.split(' - ')[0].trim();
          }
          suggestions.features.push(item);
        }
      }
    }

    return suggestions.products.length > 0 || suggestions.features.length > 0 ? suggestions : null;
  }, []);

  const handleProceedWithAnalysis = () => {
    handleSendMessage("Yes please proceed");
  };

  const handleMakeChanges = () => {
    setShowChatInterface(true); // Show chat when user wants to make changes
    setShowProgressTracker(false);
  };

  const handleEditTable = useCallback(() => {
    // Invalidate and refetch session data to get updated table data
    if (currentSessionId) {
      queryClient.invalidateQueries({
        queryKey: ["/api/analysis/sessions"]
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/analysis/sessions/${currentSessionId}/messages`]
      });

      // Force a fresh refetch of sessions data
      setTimeout(() => {
        queryClient.refetchQueries({
          queryKey: ["/api/analysis/sessions"]
        });
      }, 100);
    }
  }, [currentSessionId]);

  // Memoized computation for better performance
  const { hasTableData, suggestions, panelContent } = useMemo(() => {
    // Check for table data first
    const hasTable = currentSession?.tableData && 
        typeof currentSession.tableData === 'object' && 
        Object.keys(currentSession.tableData).length > 0;

    // Extract suggestions
    const extractedSuggestions = extractSuggestions(Array.isArray(messages) ? messages : []);
    const hasSuggestions = extractedSuggestions && 
        (extractedSuggestions.products.length > 0 || extractedSuggestions.features.length > 0);

    // Determine panel content
    let content: 'table' | 'suggestions' | 'empty' = 'empty';
    if (hasTable) content = 'table';
    else if (hasSuggestions) content = 'suggestions';

    return {
      hasTableData: hasTable,
      suggestions: extractedSuggestions,
      panelContent: content
    };
  }, [currentSession?.tableData, messages]);

  // Hide progress tracker when analysis is complete
  useEffect(() => {
    if (hasTableData) {
      setShowProgressTracker(false);
    }
  }, [hasTableData]);

  // Determine current progress based on the session step and progress
  const getCurrentProgress = () => {
    if (!currentSession) return 20;

    const stepProgress: Record<string, number> = {
      'discovery': 20,
      'research': 40,
      'categorization': 60,
      'table_creation': 80,
      'analysis': 100
    };

    return stepProgress[currentSession.currentStep] || 20;
  };

  const handleProgressComplete = () => {
    setShowProgressTracker(false);
    // Refresh the session data to show the results
    queryClient.invalidateQueries({ 
      queryKey: [`/api/analysis/sessions/${currentSessionId}/messages`] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ["/api/analysis/sessions"] 
    });
  };

  const renderRightPanel = () => {
    switch (panelContent) {
      case 'table':
        return (
          <KanoTable
            tableData={currentSession!.tableData as KanoTableData}
            isLoading={sessionLoading}
            sessionId={currentSessionId}
            onEditTable={handleEditTable}
          />
        );

      case 'suggestions':
        return (
          <SuggestionPanel
            originalRequest={{
              products: Array.isArray(messages) ? 
                messages.find(m => m.role === 'user')?.content.match(/Products to Compare: ([^\n]+)/)?.[1]?.split(',')
                  .map(p => p.trim())
                  .filter(p => !['more', 'others', 'etc', 'additional', 'similar', 'competitive', 'tools'].includes(p.toLowerCase())) || [] 
                : [],
              targetCustomer: Array.isArray(messages) ? 
                messages.find(m => m.role === 'user')?.content.match(/Target Customers?: ([^\n]+)/)?.[1] 
                : undefined
            }}
            suggestions={suggestions!}
            onProceed={handleProceedWithAnalysis}
            onMakeChanges={handleMakeChanges}
            isLoading={sendMessageMutation.isPending}
          />
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 animate-fade-in">
            <div className="w-20 h-20 mb-6 kano-gradient-mesh rounded-full flex items-center justify-center shadow-lg animate-float">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 00-2 2h-2a2 2 0 00-2-2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-gray-800 dark:text-gray-200">Ready for Analysis</h3>
            <p className="text-center max-w-md text-base leading-relaxed text-gray-600 dark:text-gray-400">
              Start a conversation to begin your competitive analysis. Our AI will guide you through the process and generate your Kano Model comparison.
            </p>
            <div className="mt-6 flex space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50/50 via-white to-violet-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col">
      <Header 
        onCreateSession={handleCreateSession}
        sessions={sessions || []}
        currentSessionId={currentSessionId}
        onSessionSelect={setCurrentSessionId}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Chat Interface Panel */}
        <div className="w-2/5 min-w-0 flex flex-col glass-card border-r border-white/20 dark:border-slate-700/50 animate-slide-in-right">
          {showProgressTracker ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <ProgressTracker
                currentStep={currentSession?.currentStep || "discovery"}
                progress={getCurrentProgress()}
                isComplete={hasTableData}
                onComplete={handleProgressComplete}
                sessionId={currentSessionId}
              />
            </div>
          ) : showChatInterface && currentSessionId ? (
            <ChatInterface
              messages={Array.isArray(messages) ? messages : []}
              onSendMessage={handleSendMessage}
              isLoading={messagesLoading || sendMessageMutation.isPending}
              currentStep={currentSession?.currentStep || "discovery"}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center animate-fade-in">
              <div className="max-w-sm">
                <div className="w-20 h-20 mx-auto mb-6 kano-gradient-mesh rounded-full flex items-center justify-center shadow-xl animate-float">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3">
                  {hasTableData ? "Analysis Complete" : "Ready to Start"}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                  {hasTableData 
                    ? "Your competitive analysis is ready. Click 'Make Changes' if you'd like to modify anything."
                    : "Click 'New Analysis' to begin your competitive research."
                  }
                </p>
                <div className="flex justify-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Kano Table or Suggestions */}
        <div className="flex-1 min-w-0 flex flex-col glass-card p-6 animate-fade-in">
          <div className="flex items-center space-x-3 mb-6">
            <div className="kano-lens-logo">
              <div className="inner"></div>
              <div className="core"></div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Kano Model Comparison
            </h2>
          </div>

          {/* Feature highlight cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Under 10 Minutes</h3>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">Complete analysis time</p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-purple-900 dark:text-purple-100">AI-Powered</h3>
              </div>
              <p className="text-sm text-purple-700 dark:text-purple-300">Smart feature categorization</p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-green-900 dark:text-green-100">Shareable</h3>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">Instant collaboration</p>
            </div>
          </div>

          {renderRightPanel()}
        </div>
      </div>
    </div>
  );
}