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
    createSessionMutation.mutate({
      title: `Analysis ${new Date().toLocaleDateString()}`,
      products: [],
      targetCustomer: "Product Managers",
    }, {
      onSuccess: (newSession: AnalysisSession) => {
        setCurrentSessionId(newSession.id);
        setShowChatInterface(true); // Show chat for new session
        setShowProgressTracker(false);
        queryClient.invalidateQueries({ queryKey: ["/api/analysis/sessions"] });
      }
    });
  };

  // Helper function to extract suggestions from messages
  const extractSuggestions = (messages: ChatMessage[]) => {
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
  };

  const handleProceedWithAnalysis = () => {
    handleSendMessage("Yes please proceed");
  };

  const handleMakeChanges = () => {
    setShowChatInterface(true); // Show chat when user wants to make changes
    setShowProgressTracker(false);
  };

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
          
          {renderRightPanel()}
        </div>
      </div>
    </div>
  );
}