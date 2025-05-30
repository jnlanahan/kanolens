import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Package, Users, CheckCircle, Edit } from "lucide-react";

interface SuggestionPanelProps {
  originalRequest: {
    description?: string;
    products: string[];
    targetCustomer?: string;
    features?: string[];
  };
  suggestions: {
    products: string[];
    features: string[];
  };
  onProceed: () => void;
  onMakeChanges: () => void;
  isLoading?: boolean;
}

export default function SuggestionPanel({ 
  originalRequest, 
  suggestions, 
  onProceed, 
  onMakeChanges, 
  isLoading = false 
}: SuggestionPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 kano-gradient-light">
        <div className="flex items-center space-x-2 mb-2">
          <Star className="w-5 h-5 text-purple-600" />
          <h2 className="font-mono-heading text-lg font-semibold text-gray-900 dark:text-white">
            Analysis Configuration
          </h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Review and confirm your competitive analysis setup
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Comprehensive Analysis Overview */}
          <Card className="p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Complete Analysis Setup
            </h3>
            
            <div className="space-y-6">
              {/* Target Customer Context */}
              {originalRequest.targetCustomer && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      Target Audience
                    </span>
                  </div>
                  <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                    {originalRequest.targetCustomer}
                  </span>
                </div>
              )}

              {/* All Products to Compare */}
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Package className="w-4 h-4 text-blue-600" />
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Products to Compare
                  </label>
                </div>
                <div className="space-y-2">
                  {/* Original Products */}
                  {originalRequest.products.map((product, index) => (
                    <div key={`original-${index}`} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                        {product}
                      </div>
                    </div>
                  ))}
                  
                  {/* AI Suggested Products */}
                  {suggestions.products.map((product, index) => (
                    <div key={`suggested-${index}`} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-green-900 dark:text-green-100 font-medium">
                          {product}
                        </div>
                        <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:text-green-300">
                          AI Suggested
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* All Features to Analyze */}
              {suggestions.features.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Features & Benefits to Analyze
                    </label>
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                    {suggestions.features.map((feature, index) => (
                      <div key={index} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-green-900 dark:text-green-100">
                            {feature}
                          </div>
                          <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:text-green-300">
                            AI Suggested
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
        <div className="space-y-3">
          <Button 
            onClick={onProceed}
            disabled={isLoading}
            className="w-full kano-gradient text-white hover:opacity-90"
            size="lg"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            {isLoading ? "Generating Analysis..." : "Proceed with Analysis"}
          </Button>
          
          <Button 
            onClick={onMakeChanges}
            variant="outline"
            className="w-full"
            size="lg"
            disabled={isLoading}
          >
            <Edit className="w-5 h-5 mr-2" />
            Make Changes
          </Button>
        </div>
        
        <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <p className="text-xs text-purple-600 dark:text-purple-400 text-center">
            The AI will generate a comprehensive Kano Model analysis table with these products and features
          </p>
        </div>
      </div>
    </div>
  );
}