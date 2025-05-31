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
    <Card className="w-full max-w-2xl mx-auto shadow-2xl border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-950/20 backdrop-blur-sm mb-4">
      <CardHeader className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 dark:from-blue-600/20 dark:to-purple-600/20 border-b border-blue-200 dark:border-blue-700 pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-2xl">🎯</span>
          </div>
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold">
            Start Your Competitive Analysis
          </span>
        </CardTitle>
        <CardDescription className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
          Fill in the details below to begin your Kano Model analysis. All fields are optional but provide better context.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0 p-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3 p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-blue-100 dark:border-blue-800">
            <Label htmlFor="description" className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              What do you want to research?
            </Label>
            <Textarea
              id="description"
              placeholder="e.g., I want a competitive analysis of project management tools like Jira, Asana, and Monday.com..."
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className="min-h-[60px] border-blue-200 dark:border-blue-700 focus:border-blue-500 focus:ring-blue-500/20"
              disabled={disabled}
            />
          </div>

          <div className="space-y-3 p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-purple-100 dark:border-purple-800">
            <Label htmlFor="products" className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Products to Compare
            </Label>
            <Input
              id="products"
              placeholder="e.g., Jira, Asana, Monday.com, Trello, Notion"
              value={formData.products}
              onChange={(e) => handleInputChange("products", e.target.value)}
              className="border-purple-200 dark:border-purple-700 focus:border-purple-500 focus:ring-purple-500/20"
              disabled={disabled}
            />
          </div>

          <div className="space-y-3 p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-green-100 dark:border-green-800">
            <Label htmlFor="targetCustomers" className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Target Customers
            </Label>
            <Input
              id="targetCustomers"
              placeholder="e.g., Product Managers, Development Teams, Small Businesses"
              value={formData.targetCustomers}
              onChange={(e) => handleInputChange("targetCustomers", e.target.value)}
              className="border-green-200 dark:border-green-700 focus:border-green-500 focus:ring-green-500/20"
              disabled={disabled}
            />
          </div>

          <div className="space-y-3 p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-orange-100 dark:border-orange-800">
            <Label htmlFor="features" className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              Features or Benefits to Analyze
            </Label>
            <Textarea
              id="features"
              placeholder="e.g., Task management, collaboration tools, reporting capabilities, integrations, pricing models..."
              value={formData.features}
              onChange={(e) => handleInputChange("features", e.target.value)}
              className="min-h-[60px] border-orange-200 dark:border-orange-700 focus:border-orange-500 focus:ring-orange-500/20"
              disabled={disabled}
            />
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="submit"
              disabled={!hasContent || disabled}
              className="w-full kano-gradient text-white hover:shadow-xl hover:scale-[1.02] transition-all duration-300 text-lg py-6 font-semibold"
            >
              <Send className="h-5 w-5 mr-3" />
              Start Analysis
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}