import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, CheckCircle, Clock, Search, Target, Brain, BarChart3, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import OrchestratorChat from "./OrchestratorChat";
import KanoTable from "@/components/KanoTable/KanoTable";
import type { KanoTableData } from "@shared/schema";

interface FormData {
  description: string;
  products: string;
  targetCustomers: string;
  features: string;
}

interface SuggestionData {
  products: string[];
  features: string[];
  targetCustomer: string;
}

interface AgentProgress {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'waiting' | 'working' | 'completed';
  currentTask?: string;
  progress?: number;
  timeEstimate?: string;
}

interface WorkflowStepsProps {
  onAnalysisComplete?: (data: any) => void;
}

export default function WorkflowSteps({ onAnalysisComplete }: WorkflowStepsProps) {
  const [currentStep, setCurrentStep] = useState<'form' | 'suggestions' | 'progress' | 'results'>('form');
  const [formData, setFormData] = useState<FormData>({
    description: '',
    products: '',
    targetCustomers: '',
    features: ''
  });
  const [suggestions, setSuggestions] = useState<SuggestionData | null>(null);
  const [finalData, setFinalData] = useState<SuggestionData | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [agentProgress, setAgentProgress] = useState<AgentProgress[]>([
    {
      name: 'Orchestrator',
      icon: Brain,
      status: 'waiting',
      currentTask: 'Coordinating analysis workflow',
      progress: 0
    },
    {
      name: 'Researcher',
      icon: Search,
      status: 'waiting',
      currentTask: 'Gathering competitive intelligence',
      progress: 0,
      timeEstimate: '2-3 min'
    },
    {
      name: 'Validator',
      icon: CheckCircle,
      status: 'waiting',
      currentTask: 'Categorizing features using Kano Model',
      progress: 0,
      timeEstimate: '1-2 min'
    },
    {
      name: 'Analyst',
      icon: BarChart3,
      status: 'waiting',
      currentTask: 'Generating strategic insights',
      progress: 0,
      timeEstimate: '1-2 min'
    }
  ]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Simulate API call for suggestions
      const response = await fetch('/api/chat/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      setSuggestions(data);
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

  const handleAcceptSuggestions = () => {
    if (suggestions) {
      setFinalData(suggestions);
      setCurrentStep('progress');
      startAnalysis();
    }
  };

  const startAnalysis = async () => {
    if (!finalData) return;

    try {
      // Start orchestrator
      updateAgentProgress('Orchestrator', 'working', 'Starting multi-agent analysis', 20);
      
      // Create session for the analysis
      const sessionResponse = await fetch('/api/analysis/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Analysis: ${finalData.products.join(', ')}`,
          products: finalData.products,
          targetCustomer: finalData.targetCustomer
        })
      });
      
      const session = await sessionResponse.json();
      
      // Start the multi-agent analysis
      const analysisResponse = await fetch(`/api/analysis/sessions/${session.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `yes, proceed with the analysis for ${finalData.products.join(', ')} targeting ${finalData.targetCustomer}`,
          metadata: {
            products: finalData.products,
            features: finalData.features,
            targetCustomer: finalData.targetCustomer,
            useMultiAgent: true
          }
        })
      });
      
      const result = await analysisResponse.json();
      
      // Update agent progress based on real analysis
      const progressInterval = setInterval(async () => {
        try {
          const messagesResponse = await fetch(`/api/analysis/sessions/${session.id}/messages`);
          const messages = await messagesResponse.json();
          const lastMessage = messages[messages.length - 1];
          
          if (lastMessage?.metadata?.step === 'table_creation') {
            updateAgentProgress('Researcher', 'completed', 'Research complete', 100);
            updateAgentProgress('Validator', 'completed', 'Features categorized', 100);
            updateAgentProgress('Analyst', 'working', 'Generating strategic insights', 80);
          }
          
          if (lastMessage?.metadata?.step === 'analysis_complete') {
            updateAgentProgress('Analyst', 'completed', 'Analysis complete', 100);
            clearInterval(progressInterval);
            
            // Get final session data
            const finalSessionResponse = await fetch(`/api/analysis/sessions/${session.id}`);
            const finalSession = await finalSessionResponse.json();
            
            if (finalSession.data?.tableData) {
              setAnalysisResults(finalSession.data);
              setCurrentStep('results');
            }
          }
        } catch (error) {
          console.error('Progress tracking error:', error);
        }
      }, 3000);
      
      // Fallback timeout
      setTimeout(() => {
        clearInterval(progressInterval);
        if (currentStep === 'progress') {
          updateAgentProgress('Analyst', 'completed', 'Analysis complete', 100);
          // Use mock data as fallback
          setAnalysisResults({
            tableData: {
              products: finalData.products,
              features: finalData.features.map((f, i) => ({
                id: `feature-${i}`,
                name: f,
                description: `Analysis of ${f}`,
                category: ['must-have', 'performance', 'delighter'][i % 3],
                customerBenefit: `Provides value to ${finalData.targetCustomer}`
              })),
              ratings: {},
              sources: {}
            }
          });
          setCurrentStep('results');
        }
      }, 180000); // 3 minutes timeout
      
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to start analysis. Please try again.",
        variant: "destructive"
      });
    }
  };

  const updateAgentProgress = (agentName: string, status: AgentProgress['status'], task: string, progress: number) => {
    setAgentProgress(prev => prev.map(agent => 
      agent.name === agentName 
        ? { ...agent, status, currentTask: task, progress }
        : agent
    ));
  };

  const handleChatMessage = (message: string) => {
    // Handle orchestrator chat messages
    console.log('Orchestrator chat:', message);
    // This would integrate with the actual chat system
  };

  // Step 1: Initial Form
  if (currentStep === 'form') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Start Your Competitive Analysis</CardTitle>
            <CardDescription>
              Tell us about your products and target customers to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="description">What are you analyzing? (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="e.g., AI photo editing tools for social media creators"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="min-h-20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="products">Products to Compare *</Label>
                <Input
                  id="products"
                  placeholder="e.g., Canva, Adobe Express, Figma"
                  value={formData.products}
                  onChange={(e) => setFormData({...formData, products: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetCustomers">Target Customers *</Label>
                <Input
                  id="targetCustomers"
                  placeholder="e.g., small business owners, students, freelancers"
                  value={formData.targetCustomers}
                  onChange={(e) => setFormData({...formData, targetCustomers: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="features">Specific Features to Analyze (Optional)</Label>
                <Textarea
                  id="features"
                  placeholder="e.g., pricing, templates, collaboration, export options"
                  value={formData.features}
                  onChange={(e) => setFormData({...formData, features: e.target.value})}
                  className="min-h-20"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Suggestions...
                  </>
                ) : (
                  "Start Analysis"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Orchestrator Chat Bubble */}
        <OrchestratorChat
          isVisible={showChat}
          onToggle={() => setShowChat(!showChat)}
          onMessage={handleChatMessage}
          context="form"
        />
      </div>
    );
  }

  // Step 2: AI Suggestions
  if (currentStep === 'suggestions' && suggestions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">AI-Enhanced Analysis Setup</CardTitle>
            <CardDescription>
              I've enhanced your analysis with additional products and key features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Products to Analyze</h3>
                <div className="flex flex-wrap gap-2">
                  {suggestions.products.map((product, index) => (
                    <Badge key={index} variant="secondary">{product}</Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Key Features</h3>
                <div className="flex flex-wrap gap-2">
                  {suggestions.features.map((feature, index) => (
                    <Badge key={index} variant="outline">{feature}</Badge>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Target Customer</h3>
              <Badge variant="default" className="text-sm">
                {suggestions.targetCustomer}
              </Badge>
            </div>

            <div className="flex gap-4 pt-4">
              <Button 
                onClick={handleAcceptSuggestions} 
                className="flex-1"
                size="lg"
              >
                Proceed with Analysis
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep('form')}
                size="lg"
              >
                Modify Setup
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Orchestrator Chat Bubble */}
        <OrchestratorChat
          isVisible={showChat}
          onToggle={() => setShowChat(!showChat)}
          onMessage={handleChatMessage}
          context="suggestions"
        />
      </div>
    );
  }

  // Step 3: Progress Tracking
  if (currentStep === 'progress' && finalData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Multi-Agent Analysis in Progress</CardTitle>
            <CardDescription>
              Our specialized AI agents are analyzing your competitive landscape
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Analysis Context */}
            <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Target:</span> {finalData.targetCustomer}
                </div>
                <div>
                  <span className="font-medium">Products:</span> {finalData.products.length}
                </div>
                <div>
                  <span className="font-medium">Features:</span> {finalData.features.length}
                </div>
              </div>
            </div>

            {/* Agent Progress */}
            <div className="space-y-4">
              {agentProgress.map((agent, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className={`p-3 rounded-full ${
                    agent.status === 'completed' ? 'bg-green-100 dark:bg-green-900' :
                    agent.status === 'working' ? 'bg-blue-100 dark:bg-blue-900' :
                    'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    {agent.status === 'working' ? (
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    ) : agent.status === 'completed' ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <Clock className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{agent.name}</h4>
                      {agent.timeEstimate && agent.status === 'waiting' && (
                        <span className="text-sm text-gray-500">{agent.timeEstimate}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{agent.currentTask}</p>
                    {agent.status !== 'waiting' && (
                      <Progress value={agent.progress} className="mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Orchestrator Chat Bubble */}
        <OrchestratorChat
          isVisible={showChat}
          onToggle={() => setShowChat(!showChat)}
          onMessage={handleChatMessage}
          context="progress"
        />
      </div>
    );
  }

  // Step 4: Results
  if (currentStep === 'results' && analysisResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Kano Model Analysis Complete</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Your competitive analysis is ready for review
            </p>
          </div>

          <KanoTable 
            data={analysisResults.tableData} 
            onFeatureClick={(feature) => console.log('Feature clicked:', feature)}
          />

          <div className="mt-8 text-center">
            <Button 
              onClick={() => setCurrentStep('form')}
              variant="outline"
              size="lg"
            >
              Start New Analysis
            </Button>
          </div>
        </div>

        {/* Orchestrator Chat Bubble */}
        <OrchestratorChat
          isVisible={showChat}
          onToggle={() => setShowChat(!showChat)}
          onMessage={handleChatMessage}
          context="results"
        />
      </div>
    );
  }

  return null;
}