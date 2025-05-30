
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Edit, Plus, Users, Target, Lightbulb, Package, Star } from "lucide-react";

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
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Check className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Confirm Analysis Scope
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          I've analyzed your request and enhanced it with AI-powered suggestions. Review the scope below before I conduct the full competitive analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* YOUR ORIGINAL REQUEST */}
        <Card className="p-6 border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-blue-200 dark:border-blue-700">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                Your Original Request
              </h3>
            </div>
            
            {data.originalRequest.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-blue-600" />
                  Analysis Focus
                </h4>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {data.originalRequest.description}
                  </p>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                Products to Compare
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.originalRequest.products.length > 0 ? (
                  data.originalRequest.products.map((product, index) => (
                    <Badge key={index} className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-600">
                      {product}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400 italic">No specific products mentioned</span>
                )}
              </div>
            </div>

            {data.originalRequest.targetCustomer && (
              <div>
                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  Target Customer
                </h4>
                <Badge className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-600">
                  {data.originalRequest.targetCustomer}
                </Badge>
              </div>
            )}

            {data.originalRequest.features.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
                  Specified Features
                </h4>
                <div className="space-y-2">
                  {data.originalRequest.features.map((feature, index) => (
                    <div key={index} className="bg-white dark:bg-slate-800 p-3 rounded border border-blue-200 dark:border-blue-700">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* AI ENHANCED SUGGESTIONS */}
        <Card className="p-6 border-2 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10">
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-purple-200 dark:border-purple-700">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <Lightbulb className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                AI-Enhanced Suggestions
              </h3>
            </div>

            {data.aiSuggestions.additionalProducts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-purple-600" />
                  Additional Competitors to Include
                </h4>
                <div className="space-y-3">
                  {data.aiSuggestions.additionalProducts.map((product, index) => (
                    <div key={index} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                      <div className="font-medium text-purple-800 dark:text-purple-200 mb-1">
                        {product.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {product.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                <Star className="h-4 w-4 text-purple-600" />
                Feature Analysis Framework
              </h4>
              
              <div className="space-y-4">
                {/* Must-Have Features */}
                {data.aiSuggestions.suggestedFeatures.mustHave.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-700">
                    <h5 className="font-medium text-red-800 dark:text-red-200 mb-3 text-sm">
                      🔴 MUST-HAVE FEATURES
                    </h5>
                    <div className="space-y-2">
                      {data.aiSuggestions.suggestedFeatures.mustHave.map((feature, index) => (
                        <div key={index} className="bg-white dark:bg-slate-800 p-3 rounded border border-red-200 dark:border-red-600">
                          <div className="font-medium text-red-700 dark:text-red-300 text-sm mb-1">
                            {feature.name}
                          </div>
                          <div className="text-xs text-red-600 dark:text-red-400">
                            {feature.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Performance Features */}
                {data.aiSuggestions.suggestedFeatures.performance.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700">
                    <h5 className="font-medium text-yellow-800 dark:text-yellow-200 mb-3 text-sm">
                      🟡 PERFORMANCE BENEFITS
                    </h5>
                    <div className="space-y-2">
                      {data.aiSuggestions.suggestedFeatures.performance.map((feature, index) => (
                        <div key={index} className="bg-white dark:bg-slate-800 p-3 rounded border border-yellow-200 dark:border-yellow-600">
                          <div className="font-medium text-yellow-700 dark:text-yellow-300 text-sm mb-1">
                            {feature.name}
                          </div>
                          <div className="text-xs text-yellow-600 dark:text-yellow-400">
                            {feature.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delighter Features */}
                {data.aiSuggestions.suggestedFeatures.delighter.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
                    <h5 className="font-medium text-green-800 dark:text-green-200 mb-3 text-sm">
                      🟢 DELIGHTER FEATURES
                    </h5>
                    <div className="space-y-2">
                      {data.aiSuggestions.suggestedFeatures.delighter.map((feature, index) => (
                        <div key={index} className="bg-white dark:bg-slate-800 p-3 rounded border border-green-200 dark:border-green-600">
                          <div className="font-medium text-green-700 dark:text-green-300 text-sm mb-1">
                            {feature.name}
                          </div>
                          <div className="text-xs text-green-600 dark:text-green-400">
                            {feature.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Separator className="my-8" />

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button 
          onClick={onConfirm}
          disabled={isLoading}
          size="lg"
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium px-8 py-3 shadow-lg"
        >
          <Check className="h-5 w-5 mr-2" />
          Perfect! Start the Analysis
        </Button>
        <Button 
          variant="outline"
          onClick={onRequestChanges}
          disabled={isLoading}
          size="lg"
          className="border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium px-8 py-3"
        >
          <Edit className="h-5 w-5 mr-2" />
          I Need to Make Changes
        </Button>
      </div>
    </div>
  );
}
