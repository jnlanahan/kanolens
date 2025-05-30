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
    
    // Check if this is an initial analysis request (contains "Analysis Request:")
    if (content.includes("Analysis Request:")) {
      setShowProgressTracker(true);
    }
    
    // Check if this is a "proceed" message indicating user approved suggestions
    if (content.toLowerCase().includes("yes") || content.toLowerCase().includes("proceed")) {
      setShowProgressTracker(true);
    }
    
    sendMessageMutation.mutate({ content, metadata });
  };

  const handleCreateSession = () => {
    createSessionMutation.mutate({
      title: `Analysis ${new Date().toLocaleDateString()}`,
      products: [],
      targetCustomer: "Product Managers",
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
    handleSendMessage("I'd like to make some changes to the suggestions");
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
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="w-16 h-16 mb-4 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-full flex items-center justify-center shadow-sm">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 00-2 2h-2a2 2 0 00-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">Ready for Analysis</h3>
            <p className="text-center max-w-sm text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Start a conversation to begin your competitive analysis. Our AI will guide you through the process and generate your Kano Model comparison.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      <Header 
        onCreateSession={handleCreateSession}
        sessions={sessions || []}
        currentSessionId={currentSessionId}
        onSessionSelect={setCurrentSessionId}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Interface Panel */}
        <div className="w-2/5 min-w-0 flex flex-col bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700">
          {showProgressTracker ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <ProgressTracker
                currentStep={currentSession?.currentStep || "discovery"}
                progress={getCurrentProgress()}
                isComplete={hasTableData}
                onComplete={handleProgressComplete}
              />
            </div>
          ) : (
            <ChatInterface
              messages={Array.isArray(messages) ? messages : []}
              onSendMessage={handleSendMessage}
              isLoading={messagesLoading || sendMessageMutation.isPending}
              currentStep={currentSession?.currentStep || "discovery"}
            />
          )}
        </div>

        {/* Right Panel - Kano Table or Suggestions */}
        <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-slate-800 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Kano Model Comparison
          </h2>
          
          {renderRightPanel()}
        </div>
      </div>
    </div>
  );
}