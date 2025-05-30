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
          {/* Original Request Section */}
          <Card className="p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Your Request
            </h3>
            
            <div className="space-y-4">
              {/* Original Products */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Products to Compare
                </label>
                <div className="flex flex-wrap gap-2">
                  {originalRequest.products.map((product, index) => (
                    <Badge key={index} variant="outline" className="px-3 py-1">
                      {product}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Target Customer */}
              {originalRequest.targetCustomer && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Target Customers
                  </label>
                  <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {originalRequest.targetCustomer}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* AI Suggestions Section */}
          <Card className="p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center space-x-2 mb-4">
              <Star className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI Suggestions
              </h3>
            </div>

            <div className="space-y-6">
              {/* Additional Products */}
              {suggestions.products.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Package className="w-4 h-4 text-blue-600" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Suggested Additional Products
                    </label>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {suggestions.products.map((product, index) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                        <div className="text-sm text-gray-900 dark:text-white font-medium">
                          {product}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Features */}
              {suggestions.features.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Users className="w-4 h-4 text-green-600" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Key Features/Benefits to Analyze
                    </label>
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    {suggestions.features.map((feature, index) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {feature}
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