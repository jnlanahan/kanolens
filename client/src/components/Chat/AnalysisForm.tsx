
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Send } from "lucide-react";

interface AnalysisFormProps {
  onSubmit: (formData: AnalysisFormData) => void;
  disabled?: boolean;
}

export interface AnalysisFormData {
  description: string;
  products: string;
  targetCustomers: string;
  features: string;
}

export default function AnalysisForm({ onSubmit, disabled = false }: AnalysisFormProps) {
  const [formData, setFormData] = useState<AnalysisFormData>({
    description: "",
    products: "",
    targetCustomers: "",
    features: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create a comprehensive message from all form fields
    const parts = [];
    
    if (formData.description.trim()) {
      parts.push(`Analysis Request: ${formData.description.trim()}`);
    }
    
    if (formData.products.trim()) {
      parts.push(`Products to Compare: ${formData.products.trim()}`);
    }
    
    if (formData.targetCustomers.trim()) {
      parts.push(`Target Customers: ${formData.targetCustomers.trim()}`);
    }
    
    if (formData.features.trim()) {
      parts.push(`Features/Benefits to Analyze: ${formData.features.trim()}`);
    }
    
    if (parts.length > 0) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof AnalysisFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const hasContent = Object.values(formData).some(value => value.trim().length > 0);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          Start Your Competitive Analysis
        </CardTitle>
        <CardDescription>
          Fill in the details below to begin your Kano Model analysis. All fields are optional but provide better context.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              What do you want to research?
            </Label>
            <Textarea
              id="description"
              placeholder="e.g., I want a competitive analysis of project management tools like Jira, Asana, and Monday.com..."
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className="min-h-[80px]"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="products" className="text-sm font-medium">
              Products to Compare
            </Label>
            <Input
              id="products"
              placeholder="e.g., Jira, Asana, Monday.com, Trello, Notion"
              value={formData.products}
              onChange={(e) => handleInputChange("products", e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetCustomers" className="text-sm font-medium">
              Target Customers
            </Label>
            <Input
              id="targetCustomers"
              placeholder="e.g., Product Managers, Development Teams, Small Businesses"
              value={formData.targetCustomers}
              onChange={(e) => handleInputChange("targetCustomers", e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="features" className="text-sm font-medium">
              Features or Benefits to Analyze
            </Label>
            <Textarea
              id="features"
              placeholder="e.g., Task management, collaboration tools, reporting capabilities, integrations, pricing models..."
              value={formData.features}
              onChange={(e) => handleInputChange("features", e.target.value)}
              className="min-h-[60px]"
              disabled={disabled}
            />
          </div>

          <Button
            type="submit"
            disabled={!hasContent || disabled}
            className="w-full kano-gradient text-white hover:shadow-lg transition-all duration-200"
          >
            <Send className="h-4 w-4 mr-2" />
            Start Analysis
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
