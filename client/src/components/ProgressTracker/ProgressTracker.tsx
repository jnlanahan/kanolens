import { useEffect, useState } from 'react';
import { CheckCircle, Circle, Clock, Zap, Search, BarChart3, Table, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePolling } from '@/hooks/usePolling';

interface ProgressStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'completed';
  estimatedTime?: string;
}

interface ProgressTrackerProps {
  currentStep: string;
  progress: number;
  isComplete: boolean;
  onComplete?: () => void;
  sessionId?: number;
}

export default function ProgressTracker({
  currentStep: propCurrentStep,
  progress: propProgress,
  isComplete,
  onComplete,
  sessionId
}: ProgressTrackerProps) {
  const [localStep, setLocalStep] = useState(propCurrentStep);
  const [localProgress, setLocalProgress] = useState(propProgress);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('Starting analysis...');

  // Use polling for progress updates
  const { data: progressData, isConnected, connectionError } = usePolling({
    sessionId: sessionId || null,
    enabled: !!sessionId,
    interval: 3000
  });

  useEffect(() => {
    if (progressData) {
      setLocalStep(progressData.currentStep);
      setLocalProgress(progressData.progress);
      setCurrentMessage(progressData.message || `${progressData.currentStep} step in progress...`);
      
      if (progressData.status === 'completed') {
        setShowCompletionMessage(true);
        setTimeout(() => {
          if (onComplete) {
            onComplete();
          }
        }, 2000);
      }
    }
  }, [progressData, onComplete]);

  const steps: ProgressStep[] = [
    {
      id: 'discovery',
      title: 'Discovery',
      description: 'Setting up your analysis',
      icon: <Search className="w-5 h-5" />,
      status: 'completed',
      estimatedTime: '30s'
    },
    {
      id: 'research',
      title: 'Research',
      description: 'Gathering product information',
      icon: <Zap className="w-5 h-5" />,
      status: localStep === 'research' ? 'active' : localStep === 'discovery' ? 'pending' : 'completed',
      estimatedTime: '2-3 min'
    },
    {
      id: 'categorization',
      title: 'Categorization',
      description: 'Applying Kano Model',
      icon: <BarChart3 className="w-5 h-5" />,
      status: localStep === 'categorization' ? 'active' : ['discovery', 'research'].includes(localStep) ? 'pending' : 'completed',
      estimatedTime: '1-2 min'
    },
    {
      id: 'analysis',
      title: 'Analysis',
      description: 'Generating insights',
      icon: <Table className="w-5 h-5" />,
      status: localStep === 'analysis' ? 'active' : ['discovery', 'research', 'categorization'].includes(localStep) ? 'pending' : 'completed',
      estimatedTime: '1 min'
    }
  ];

  const getProgressPercentage = () => {
    if (progressData?.progress) {
      return progressData.progress;
    }
    return localProgress || 0;
  };

  if (showCompletionMessage) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">
          Analysis Complete!
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Redirecting to results...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
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
        
        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700 mb-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Progress</span>
          <span>{getProgressPercentage()}%</span>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {currentMessage}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.id} className={cn(
            "flex items-center space-x-3 p-3 rounded-lg transition-all duration-300",
            step.status === 'completed' && "bg-green-50 dark:bg-green-900/20",
            step.status === 'active' && "bg-blue-50 dark:bg-blue-900/20",
            step.status === 'pending' && "bg-gray-50 dark:bg-gray-800/50"
          )}>
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300",
              step.status === 'completed' && "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
              step.status === 'active' && "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
              step.status === 'pending' && "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
            )}>
              {step.status === 'completed' ? (
                <CheckCircle className="w-5 h-5" />
              ) : step.status === 'active' ? (
                <div className="animate-spin">
                  {step.icon}
                </div>
              ) : (
                <Circle className="w-5 h-5" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className={cn(
                  "text-sm font-medium",
                  step.status === 'completed' && "text-green-800 dark:text-green-200",
                  step.status === 'active' && "text-blue-800 dark:text-blue-200",
                  step.status === 'pending' && "text-gray-600 dark:text-gray-400"
                )}>
                  {step.title}
                </h4>
                {step.estimatedTime && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {step.estimatedTime}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-red-800 dark:text-red-200 text-xs">
            Connection issue: {connectionError}
          </p>
        </div>
      )}
    </div>
  );
}