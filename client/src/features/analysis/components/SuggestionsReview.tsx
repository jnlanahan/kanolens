import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface SuggestionData {
  originalProducts: string[];
  suggestedProducts: string[];
  features: string[];
  targetCustomer: string;
}

interface SuggestionsReviewProps {
  suggestions: SuggestionData;
  onProceed: (finalData: {
    products: string[];
    features: string[];
    targetCustomer: string;
  }) => void;
  onBack: () => void;
}

export default function SuggestionsReview({ 
  suggestions, 
  onProceed, 
  onBack 
}: SuggestionsReviewProps) {
  const [localSuggestions, setLocalSuggestions] = useState<SuggestionData>(suggestions);
  const [manualProduct, setManualProduct] = useState('');

  const handleRemoveProduct = (type: 'original' | 'suggested', index: number) => {
    setLocalSuggestions(prev => ({
      ...prev,
      [type === 'original' ? 'originalProducts' : 'suggestedProducts']: 
        prev[type === 'original' ? 'originalProducts' : 'suggestedProducts'].filter((_, i) => i !== index)
    }));
  };

  const handleAddManualProduct = () => {
    if (manualProduct.trim()) {
      setLocalSuggestions(prev => ({
        ...prev,
        suggestedProducts: [...prev.suggestedProducts, manualProduct.trim()]
      }));
      setManualProduct('');
    }
  };

  const handleProceed = () => {
    const allProducts = [...localSuggestions.originalProducts, ...localSuggestions.suggestedProducts];
    onProceed({
      products: allProducts,
      features: localSuggestions.features,
      targetCustomer: localSuggestions.targetCustomer
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">AI-Enhanced Analysis Setup</CardTitle>
          <CardDescription>
            Review and customize your analysis setup. Add or remove products as needed.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Your Original Products</h3>
                <div className="flex flex-wrap gap-2">
                  {localSuggestions.originalProducts.map((product, index) => (
                    <Badge key={index} variant="default" className="relative group">
                      {product}
                      <button
                        onClick={() => handleRemoveProduct('original', index)}
                        className="ml-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">AI Suggested Products</h3>
                <div className="flex flex-wrap gap-2">
                  {localSuggestions.suggestedProducts.map((product, index) => (
                    <Badge key={index} variant="secondary" className="relative group">
                      {product}
                      <button
                        onClick={() => handleRemoveProduct('suggested', index)}
                        className="ml-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Add Manual Product */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold">Add Another Product</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Notion, Figma"
                    value={manualProduct}
                    onChange={(e) => setManualProduct(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddManualProduct()}
                  />
                  <Button 
                    onClick={handleAddManualProduct}
                    disabled={!manualProduct.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Key Features</h3>
              <div className="flex flex-wrap gap-2">
                {localSuggestions.features.map((feature, index) => (
                  <Badge key={index} variant="outline">{feature}</Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Target Customer</h3>
            <Badge variant="default" className="text-sm">
              {localSuggestions.targetCustomer}
            </Badge>
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              onClick={handleProceed} 
              className="flex-1"
              size="lg"
            >
              Proceed with Analysis
            </Button>
            <Button 
              variant="outline" 
              onClick={onBack}
              size="lg"
            >
              Back to Form
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}