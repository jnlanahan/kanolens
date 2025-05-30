
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Edit, Plus, Users, Target, Lightbulb } from "lucide-react";

interface ConfirmationData {
  originalRequest: {
    description?: string;
    products: string[];
    targetCustomer?: string;
    features: string[];
  };
  aiSuggestions: {
    additionalProducts: Array<{ name: string; reason: string }>;
    suggestedFeatures: {
      mustHave: Array<{ name: string; reason: string }>;
      performance: Array<{ name: string; reason: string }>;
      delighter: Array<{ name: string; reason: string }>;
    };
    enhancedTargetCustomer?: string;
  };
}

interface ConfirmationPanelProps {
  data: ConfirmationData;
  onConfirm: () => void;
  onRequestChanges: () => void;
  isLoading?: boolean;
}

export default function ConfirmationPanel({ 
  data, 
  onConfirm, 
  onRequestChanges, 
  isLoading = false 
}: ConfirmationPanelProps) {
  return (
    <Card className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center justify-center gap-2">
          <Check className="h-5 w-5 text-green-500" />
          Analysis Scope Confirmation
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Review the analysis parameters below before proceeding with full competitive research
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Your Original Request */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400">
            <Users className="h-4 w-4" />
            Your Original Request
          </div>
          
          {data.originalRequest.description && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Analysis Focus:</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                {data.originalRequest.description}
              </p>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Products to Compare:</h4>
            <div className="flex flex-wrap gap-2">
              {data.originalRequest.products.map((product, index) => (
                <Badge key={index} variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                  {product}
                </Badge>
              ))}
            </div>
          </div>

          {data.originalRequest.targetCustomer && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Target Customer:</h4>
              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                <Target className="h-3 w-3 mr-1" />
                {data.originalRequest.targetCustomer}
              </Badge>
            </div>
          )}

          {data.originalRequest.features.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Specified Features:</h4>
              <div className="space-y-1">
                {data.originalRequest.features.map((feature, index) => (
                  <div key={index} className="text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Suggestions */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-400">
            <Lightbulb className="h-4 w-4" />
            AI-Enhanced Suggestions
          </div>

          {data.aiSuggestions.additionalProducts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-1">
                <Plus className="h-3 w-3" />
                Additional Products to Include:
              </h4>
              <div className="space-y-2">
                {data.aiSuggestions.additionalProducts.map((product, index) => (
                  <div key={index} className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                    <div className="font-medium text-sm text-purple-700 dark:text-purple-300">
                      {product.name}
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                      {product.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Suggested Feature Categories:</h4>
            
            <div className="space-y-3">
              {/* Must-Have Features */}
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                <h5 className="text-xs font-medium text-red-700 dark:text-red-300 mb-2">MUST-HAVE FEATURES</h5>
                <div className="space-y-1">
                  {data.aiSuggestions.suggestedFeatures.mustHave.map((feature, index) => (
                    <div key={index} className="text-xs">
                      <span className="font-medium text-red-600 dark:text-red-400">{feature.name}:</span>
                      <span className="text-red-600 dark:text-red-400 ml-1">{feature.reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Features */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                <h5 className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-2">PERFORMANCE BENEFITS</h5>
                <div className="space-y-1">
                  {data.aiSuggestions.suggestedFeatures.performance.map((feature, index) => (
                    <div key={index} className="text-xs">
                      <span className="font-medium text-yellow-600 dark:text-yellow-400">{feature.name}:</span>
                      <span className="text-yellow-600 dark:text-yellow-400 ml-1">{feature.reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delighter Features */}
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <h5 className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">DELIGHTER FEATURES</h5>
                <div className="space-y-1">
                  {data.aiSuggestions.suggestedFeatures.delighter.map((feature, index) => (
                    <div key={index} className="text-xs">
                      <span className="font-medium text-green-600 dark:text-green-400">{feature.name}:</span>
                      <span className="text-green-600 dark:text-green-400 ml-1">{feature.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button 
          onClick={onConfirm}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
        >
          <Check className="h-4 w-4" />
          Looks Great! Proceed with Analysis
        </Button>
        <Button 
          variant="outline"
          onClick={onRequestChanges}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          I'd Like to Make Changes
        </Button>
      </div>
    </Card>
  );
}
