import React, { useState, useEffect } from "react";
import { Brain, Search, CheckCircle, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import OrchestratorChat from "./OrchestratorChat";
import KanoTable from "@/components/KanoTable/KanoTable";
import AnalysisForm from "@/features/analysis/components/AnalysisForm";
import SuggestionsReview from "@/features/analysis/components/SuggestionsReview";
import ProgressTracker, { type AgentProgress } from "@/features/analysis/components/ProgressTracker";
import type { KanoTableData } from "@shared/schema";

interface FormData {
  description: string;
  products: string;
  targetCustomers: string;
  features: string;
}

interface SuggestionData {
  originalProducts: string[];
  suggestedProducts: string[];
  features: string[];
  targetCustomer: string;
}

interface ManualEditsData {
  products: string[];
  features: string[];
  targetCustomer: string;
}

interface WorkflowStepsProps {
  onAnalysisComplete?: (data: any) => void;
}

export default function WorkflowStepsRefactored({ onAnalysisComplete }: WorkflowStepsProps) {
  const [currentStep, setCurrentStep] = useState<'form' | 'suggestions' | 'validation' | 'progress' | 'results'>('form');
  const [suggestions, setSuggestions] = useState<SuggestionData | null>(null);
  const [finalData, setFinalData] = useState<ManualEditsData | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const { toast } = useToast();

  const [agentProgress, setAgentProgress] = useState<AgentProgress[]>([
    {
      name: 'Coordination Agent',
      icon: Brain,
      status: 'waiting',
      currentTask: 'Setting up analysis workflow and sending criteria to research team',
      progress: 0
    },
    {
      name: 'Research Agent',
      icon: Search,
      status: 'waiting',
      currentTask: 'Gathering competitive intelligence and product feature data',
      progress: 0,
      timeEstimate: '2-3 min'
    },
    {
      name: 'Validation Agent',
      icon: CheckCircle,
      status: 'waiting',
      currentTask: 'Categorizing features using Kano Model framework',
      progress: 0,
      timeEstimate: '1-2 min'
    },
    {
      name: 'Analysis Agent',
      icon: BarChart3,
      status: 'waiting',
      currentTask: 'Generating strategic insights and competitive recommendations',
      progress: 0,
      timeEstimate: '1-2 min'
    }
  ]);

  // Auto-start analysis when reaching progress screen
  useEffect(() => {
    if (currentStep === 'progress' && finalData && !currentSessionId) {
      console.log('Auto-starting analysis on progress screen...');
      startAnalysis();
    }
  }, [currentStep, finalData, currentSessionId]);

  const updateAgentProgress = (agentName: string, status: AgentProgress['status'], task?: string, progress?: number) => {
    setAgentProgress(prev => prev.map(agent => 
      agent.name === agentName 
        ? { ...agent, status, currentTask: task || agent.currentTask, progress }
        : agent
    ));
  };

  const handleFormSubmit = async (formData: FormData) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/chat/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      const originalProducts = formData.products.split(',').map(p => p.trim()).filter(p => p);
      
      setSuggestions({
        originalProducts,
        suggestedProducts: data.products || [],
        features: data.features || [],
        targetCustomer: data.targetCustomer || formData.targetCustomers
      });
      
      setCurrentStep('suggestions');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate suggestions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionsComplete = (data: ManualEditsData) => {
    setFinalData(data);
    setCurrentStep('progress');
  };

  const startAnalysis = async () => {
    if (!finalData) return;

    try {
      // Start coordination agent
      updateAgentProgress('Coordination Agent', 'working', 'Setting up analysis workflow and sending criteria to research team', 20);
      
      // Create session for the analysis
      const sessionResponse = await fetch('/api/analysis/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Analysis: ${finalData.products.join(', ')}`,
          products: finalData.products,
          targetCustomer: finalData.targetCustomer,
          features: finalData.features,
          currentStep: 'suggestions'
        })
      });
      
      if (!sessionResponse.ok) {
        const errorText = await sessionResponse.text();
        throw new Error(`Failed to create session: ${errorText}`);
      }
      
      const session = await sessionResponse.json();
      setCurrentSessionId(session.id);
      
      // Check for existing completed analysis
      const existingMessagesResponse = await fetch(`/api/analysis/sessions/${session.id}/messages`);
      const existingMessages = await existingMessagesResponse.json();
      const lastExistingMessage = existingMessages[existingMessages.length - 1];
      
      if (lastExistingMessage?.metadata?.step === 'table_creation' && lastExistingMessage?.metadata?.data) {
        setAnalysisResults(lastExistingMessage.metadata.data);
        setCurrentStep('results');
        return;
      }
      
      // Start the multi-agent analysis
      const analysisResponse = await fetch(`/api/analysis/sessions/${session.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'yes proceed with the full competitive analysis',
          metadata: {
            products: finalData.products,
            features: finalData.features,
            targetCustomer: finalData.targetCustomer,
            useMultiAgent: true
          }
        })
      });
      
      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text();
        throw new Error(`Failed to start analysis: ${errorText}`);
      }
      
      // Simulate agent progress updates
      setTimeout(() => {
        updateAgentProgress('Coordination Agent', 'completed', 'Analysis workflow setup complete', 100);
        updateAgentProgress('Research Agent', 'working', 'Gathering competitive intelligence and product feature data', 30);
      }, 2000);
      
      setTimeout(() => {
        updateAgentProgress('Research Agent', 'completed', 'Market research complete', 100);
        updateAgentProgress('Validation Agent', 'working', 'Categorizing features using Kano Model framework', 50);
      }, 8000);
      
      setTimeout(() => {
        updateAgentProgress('Validation Agent', 'completed', 'Kano categorization complete', 100);
        updateAgentProgress('Analysis Agent', 'working', 'Generating strategic insights and competitive recommendations', 70);
      }, 15000);
      
    } catch (error) {
      console.error('Analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'form':
        return (
          <AnalysisForm
            onFormSubmit={handleFormSubmit}
            onOpenArchitecture={() => setShowChat(true)}
            isLoading={isLoading}
          />
        );

      case 'suggestions':
        if (!suggestions) return null;
        return (
          <SuggestionsReview
            suggestions={suggestions}
            onProceed={handleSuggestionsComplete}
            onBack={() => setCurrentStep('form')}
          />
        );

      case 'progress':
        return (
          <ProgressTracker
            agents={agentProgress}
            sessionId={currentSessionId}
          />
        );

      case 'results':
        if (!analysisResults) return null;
        return (
          <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
            <div className="w-full max-w-7xl">
              <KanoTable data={analysisResults as KanoTableData} />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {renderCurrentStep()}
      
      {showChat && (
        <OrchestratorChat
          onClose={() => setShowChat(false)}
        />
      )}
    </>
  );
}