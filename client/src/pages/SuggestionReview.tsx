import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowRight, Check, X, Plus, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import PageLayout from "@/components/Layout/PageLayout";
import StandardHeader from "@/components/Layout/StandardHeader";

interface SuggestionData {
  productInterpretation: string;
  suggestedProducts: Array<{
    name: string;
    reason: string;
  }>;
  suggestedFeatures: string[];
}

interface FormData {
  description: string;
  products: string;
  targetCustomers: string;
  features: string;
}

export default function SuggestionReview() {
  const [, setLocation] = useLocation();
  const [originalData, setOriginalData] = useState<FormData | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionData | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [newProduct, setNewProduct] = useState('');
  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    const setupData = localStorage.getItem('analysisSetup');
    const suggestionsData = localStorage.getItem('analysisSuggestions');
    
    if (!setupData || !suggestionsData) {
      toast({
        title: "Missing Data",
        description: "Please start from the setup page.",
        variant: "destructive",
      });
      setLocation("/analysis/setup");
      return;
    }

    const parsed = JSON.parse(setupData);
    const parsedSuggestions = JSON.parse(suggestionsData);
    
    setOriginalData(parsed);
    setSuggestions(parsedSuggestions);
    
    const originalProducts = parsed.products.split(',').map((p: string) => p.trim()).filter(Boolean);
    setSelectedProducts([...originalProducts, ...parsedSuggestions.suggestedProducts.map((p: any) => p.name)]);
    setSelectedFeatures([...parsedSuggestions.suggestedFeatures]);
  }, [setLocation]);

  const proceedMutation = useMutation({
    mutationFn: async (finalData: any) => {
      const response = await apiRequest("POST", "/api/analysis/start", finalData);
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem('analysisSession', JSON.stringify(data));
      setLocation(`/analysis/${data.sessionId}/progress`);
    },
    onError: (error) => {
      toast({
        title: "Failed to Start Analysis",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleProduct = (product: string) => {
    setSelectedProducts(prev => 
      prev.includes(product) 
        ? prev.filter(p => p !== product)
        : [...prev, product]
    );
  };

  const toggleFeature = (feature: string) => {
    setSelectedFeatures(prev => 
      prev.includes(feature) 
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const addCustomProduct = () => {
    if (newProduct.trim() && !selectedProducts.includes(newProduct.trim())) {
      setSelectedProducts(prev => [...prev, newProduct.trim()]);
      setNewProduct('');
    }
  };

  const addCustomFeature = () => {
    if (newFeature.trim() && !selectedFeatures.includes(newFeature.trim())) {
      setSelectedFeatures(prev => [...prev, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const handleProceed = () => {
    if (selectedProducts.length < 2) {
      toast({
        title: "Need More Products",
        description: "Please select at least 2 products to compare.",
        variant: "destructive",
      });
      return;
    }

    const finalData = {
      ...originalData,
      products: selectedProducts,
      features: selectedFeatures,
    };

    proceedMutation.mutate(finalData);
  };

  if (!originalData || !suggestions) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading suggestions...</p>
        </div>
      </div>
    );
  }

  const originalProducts = originalData.products.split(',').map(p => p.trim()).filter(Boolean);

  const headerActions = (
    <Button 
      variant="outline" 
      size="sm"
      onClick={() => setLocation("/analysis/setup")}
      className="flex items-center gap-2"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to Setup
    </Button>
  );

  return (
    <PageLayout>
      <StandardHeader 
        title="kanolens" 
        subtitle="Review AI Suggestions"
        actions={headerActions}
      />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Products to Compare */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Products to Compare ({selectedProducts.length})
          </h2>
          <div className="space-y-4">
            
            {/* Original Products */}
            <div>
              <h4 className="font-medium text-green-700 dark:text-green-400 mb-2">Your Products</h4>
              <div className="space-y-2">
                {originalProducts.map(product => (
                  <div key={product} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                    <span className="font-medium">{product}</span>
                    <Badge variant="outline" className="text-green-700 border-green-300">Original</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Products */}
            {suggestions.suggestedProducts.length > 0 && (
              <div>
                <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">AI Suggestions</h4>
                <div className="space-y-2">
                  {suggestions.suggestedProducts.map(product => (
                    <div 
                      key={product.name} 
                      className={`p-3 rounded border cursor-pointer transition-colors ${
                        selectedProducts.includes(product.name)
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                          : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600'
                      }`}
                      onClick={() => toggleProduct(product.name)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{product.name}</span>
                            {selectedProducts.includes(product.name) ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <X className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{product.reason}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Custom Product */}
            <div>
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Add Custom Product</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter product name"
                  value={newProduct}
                  onChange={(e) => setNewProduct(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomProduct()}
                />
                <Button onClick={addCustomProduct} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Features to Analyze */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Features to Analyze ({selectedFeatures.length})
          </h2>
          <div className="space-y-4">
            
            {/* Suggested Features */}
            {suggestions.suggestedFeatures.length > 0 && (
              <div>
                <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">AI Suggested Features</h4>
                <div className="space-y-2">
                  {suggestions.suggestedFeatures.map(feature => (
                    <div 
                      key={feature} 
                      className={`p-2 rounded border cursor-pointer transition-colors flex items-center justify-between ${
                        selectedFeatures.includes(feature)
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                          : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600'
                      }`}
                      onClick={() => toggleFeature(feature)}
                    >
                      <span>{feature}</span>
                      {selectedFeatures.includes(feature) ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Custom Feature */}
            <div>
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Add Custom Feature</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter feature name"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomFeature()}
                />
                <Button onClick={addCustomFeature} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Bottom Status and Action */}
        <div className="mt-8 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {selectedProducts.length} products • {selectedFeatures.length} features selected
          </div>
          <Button 
            onClick={handleProceed}
            size="lg"
            disabled={selectedProducts.length < 2 || proceedMutation.isPending}
            className="flex items-center gap-2"
          >
            {proceedMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Starting Analysis...
              </>
            ) : (
              <>
                Start Analysis
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </main>
    </PageLayout>
  );
}