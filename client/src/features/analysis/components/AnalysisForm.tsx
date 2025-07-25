import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FormData {
  description: string;
  products: string;
  targetCustomers: string;
  features: string;
}

interface AnalysisFormProps {
  onFormSubmit: (formData: FormData) => Promise<void>;
  onOpenArchitecture?: () => void;
  isLoading?: boolean;
}

export default function AnalysisForm({ 
  onFormSubmit, 
  onOpenArchitecture, 
  isLoading = false 
}: AnalysisFormProps) {
  const [formData, setFormData] = useState<FormData>({
    description: '',
    products: '',
    targetCustomers: '',
    features: ''
  });
  const { toast } = useToast();

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.products.trim() || !formData.targetCustomers.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in both Products to Compare and Target Customers fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      await onFormSubmit(formData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process form submission. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Start Your Competitive Analysis</CardTitle>
          <CardDescription>
            Tell us about your products and target customers to get started
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="description">What are you analyzing? (Optional)</Label>
              <Textarea
                id="description"
                placeholder="e.g., AI photo editing tools for social media creators"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="min-h-20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="products">Products to Compare *</Label>
              <Input
                id="products"
                placeholder="e.g., Canva, Adobe Express, Figma"
                required
                value={formData.products}
                onChange={(e) => handleInputChange('products', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetCustomers">Target Customers *</Label>
              <Input
                id="targetCustomers"
                placeholder="e.g., small business owners, students, freelancers"
                required
                value={formData.targetCustomers}
                onChange={(e) => handleInputChange('targetCustomers', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="features">Specific Features to Analyze (Optional)</Label>
              <Textarea
                id="features"
                placeholder="e.g., pricing, templates, collaboration, export options"
                value={formData.features}
                onChange={(e) => handleInputChange('features', e.target.value)}
                className="min-h-20"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Start Analysis"
              )}
            </Button>
          </form>

          {onOpenArchitecture && (
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={onOpenArchitecture}>
                <Brain className="mr-2 h-4 w-4" />
                View AI Agent Architecture
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}