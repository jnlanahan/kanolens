import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Lightbulb, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import PageLayout from "@/components/Layout/PageLayout";
import StandardHeader from "@/components/Layout/StandardHeader";
import type { AnalysisLimits } from "@shared/schema";

interface AnalysisFormData {
  description: string;
  products: string;
  targetCustomers: string;
  features: string;
}

export default function AnalysisSetup() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState<AnalysisFormData>({
    description: '',
    products: '',
    targetCustomers: '',
    features: ''
  });

  // Fetch user analysis limits
  const { data: analysisLimits } = useQuery<AnalysisLimits>({
    queryKey: ["/api/analysis/limits"],
    retry: false,
  });

  const setupMutation = useMutation({
    mutationFn: async (data: AnalysisFormData) => {
      const response = await apiRequest("POST", "/api/analysis/suggestions", data);
      return response.json();
    },
    onSuccess: (data) => {
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
    
    if (analysisLimits && !analysisLimits.canCreateMore) {
      toast({
        title: "Analysis Limit Reached",
        description: "You have used your free analysis. Delete your current analysis to create a new one, or upgrade to a paid plan (coming soon).",
        variant: "destructive",
      });
      setLocation("/dashboard");
      return;
    }
    
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

  const headerActions = (
    <Button 
      variant="outline" 
      size="sm"
      onClick={() => setLocation("/dashboard")}
      className="flex items-center gap-2"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to Dashboard
    </Button>
  );

  return (
    <PageLayout>
      <StandardHeader 
        title="kanolens" 
        subtitle="Analysis Setup"
        actions={headerActions}
      />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title Section */}
          <div className="flex items-center gap-2 mb-6">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Set Up Your Analysis
            </h1>
          </div>

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
              disabled={setupMutation.isPending || (analysisLimits && !analysisLimits.canCreateMore)}
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
      </main>
    </PageLayout>
  );
}