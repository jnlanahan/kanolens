import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, ArrowRight, Lightbulb, Zap, Search, BarChart3, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

type AnalysisMode = 'express' | 'quick' | 'deep';

interface AnalysisFormData {
  description: string;
  products: string;
  targetCustomers: string;
  features: string;
  analysisMode: AnalysisMode;
}

interface AnalysisModeOption {
  id: AnalysisMode;
  name: string;
  description: string;
  duration: string;
  features: string[];
  icon: React.ReactNode;
  recommended?: string;
}

export default function AnalysisSetup() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState<AnalysisFormData>({
    description: '',
    products: '',
    targetCustomers: '',
    features: '',
    analysisMode: 'quick'
  });

  const analysisModes: AnalysisModeOption[] = [
    {
      id: 'express',
      name: 'Express Analysis',
      description: 'Quick overview with key insights',
      duration: '30-60 seconds',
      features: ['Basic feature comparison', 'High-level insights', 'Quick decision support'],
      icon: <Zap className="w-5 h-5" />,
      recommended: 'For executives & quick decisions'
    },
    {
      id: 'quick',
      name: 'Quick Analysis',
      description: 'Balanced depth and speed',
      duration: '2-3 minutes',
      features: ['Comprehensive feature analysis', 'Kano categorization', 'Strategic recommendations'],
      icon: <Search className="w-5 h-5" />,
      recommended: 'Most popular choice'
    },
    {
      id: 'deep',
      name: 'Deep Analysis',
      description: 'Thorough research and detailed insights',
      duration: '5-7 minutes',
      features: ['Extensive market research', 'Detailed competitive intelligence', 'Comprehensive strategic analysis'],
      icon: <BarChart3 className="w-5 h-5" />,
      recommended: 'For product planning & strategy'
    }
  ];

  const setupMutation = useMutation({
    mutationFn: async (data: AnalysisFormData) => {
      const response = await apiRequest("POST", "/api/analysis/suggestions", data);
      return response.json();
    },
    onSuccess: (data) => {
      // Store the suggestions and form data in localStorage for the next page
      localStorage.setItem('analysisSetup', JSON.stringify(formData));
      localStorage.setItem('analysisSuggestions', JSON.stringify(data));
      setLocation("/analysis/suggestions");
    },
    onError: (error) => {
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.products.trim() || !formData.targetCustomers.trim()) {
      toast({
        title: "Missing Information", 
        description: "Please provide at least the products to compare and target customers.",
        variant: "destructive",
      });
      return;
    }

    setupMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof AnalysisFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation("/dashboard")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Set Up Your Analysis
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Tell us what you'd like to analyze and we'll help you set up a comprehensive comparison
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-600" />
              Analysis Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Products to Compare */}
              <div className="space-y-2">
                <Label htmlFor="products" className="text-base font-medium">
                  Products to Compare *
                </Label>
                <Input
                  id="products"
                  placeholder="e.g., Slack, Microsoft Teams, Discord"
                  value={formData.products}
                  onChange={(e) => handleInputChange('products', e.target.value)}
                  className="text-base"
                />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter the main products you want to compare, separated by commas
                </p>
              </div>

              {/* Target Customers */}
              <div className="space-y-2">
                <Label htmlFor="targetCustomers" className="text-base font-medium">
                  Target Customers *
                </Label>
                <Input
                  id="targetCustomers"
                  placeholder="e.g., Product Managers, Software Development Teams, Small Businesses"
                  value={formData.targetCustomers}
                  onChange={(e) => handleInputChange('targetCustomers', e.target.value)}
                  className="text-base"
                />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Who is the target audience for this analysis?
                </p>
              </div>

              {/* Analysis Mode Selection */}
              <div className="space-y-4">
                <Label className="text-base font-medium">
                  Analysis Mode *
                </Label>
                <RadioGroup 
                  value={formData.analysisMode} 
                  onValueChange={(value: AnalysisMode) => handleInputChange('analysisMode', value)}
                  className="space-y-3"
                >
                  {analysisModes.map((mode) => (
                    <div key={mode.id} className="relative">
                      <div className={cn(
                        "flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-all",
                        formData.analysisMode === mode.id 
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      )}>
                        <RadioGroupItem value={mode.id} className="mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {mode.icon}
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {mode.name}
                            </h4>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Clock className="w-3 h-3" />
                              {mode.duration}
                            </div>
                            {mode.recommended && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {mode.description}
                          </p>
                          <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                            {mode.features.map((feature, index) => (
                              <li key={index} className="flex items-center gap-1">
                                <span className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0"></span>
                                {feature}
                              </li>
                            ))}
                          </ul>
                          {mode.recommended && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
                              {mode.recommended}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Analysis Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-medium">
                  Analysis Description
                  <span className="text-sm font-normal text-gray-500 ml-2">(Optional)</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="e.g., I want to understand how different team communication tools compare for remote software development teams..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="text-base"
                />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Provide context about what you're trying to achieve with this analysis
                </p>
              </div>

              {/* Specific Features */}
              <div className="space-y-2">
                <Label htmlFor="features" className="text-base font-medium">
                  Specific Features to Focus On
                  <span className="text-sm font-normal text-gray-500 ml-2">(Optional)</span>
                </Label>
                <Textarea
                  id="features"
                  placeholder="e.g., Video calling quality, File sharing, Integration capabilities, Mobile apps"
                  value={formData.features}
                  onChange={(e) => handleInputChange('features', e.target.value)}
                  rows={2}
                  className="text-base"
                />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Any specific features or benefits you want to make sure we analyze
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      What happens next?
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Our AI will research your products and suggest additional competitors and key features to analyze. 
                      You'll be able to review and modify these suggestions before we create your Kano Model comparison.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={setupMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {setupMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Get AI Suggestions
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}