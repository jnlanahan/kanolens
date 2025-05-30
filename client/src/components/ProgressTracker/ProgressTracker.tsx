import { useEffect, useState } from 'react';
import { CheckCircle, Circle, Clock, Zap, Search, BarChart3, Table } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  sessionId?: number | null;
}

const ANALYSIS_STEPS: Record<string, ProgressStep> = {
  discovery: {
    id: 'discovery',
    title: 'Processing Request',
    description: 'Understanding your products and target customers',
    icon: <Search className="w-5 h-5" />,
    status: 'pending',
    estimatedTime: '10-15 sec'
  },
  research: {
    id: 'research',
    title: 'Market Research',
    description: 'Gathering competitive intelligence and product data',
    icon: <Zap className="w-5 h-5" />,
    status: 'pending',
    estimatedTime: '30-45 sec'
  },
  categorization: {
    id: 'categorization',
    title: 'Feature Analysis',
    description: 'Categorizing features using Kano Model methodology',
    icon: <BarChart3 className="w-5 h-5" />,
    status: 'pending',
    estimatedTime: '15-20 sec'
  },
  table_creation: {
    id: 'table_creation',
    title: 'Building Analysis',
    description: 'Creating your comprehensive competitive comparison table',
    icon: <Table className="w-5 h-5" />,
    status: 'pending',
    estimatedTime: '10-15 sec'
  }
};

export default function ProgressTracker({ 
  currentStep, 
  progress, 
  isComplete, 
  onComplete 
}: ProgressTrackerProps) {
  const [steps, setSteps] = useState<ProgressStep[]>(Object.values(ANALYSIS_STEPS));
  const [animationPhase, setAnimationPhase] = useState(0);
  const [localStep, setLocalStep] = useState('discovery');
  const [localProgress, setLocalProgress] = useState(20);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);

  // Simulate realistic step progression with artificial delays
  useEffect(() => {
    if (currentStep === 'discovery') {
      setLocalStep('discovery');
      setLocalProgress(20);
      
      // Auto-progress through steps with realistic timing
      const timer1 = setTimeout(() => {
        setLocalStep('research');
        setLocalProgress(40);
      }, 3000); // 3 seconds for discovery
      
      const timer2 = setTimeout(() => {
        setLocalStep('categorization');
        setLocalProgress(60);
      }, 15000); // 15 seconds total for research
      
      const timer3 = setTimeout(() => {
        setLocalStep('table_creation');
        setLocalProgress(80);
      }, 25000); // 25 seconds total for categorization
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [currentStep]);

  // Handle actual completion from backend
  useEffect(() => {
    if (isComplete) {
      setLocalStep('table_creation');
      setLocalProgress(100);
      setShowCompletionMessage(true);
      
      // Don't auto-call onComplete to prevent chat from reappearing
      // User will need to manually dismiss or we'll handle it differently
    }
  }, [isComplete]);

  useEffect(() => {
    const updatedSteps = Object.values(ANALYSIS_STEPS).map(step => {
      if (step.id === localStep) {
        return { ...step, status: 'active' as const };
      } else if (getStepOrder(step.id) < getStepOrder(localStep)) {
        return { ...step, status: 'completed' as const };
      } else {
        return { ...step, status: 'pending' as const };
      }
    });
    
    setSteps(updatedSteps);
  }, [localStep]);

  useEffect(() => {
    // Animation cycle for active step
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 3);
    }, 800);
    
    return () => clearInterval(interval);
  }, []);

  function getStepOrder(stepId: string): number {
    const order = ['discovery', 'research', 'categorization', 'table_creation'];
    return order.indexOf(stepId);
  }

  const getStepIcon = (step: ProgressStep) => {
    if (step.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (step.status === 'active') {
      return (
        <div className={cn(
          "w-5 h-5 rounded-full border-2 border-blue-500 transition-all duration-300",
          animationPhase === 0 && "bg-blue-500",
          animationPhase === 1 && "bg-blue-400",
          animationPhase === 2 && "bg-blue-300"
        )}>
          <div className="w-full h-full rounded-full animate-pulse bg-blue-500 opacity-50" />
        </div>
      );
    } else {
      return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const currentStepIndex = steps.findIndex(step => step.status === 'active');
  const currentStepData = steps[currentStepIndex];

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Competitive Analysis in Progress
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Sit back and relax while we analyze your products
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
          <span>Progress</span>
          <span>{Math.round(localProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${localProgress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4 mb-8">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "flex items-center space-x-4 p-4 rounded-lg transition-all duration-300",
              step.status === 'active' && "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800",
              step.status === 'completed' && "bg-green-50 dark:bg-green-900/20",
              step.status === 'pending' && "bg-gray-50 dark:bg-gray-800"
            )}
          >
            {/* Step Number/Icon */}
            <div className="flex-shrink-0">
              {getStepIcon(step)}
            </div>

            {/* Step Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className={cn(
                  "text-sm font-medium",
                  step.status === 'active' && "text-blue-900 dark:text-blue-100",
                  step.status === 'completed' && "text-green-900 dark:text-green-100",
                  step.status === 'pending' && "text-gray-500 dark:text-gray-400"
                )}>
                  {step.title}
                </h3>
                {step.status === 'active' && step.estimatedTime && (
                  <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                    <Clock className="w-3 h-3 mr-1" />
                    {step.estimatedTime}
                  </div>
                )}
                {step.status === 'completed' && (
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Complete
                  </span>
                )}
              </div>
              <p className={cn(
                "text-xs mt-1",
                step.status === 'active' && "text-blue-700 dark:text-blue-300",
                step.status === 'completed' && "text-green-700 dark:text-green-300",
                step.status === 'pending' && "text-gray-400 dark:text-gray-500"
              )}>
                {step.description}
              </p>
            </div>

            {/* Loading Animation for Active Step */}
            {step.status === 'active' && (
              <div className="flex space-x-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-1 h-6 bg-blue-500 rounded-full transition-all duration-300",
                      animationPhase === i ? "opacity-100 scale-y-100" : "opacity-30 scale-y-50"
                    )}
                    style={{
                      animationDelay: `${i * 200}ms`
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Current Step Status */}
      {currentStepData && !showCompletionMessage && (
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {currentStepData.title}...
            </span>
          </div>
        </div>
      )}

      {/* Completion Message */}
      {showCompletionMessage && (
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-flex items-center px-6 py-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-sm font-medium text-green-900 dark:text-green-100">
                Analysis Complete!
              </span>
            </div>
          </div>
          <button
            onClick={() => onComplete && onComplete()}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200"
          >
            View Results
          </button>
        </div>
      )}
    </div>
  );
}