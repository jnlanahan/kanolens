import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Clock, Zap, BarChart3, Lightbulb, ArrowRight, Wifi, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePolling } from "@/hooks/usePolling";
import { useCleanup } from "@/hooks/useCleanup";

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
  const [isPaused, setIsPaused] = useState(false);
  const { addCleanup } = useCleanup();

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
      status: currentStep >= 2 ? 'completed' : (currentStep === 1 ? 'in_progress' : 'pending')
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

  // Use polling for progress updates
  const { data: progressData, isConnected, connectionError, refetch } = usePolling({
    sessionId: sessionIdNum,
    enabled: !!sessionIdNum && !isPaused,
    interval: 2000
  });

  // Force refresh function
  const forceRefresh = () => {
    console.log('[ProgressTracker] Force refreshing progress...');
    refetch();
  };

  useEffect(() => {
    if (progressData) {
      console.log('[ProgressTracker] Using polling data:', progressData);
      
      const stepMap = {
        'discovery': 0,
        'research': 1,
        'categorization': 2,
        'table_creation': 3,
        'analysis': 3,
        'completed': 4
      };
      
      const newStep = stepMap[progressData.currentStep as keyof typeof stepMap] ?? 1;
      setCurrentStep(newStep);
      setCurrentMessage(progressData.message || `${progressData.currentStep} step in progress...`);

      // If analysis is completed, redirect to results immediately
      if (progressData.status === 'completed' || progressData.currentStep === 'completed' || newStep >= 4) {
        console.log('[ProgressTracker] Analysis completed! Redirecting to results...');
        setCurrentMessage('Analysis completed successfully! Redirecting...');
        setLocation(`/analysis/${sessionId}/results`);
      }
    }
  }, [progressData, sessionId, setLocation]);

  // Check for completion every 5 seconds as backup
  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      if (sessionIdNum && progressData?.status !== 'completed') {
        console.log('[ProgressTracker] Checking completion status...');
        forceRefresh();
      }
    }, 5000);

    addCleanup(() => clearInterval(interval));
    return () => clearInterval(interval);
  }, [sessionIdNum, progressData?.status, isPaused, addCleanup]);

  const getElapsedTime = () => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const getEstimatedCompletion = () => {
    const currentProgress = getProgressPercentage();
    if (currentProgress < 10) return 'Calculating...';
    
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = currentProgress / elapsed;
    const remaining = (100 - currentProgress) / rate;
    
    if (remaining < 60) {
      return `~${Math.ceil(remaining)}s remaining`;
    } else {
      const mins = Math.ceil(remaining / 60);
      return `~${mins}m remaining`;
    }
  };

  const getProgressPercentage = () => {
    if (progressData?.progress) {
      return progressData.progress;
    }
    // Fallback based on current step
    return Math.min(25 + (currentStep * 25), 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Analysis in Progress
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              Our AI agents are working on your competitive analysis
            </p>
            
            <div className="flex justify-center items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Elapsed: {getElapsedTime()}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                <span>{getEstimatedCompletion()}</span>
              </div>
              
              <div className={cn(
                "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium",
                isConnected 
                  ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                  : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
              )}>
                <Wifi className="w-3 h-3 mr-1" />
                {isConnected ? 'Live updates' : 'Connection issue'}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{getProgressPercentage()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
              {currentMessage}
            </p>
          </div>

          {/* Progress Steps */}
          <div className="space-y-4 mb-8">
            {steps.map((step, index) => (
              <Card key={step.id} className={cn(
                "transition-all duration-300",
                step.status === 'completed' && "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
                step.status === 'in_progress' && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-md",
                step.status === 'pending' && "bg-gray-50 dark:bg-gray-800/50"
              )}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={cn(
                        "flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300",
                        step.status === 'completed' && "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
                        step.status === 'in_progress' && "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                        step.status === 'pending' && "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                      )}>
                        {step.status === 'completed' ? (
                          <Check className="w-6 h-6" />
                        ) : step.status === 'in_progress' ? (
                          <div className="animate-spin">
                            {step.icon}
                          </div>
                        ) : (
                          step.icon
                        )}
                      </div>
                      
                      <div>
                        <h3 className={cn(
                          "text-lg font-semibold",
                          step.status === 'completed' && "text-green-800 dark:text-green-200",
                          step.status === 'in_progress' && "text-blue-800 dark:text-blue-200",
                          step.status === 'pending' && "text-gray-600 dark:text-gray-400"
                        )}>
                          {step.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          {step.description}
                        </p>
                        <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>Estimated time: {step.estimatedTime}</span>
                          {step.status === 'completed' && (
                            <span className="ml-2 text-green-600 dark:text-green-400 flex items-center">
                              <Check className="w-3 h-3 mr-1" />
                              Completed
                            </span>
                          )}
                          {step.status === 'in_progress' && (
                            <span className="ml-2 text-blue-600 dark:text-blue-400 flex items-center">
                              <div className="w-2 h-2 bg-blue-600 rounded-full mr-1 animate-pulse"></div>
                              In progress...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Debug Info and Manual Refresh */}
          <Card className="mb-8 bg-gray-50 dark:bg-gray-800/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Debug Information
                </h3>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setIsPaused(!isPaused)} 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button onClick={forceRefresh} variant="outline" size="sm">
                    Refresh Progress
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Session ID:</strong> {sessionId}
                </div>
                <div>
                  <strong>Current Step:</strong> {progressData?.currentStep || 'Unknown'}
                </div>
                <div>
                  <strong>Status:</strong> {progressData?.status || 'Unknown'}
                </div>
                <div>
                  <strong>Progress:</strong> {progressData?.progress || 0}%
                </div>
              </div>
              
              {progressData?.status === 'completed' && (
                <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <p className="text-green-800 dark:text-green-200 font-medium">
                    Analysis completed! Click the button below to view results.
                  </p>
                  <Button 
                    onClick={() => setLocation(`/analysis/${sessionId}/results`)}
                    className="mt-2"
                  >
                    View Results <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connection Error Display */}
          {connectionError && (
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-800 dark:text-red-200 text-sm font-medium">
                      Connection issue detected
                    </p>
                    <p className="text-red-600 dark:text-red-300 text-xs mt-1">
                      {connectionError}
                    </p>
                  </div>
                  <Button 
                    onClick={forceRefresh} 
                    variant="outline" 
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Retry Connection
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Educational Content */}
          <Card className="mt-8">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                  <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    💡 Did you know?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    The Kano Model was developed by Professor Noriaki Kano in the 1980s to categorize customer preferences into Must-Have, 
                    Performance, and Delighter features. It's widely used in product development to prioritize features based on customer satisfaction 
                    impact.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}