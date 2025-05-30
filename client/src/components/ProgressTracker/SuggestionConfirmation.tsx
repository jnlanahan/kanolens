import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Edit3, ArrowRight } from "lucide-react";

interface SuggestionConfirmationProps {
  originalProducts: string[];
  suggestedProducts: string[];
  originalRequest: string;
  onConfirm: () => void;
  onModify: (newRequest: string) => void;
  isLoading?: boolean;
}

export default function SuggestionConfirmation({
  originalProducts,
  suggestedProducts,
  originalRequest,
  onConfirm,
  onModify,
  isLoading = false
}: SuggestionConfirmationProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [modifiedRequest, setModifiedRequest] = useState(originalRequest);

  const handleModify = () => {
    onModify(modifiedRequest);
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      {/* Analysis Request */}
      <Card className="p-4">
        <h3 className="font-medium text-gray-900 dark:text-white mb-3">
          Analysis Request
        </h3>
        
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={modifiedRequest}
              onChange={(e) => setModifiedRequest(e.target.value)}
              placeholder="Describe your analysis request..."
              className="min-h-20"
            />
            <div className="flex space-x-2">
              <Button onClick={handleModify} size="sm">
                Update Request
              </Button>
              <Button 
                onClick={() => setIsEditing(false)} 
                variant="outline" 
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {originalRequest}
            </p>
            <Button 
              onClick={() => setIsEditing(true)} 
              variant="outline" 
              size="sm"
              className="w-fit"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Modify Request
            </Button>
          </div>
        )}
      </Card>

      {/* Product Analysis */}
      <Card className="p-4">
        <h3 className="font-medium text-gray-900 dark:text-white mb-3">
          Products to Analyze
        </h3>
        
        <div className="space-y-4">
          {/* Original Products */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Products
            </h4>
            <div className="flex flex-wrap gap-2">
              {originalProducts.map((product) => (
                <Badge 
                  key={product} 
                  variant="secondary"
                  className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                >
                  {product}
                </Badge>
              ))}
            </div>
          </div>

          {/* Suggested Products */}
          {suggestedProducts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                AI Suggested Competitors
              </h4>
              <div className="flex flex-wrap gap-2">
                {suggestedProducts.map((product) => (
                  <Badge 
                    key={product} 
                    variant="secondary"
                    className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {product}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Total Analysis */}
          <div className="pt-3 border-t border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">
                Total products for analysis: {originalProducts.length + suggestedProducts.length}
              </span>
            </p>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <Button 
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? (
            'Starting Analysis...'
          ) : (
            <>
              Proceed with Analysis
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
        
        <Button 
          onClick={() => setIsEditing(true)}
          variant="outline"
          disabled={isLoading}
        >
          <Edit3 className="h-4 w-4 mr-2" />
          Modify
        </Button>
      </div>
    </div>
  );
}