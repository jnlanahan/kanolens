import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import Header from "@/components/Layout/Header";
import ChatInterface from "@/components/Chat/ChatInterface";
import KanoTable from "@/components/KanoTable/KanoTable";
import SuggestionPanel from "@/components/Chat/SuggestionPanel";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import type { AnalysisSession, ChatMessage, KanoTableData } from "@shared/schema";

export default function Home() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(
    id ? parseInt(id) : null
  );

  // Fetch user sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["/api/analysis/sessions"],
    retry: false,
  });

  // Fetch current session details
  const { data: currentSession, isLoading: sessionLoading } = useQuery({
    queryKey: ["/api/analysis/sessions", currentSessionId],
    enabled: !!currentSessionId,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/analysis/sessions/${currentSessionId}/messages`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/analysis/sessions", currentSessionId] 
      });
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
    if (!sessionsLoading && sessions && sessions.length === 0 && !currentSessionId) {
      createSessionMutation.mutate({
        title: "New Competitive Analysis",
        products: [],
        targetCustomer: "Product Managers",
      });
    } else if (!currentSessionId && sessions && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessions, sessionsLoading, currentSessionId]);

  const handleSendMessage = (content: string, metadata?: any) => {
    if (!currentSessionId) {
      toast({
        title: "No Session",
        description: "Please create an analysis session first.",
        variant: "destructive",
      });
      return;
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
      .find(msg => msg.role === 'assistant' && msg.content.includes('**Suggested Additional'));
    
    if (!lastAssistantMessage) return null;

    const content = lastAssistantMessage.content;
    const lines = content.split('\n');
    const suggestions = { products: [] as string[], features: [] as string[] };
    let currentSection = '';
    
    for (const line of lines) {
      if (line.includes('**Suggested Additional')) {
        currentSection = 'products';
      } else if (line.includes('**Key Features/Benefits') || line.includes('**Relevant Features/Benefits')) {
        currentSection = 'features';
      } else if (line.match(/^\d+\.\s/) && currentSection) {
        const item = line.replace(/^\d+\.\s/, '').trim();
        if (currentSection === 'products') {
          suggestions.products.push(item);
        } else if (currentSection === 'features') {
          suggestions.features.push(item);
        }
      }
    }
    
    return suggestions.products.length > 0 || suggestions.features.length > 0 ? suggestions : null;
  };

  // Check if we should show suggestion panel
  const suggestions = extractSuggestions(Array.isArray(messages) ? messages : []);
  const showSuggestionPanel = suggestions && !currentSession?.tableData;

  const handleProceedWithAnalysis = () => {
    handleSendMessage("Yes please proceed");
  };

  const handleMakeChanges = () => {
    handleSendMessage("I'd like to make some changes to the suggestions");
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
          <ChatInterface
            messages={Array.isArray(messages) ? messages : []}
            onSendMessage={handleSendMessage}
            isLoading={messagesLoading || sendMessageMutation.isPending}
            currentStep={currentSession?.currentStep || "discovery"}
          />
        </div>

        {/* Right Panel - Suggestions or Kano Table */}
        <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-slate-800">
          {showSuggestionPanel && suggestions ? (
            <SuggestionPanel
              originalRequest={{
                products: Array.isArray(messages) ? 
                  messages.find(m => m.role === 'user')?.content.match(/Products to Compare: ([^\n]+)/)?.[1]?.split(',').map(p => p.trim()) || [] 
                  : [],
                targetCustomer: Array.isArray(messages) ? 
                  messages.find(m => m.role === 'user')?.content.match(/Target Customers?: ([^\n]+)/)?.[1] 
                  : undefined
              }}
              suggestions={suggestions}
              onProceed={handleProceedWithAnalysis}
              onMakeChanges={handleMakeChanges}
              isLoading={sendMessageMutation.isPending}
            />
          ) : (
            <KanoTable
              tableData={currentSession?.tableData as KanoTableData}
              isLoading={sessionLoading}
              sessionId={currentSessionId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
