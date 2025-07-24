import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Clock, Zap, BarChart3, Lightbulb, ArrowRight, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  estimatedTime: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export default function ProgressTracker() {
  const { sessionId } = useParams();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [startTime] = useState(Date.now());
  const [currentMessage, setCurrentMessage] = useState('Starting analysis...');
  const [useRealTime, setUseRealTime] = useState(true);

  const sessionIdNum = sessionId ? parseInt(sessionId) : null;

  const steps: ProgressStep[] = [
    {
      id: 'discovery',
      title: 'Setting Up Analysis',
      description: 'Organizing your products and features for comprehensive research',
      icon: <Lightbulb className="w-6 h-6" />,
      estimatedTime: '30 seconds',
      status: 'completed'
    },
    {
      id: 'research',
      title: 'Researching Products',
      description: 'AI agents are gathering detailed information about each product',
      icon: <Zap className="w-6 h-6" />,
      estimatedTime: '2-3 minutes',
      status: currentStep >= 1 ? 'in_progress' : 'pending'
    },
    {
      id: 'categorization',
      title: 'Kano Categorization',
      description: 'Categorizing features using the Kano Model framework',
      icon: <BarChart3 className="w-6 h-6" />,
      estimatedTime: '1-2 minutes',
      status: currentStep >= 2 ? (currentStep === 2 ? 'in_progress' : 'completed') : 'pending'
    },
    {
      id: 'analysis',
      title: 'Strategic Analysis',
      description: 'Generating insights and competitive recommendations',
      icon: <BarChart3 className="w-6 h-6" />,
      estimatedTime: '1 minute',
      status: currentStep >= 3 ? (currentStep === 3 ? 'in_progress' : 'completed') : 'pending'
    }
  ];

  // DISABLED WebSocket - use polling only due to persistent 1006 errors
  const isConnected = false;
  const connectionError = null;
  const reconnect = () => {};
  
  // Force polling mode
  React.useEffect(() => {
    setUseRealTime(false);
  }, []);

  // Polling for progress updates (WebSocket disabled)
  const { data: progressData } = useQuery({
    queryKey: [`/api/analysis/sessions/${sessionId}/progress`],
    enabled: !!sessionId, // Always enabled since WebSocket is disabled
    refetchInterval: 2000, // Poll every 2 seconds
    retry: false,
  });

  useEffect(() => {
    // Use polling data (WebSocket disabled)
    if (progressData) {
      console.log('[ProgressTracker] Using polling data:', progressData);
      const stepMap = {
        'discovery': 0,
        'research': 1,
        'categorization': 2,
        'analysis': 3,
        'completed': 4
      };
      
      const newStep = stepMap[progressData.currentStep as keyof typeof stepMap] || 0;
      setCurrentStep(newStep);
      setCurrentMessage(`${progressData.currentStep} step in progress...`);

      // If analysis is completed, redirect to results
      if (progressData.status === 'completed' || progressData.currentStep === 'completed' || newStep >= 4) {
        setTimeout(() => {
          setLocation(`/analysis/${sessionId}/results`);
        }, 2000);
      }
    }
  }, [progressData, sessionId, setLocation]);

  // Removed auto-advance demo - now using real progress data

  const getElapsedTime = () => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const getStatusIcon = (step: ProgressStep, index: number) => {
    if (index < currentStep) {
      return <Check className="w-6 h-6 text-green-600" />;
    } else if (index === currentStep) {
      return (
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      );
    } else {
      return <Clock className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStepColor = (index: number) => {
    if (index < currentStep) {
      return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
    } else if (index === currentStep) {
      return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
    } else {
      return 'bg-gray-50 border-gray-200 dark:bg-slate-800 dark:border-slate-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Analysis in Progress
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              Our AI agents are working on your competitive analysis
            </p>
            
            {/* Real-time status and current message */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-500">
                  Elapsed time: {getElapsedTime()}
                </div>
                
                {/* Connection Status */}
                {sessionIdNum && (
                  <div className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium",
                    isConnected 
                      ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                      : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200"
                  )}>
                    {isConnected ? (
                      <>
                        <Wifi className="w-3 h-3 mr-1" />
                        Real-time updates
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3 mr-1" />
                        Polling updates
                        {connectionError && (
                          <button 
                            onClick={reconnect}
                            className="ml-2 underline hover:no-underline"
                            title="Retry connection"
                          >
                            retry
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              
              {/* Current Step Message */}
              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                {currentMessage}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
            <span className="text-sm text-gray-500">{Math.round((currentStep / 4) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <Card key={step.id} className={`transition-all duration-300 ${getStepColor(index)}`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getStatusIcon(step, index)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      {step.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">
                        Estimated time: {step.estimatedTime}
                      </span>
                      {index === currentStep && (
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                          In progress...
                        </span>
                      )}
                      {index < currentStep && (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                          <Check className="w-4 h-4" />
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Completion Message */}
        {currentStep >= 4 && (
          <Card className="mt-8 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-2">
                Analysis Complete!
              </h3>
              <p className="text-green-800 dark:text-green-200 mb-4">
                Your Kano Model competitive analysis is ready to view.
              </p>
              <Button 
                onClick={() => setLocation(`/analysis/${sessionId}/results`)}
                className="flex items-center gap-2"
              >
                View Results
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Fun Facts */}
        <Card className="mt-8 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
          <CardContent className="p-6">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              💡 Did you know?
            </h4>
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              The Kano Model was developed by Professor Noriaki Kano in the 1980s to categorize customer preferences into Must-Have, Performance, and Delighter features. It's widely used in product development to prioritize features based on customer satisfaction impact.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}