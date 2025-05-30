import React from "react";
import { CheckCircle, Clock, Search, Brain, FileText, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ProgressStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'completed';
  progress?: number;
}

interface ProgressTrackerProps {
  currentStep: string;
  progress: number;
  isLoading: boolean;
  onModifyRequest?: () => void;
  showModifyButton?: boolean;
}

const getSteps = (currentStep: string, progress: number): ProgressStep[] => [
  {
    id: 'discovery',
    title: 'Gathering Requirements',
    description: 'Processing your product analysis request and validating inputs',
    icon: <FileText className="h-5 w-5" />,
    status: currentStep === 'discovery' ? 'active' : (progress > 20 ? 'completed' : 'pending'),
    progress: currentStep === 'discovery' ? progress : (progress > 20 ? 100 : 0)
  },
  {
    id: 'research',
    title: 'Researching Competition',
    description: 'Conducting web search to gather current product information and features',
    icon: <Search className="h-5 w-5" />,
    status: currentStep === 'research' ? 'active' : (progress > 40 ? 'completed' : 'pending'),
    progress: currentStep === 'research' ? progress : (progress > 40 ? 100 : 0)
  },
  {
    id: 'categorization',
    title: 'Analyzing Features',
    description: 'Applying Kano Model methodology to categorize features and benefits',
    icon: <Brain className="h-5 w-5" />,
    status: currentStep === 'categorization' ? 'active' : (progress > 60 ? 'completed' : 'pending'),
    progress: currentStep === 'categorization' ? progress : (progress > 60 ? 100 : 0)
  },
  {
    id: 'table_creation',
    title: 'Building Analysis',
    description: 'Generating comprehensive Kano Model comparison table with ratings',
    icon: <Zap className="h-5 w-5" />,
    status: currentStep === 'table_creation' ? 'active' : (progress >= 100 ? 'completed' : 'pending'),
    progress: currentStep === 'table_creation' ? progress : (progress >= 100 ? 100 : 0)
  }
];

export default function ProgressTracker({ 
  currentStep, 
  progress, 
  isLoading,
  onModifyRequest,
  showModifyButton = false
}: ProgressTrackerProps) {
  const steps = getSteps(currentStep, progress);
  const activeStep = steps.find(step => step.status === 'active');

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Analysis Progress
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          AI-guided competitive analysis using Kano Model
        </p>
        
        {showModifyButton && onModifyRequest && (
          <div className="mt-4">
            <Button 
              onClick={onModifyRequest}
              variant="outline" 
              size="sm"
              className="text-sm"
            >
              Modify Suggestions
            </Button>
          </div>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex-1 p-6 space-y-4">
        {steps.map((step, index) => (
          <Card 
            key={step.id} 
            className={`p-4 transition-all duration-300 ${
              step.status === 'active' 
                ? 'border-blue-500 dark:border-blue-400 shadow-md' 
                : step.status === 'completed'
                ? 'border-green-500 dark:border-green-400'
                : 'border-gray-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-start space-x-4">
              {/* Step Icon */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                step.status === 'completed' 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : step.status === 'active'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500'
              }`}>
                {step.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : step.status === 'active' ? (
                  <Clock className="h-5 w-5 animate-pulse" />
                ) : (
                  step.icon
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`font-medium ${
                    step.status === 'active' 
                      ? 'text-blue-900 dark:text-blue-100'
                      : step.status === 'completed'
                      ? 'text-green-900 dark:text-green-100'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {step.title}
                  </h3>
                  
                  <Badge 
                    variant={step.status === 'completed' ? 'default' : 'secondary'}
                    className={
                      step.status === 'completed' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                        : step.status === 'active'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                        : ''
                    }
                  >
                    {step.status === 'completed' ? 'Completed' : 
                     step.status === 'active' ? 'In Progress' : 'Pending'}
                  </Badge>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {step.description}
                </p>

                {/* Progress Bar */}
                {step.status !== 'pending' && (
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        step.status === 'completed' 
                          ? 'bg-green-500 dark:bg-green-400'
                          : 'bg-blue-500 dark:bg-blue-400'
                      }`}
                      style={{ width: `${step.progress || 0}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Current Status */}
      {activeStep && (
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-pulse" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Currently: {activeStep.title}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}