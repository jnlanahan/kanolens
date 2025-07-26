import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Clock, Brain, Users, Check, Send, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import FeatureModal from "./FeatureModal";
import type { KanoTableData, KanoFeature } from "@shared/schema";

interface KanoTableProps {
  tableData?: KanoTableData;
  isLoading: boolean;
  sessionId: number | null;
  onEditTable?: () => void;
}

const categoryColors = {
  "must-have": "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100",
  "performance": "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-100",
  "delighter": "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-100",
};

const categoryIcons = {
  "must-have": "⚪",
  "performance": "🟠", 
  "delighter": "🟣",
};

const categoryLabels = {
  "must-have": "MUST-HAVE FEATURES",
  "performance": "PERFORMANCE BENEFITS",
  "delighter": "DELIGHTER FEATURES",
};

const categoryDefinitions = {
  "must-have": "Essential features that customers expect. If missing, customers will be dissatisfied, but having them doesn't increase satisfaction beyond neutral.",
  "performance": "Features where more is better. Customer satisfaction increases linearly with performance improvements (speed, capacity, quality, etc.).",
  "delighter": "Unexpected features that surprise and delight customers. Their absence doesn't cause dissatisfaction, but their presence creates excitement.",
};

const getRatingBadge = (rating: string, category: string) => {
  // Handle blank/empty ratings
  if (!rating || rating.trim() === '') {
    return "bg-gray-50 dark:bg-gray-800/30 text-gray-400 dark:text-gray-500";
  }
  
  if (category === "performance") {
    const colorMap: Record<string, string> = {
      "High": "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200",
      "Medium": "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200",
      "Low": "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200",
    };
    return colorMap[rating] || "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200";
  } else {
    const colorMap: Record<string, string> = {
      "Yes": "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200",
      "No": "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200",
      "Maybe": "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200",
    };
    return colorMap[rating] || "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200";
  }
};

export default function KanoTable({ tableData, isLoading, sessionId, onEditTable }: KanoTableProps) {
  const [selectedFeature, setSelectedFeature] = useState<KanoFeature | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditChatOpen, setIsEditChatOpen] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFeatureClick = useCallback((feature: KanoFeature) => {
    setSelectedFeature(feature);
    setIsModalOpen(true);
  }, []);

  const handleCellClick = useCallback((feature: KanoFeature, product: string, rating: string, justification: string, sources: string[]) => {
    // Use the main FeatureModal for cell clicks instead of the simpler cell modal
    // This provides the complete analysis including Market Analysis and Strategic Recommendations
    setSelectedFeature(feature);
    setIsModalOpen(true);
  }, []);


  const handleEditTableClick = useCallback(() => {
    setIsEditChatOpen(true);
    // Always reset chat to provide fresh start
    setChatMessages([{
      role: 'assistant',
      content: "Hi! I'm here to help you modify your Kano analysis table. What would you like to change? You can:\n\n• Add or remove features\n• Modify product comparisons\n• Update feature descriptions\n• Change categorizations\n• Add new products to compare\n\nWhat specific changes would you like to make?"
    }]);
  }, []);

  const handleSendEditMessage = useCallback(async () => {
    if (!editMessage.trim() || !sessionId) return;
    
    const userMessage = editMessage.trim();
    setEditMessage("");
    setIsProcessing(true);
    
    // Add user message to chat
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    try {
      // Send message to the chat API for processing
      const response = await fetch(`/api/analysis/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: `Table Edit Request: ${userMessage}`,
          metadata: { editRequest: true, currentTableData: tableData }
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to process edit request');
      }
      
      const result = await response.json();
      
      // If the AI response indicates table data was updated, trigger a refresh
      if (result.aiMessage?.metadata?.isTableEditResponse && onEditTable) {
        // Add AI response to chat first, so user sees it briefly
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: result.aiMessage.content 
        }]);
        
        // Small delay to let user see the success message
        setTimeout(() => {
          // Close the chat modal
          setIsEditChatOpen(false);
          
          // Clear chat messages for next time
          setChatMessages([]);
        }, 1000);
        
        // Call the parent component to refresh the session data
        onEditTable();
        
        // Show success toast with more specific message
        toast({
          title: "Table Updated Successfully", 
          description: "Your changes have been applied to the analysis table.",
          duration: 3000,
        });
        
        return; // Exit early to avoid duplicate toast
      }
      
      // For non-table-edit responses, add AI response to chat normally
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.aiMessage.content 
      }]);
      
      toast({
        title: "Edit Request Processed",
        description: "Your table modification request has been processed.",
      });
      
    } catch (error) {
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I apologize, but I encountered an error processing your request. Please try again or describe your changes differently." 
      }]);
      
      toast({
        title: "Edit Failed",
        description: "There was an error processing your edit request.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [editMessage, sessionId, tableData, onEditTable, toast]);

  const featuresByCategory = useMemo(() => {
    if (!tableData?.features) return {};
    
    const grouped = tableData.features.reduce((acc, feature) => {
      if (!acc[feature.category]) acc[feature.category] = [];
      acc[feature.category].push(feature);
      return acc;
    }, {} as Record<string, KanoFeature[]>);
    
    // Order categories: must-have first, then performance, then delighter
    const orderedCategories = ['must-have', 'performance', 'delighter'];
    const ordered: Record<string, KanoFeature[]> = {};
    
    orderedCategories.forEach(category => {
      if (grouped[category]) {
        ordered[category] = grouped[category];
      }
    });
    
    return ordered;
  }, [tableData?.features]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <Skeleton className="h-6 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex-1 p-4">
          <Card className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!tableData || !tableData.features || tableData.features.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 kano-gradient-light">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-mono-heading text-lg font-semibold text-gray-900 dark:text-white">
                Kano Model Comparison
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Waiting for analysis to begin
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="p-8 text-center max-w-md">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
              No Analysis Data Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Start a conversation in the chat to begin your competitive analysis. 
              The AI will generate your Kano Model comparison table as we progress through the analysis.
            </p>
          </Card>
        </div>
      </div>
    );
  }



  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Table Actions */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 kano-gradient-light">
          <div className="flex items-center justify-start">
            <div className="flex items-center space-x-2">
              <Button onClick={handleEditTableClick} variant="default" size="sm" className="kano-gradient text-white">
                <Edit className="h-4 w-4 mr-2" />
                Edit Table
              </Button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-4">
            <Card className="overflow-hidden">
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                      <th className="text-left p-4 font-semibold text-gray-900 dark:text-white min-w-64">
                        Feature/Benefit
                      </th>
                      {tableData.products.map((product) => (
                        <th key={product} className="text-center p-4 font-semibold text-gray-900 dark:text-white min-w-32">
                          {product}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(featuresByCategory).map(([category, features]) => {
                      const categoryRows = [
                        // Category Header
                        <tr key={`header-${category}`} className={`border-b-2 ${categoryColors[category as keyof typeof categoryColors]}`}>
                          <td colSpan={tableData.products.length + 1} className="p-3">
                            <div className="flex items-center space-x-2">
                              <div className="text-lg">{categoryIcons[category as keyof typeof categoryIcons]}</div>
                              <span className="font-mono-heading font-semibold uppercase tracking-wide text-xs">
                                {categoryLabels[category as keyof typeof categoryLabels]}
                              </span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3 w-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-sm">{categoryDefinitions[category as keyof typeof categoryDefinitions]}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>,
                        // Category Features
                        ...features.map((feature) => (
                          <tr
                            key={feature.id}
                            className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                            onClick={() => handleFeatureClick(feature)}
                          >
                            <td className="p-4">
                              <div className="font-medium text-gray-900 dark:text-white">{feature.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {feature.customerBenefit}
                              </div>
                            </td>
                            {tableData.products.map((product) => {
                              const rating = tableData.ratings[feature.id]?.[product] || "N/A";
                              const justification = tableData.justifications?.[feature.id]?.[product] || "No additional details available";
                              const sources = tableData.sources?.[feature.id] || [];
                              const hasDetails = sources.length > 0 || rating !== "N/A" || justification !== "No additional details available";
                              
                              return (
                                <td key={product} className="p-4 text-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent row click
                                      handleCellClick(feature, product, rating, justification, sources);
                                    }}
                                    className={`${getRatingBadge(rating, category)} ${hasDetails ? 'hover:shadow-md hover:scale-105 transition-all duration-200 cursor-pointer' : ''} inline-flex items-center gap-1`}
                                    disabled={!hasDetails}
                                  >
                                    {rating === "Yes" && "✓ Yes"}
                                    {rating === "No" && "✗ No"}
                                    {rating === "" && "—"} {/* Blank rating for delighters */}
                                    {rating !== "Yes" && rating !== "No" && rating !== "" && rating}
                                    {hasDetails && <span className="ml-1 text-xs opacity-60">🔗</span>}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      ];
                      return categoryRows;
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>

      {/* Feature Detail Modal */}
      <FeatureModal
        feature={selectedFeature}
        tableData={tableData}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Edit Table Chat Modal */}
      <Dialog open={isEditChatOpen} onOpenChange={setIsEditChatOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5" />
              <span>Edit Kano Analysis Table</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col min-h-0">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 border rounded-lg bg-gray-50 dark:bg-slate-800">
              {chatMessages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white dark:bg-slate-700 border'
                  }`}>
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-700 border p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Processing your request...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Chat Input */}
            <div className="mt-4 flex space-x-2">
              <Textarea
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                placeholder="Describe what you'd like to change about the table..."
                className="flex-1 min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendEditMessage();
                  }
                }}
                disabled={isProcessing}
              />
              <Button 
                onClick={handleSendEditMessage} 
                disabled={!editMessage.trim() || isProcessing}
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      </div>
    </TooltipProvider>
  );
}

// Phase 4: Excel Export Functionality
export const exportToExcel = async (tableData: KanoTableData, analysisTitle: string) => {
  const XLSX = await import('xlsx');
  
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Prepare data for Excel with Kano structure
  const excelData: any[] = [];
  
  // Add title row
  excelData.push([analysisTitle]);
  excelData.push([]); // Empty row
  
  // Group features by category
  const groupedFeatures = {
    'must-have': tableData.features?.filter(f => f.category === 'must-have') || [],
    'performance': tableData.features?.filter(f => f.category === 'performance') || [],
    'delighter': tableData.features?.filter(f => f.category === 'delighter') || []
  };
  
  // Create header row
  const headerRow = ['Feature/Benefit', 'Category', 'Description', 'Customer Benefit'];
  if (tableData.products) {
    headerRow.push(...tableData.products);
  }
  
  // Process each category
  Object.entries(groupedFeatures).forEach(([category, features]) => {
    if (features.length === 0) return;
    
    // Add category header
    const categoryLabel = category === 'must-have' ? 'MUST-HAVE FEATURES' :
                         category === 'performance' ? 'PERFORMANCE BENEFITS' :
                         'DELIGHTER FEATURES';
    
    excelData.push([categoryLabel]);
    excelData.push(headerRow);
    
    // Add features for this category
    features.forEach(feature => {
      const row = [
        feature.name || '',
        category.toUpperCase(),
        feature.description || '',
        feature.customerBenefit || ''
      ];
      
      // Add product ratings
      if (tableData.products && tableData.ratings) {
        tableData.products.forEach(product => {
          row.push(tableData.ratings[feature.id]?.[product] || '');
        });
      }
      
      excelData.push(row);
    });
    
    excelData.push([]); // Empty row between categories
  });
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(excelData);
  
  // Set column widths
  const colWidths = [
    { wch: 30 }, // Feature/Benefit
    { wch: 15 }, // Category  
    { wch: 40 }, // Description
    { wch: 30 }, // Customer Benefit
  ];
  
  // Add product column widths
  if (tableData.products) {
    tableData.products.forEach(() => {
      colWidths.push({ wch: 12 });
    });
  }
  
  ws['!cols'] = colWidths;
  
  // Add styling and colors (basic version - more advanced styling would require a different library)
  // Note: xlsx library has limited styling capabilities compared to exceljs
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Kano Analysis');
  
  // Generate filename with current date
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  }).replace(/\//g, '-');
  
  const filename = `${analysisTitle.replace(/[^a-zA-Z0-9\s-]/g, '')} - ${date}.xlsx`;
  
  // Download the file
  XLSX.writeFile(wb, filename);
  
  console.log('Excel export completed:', filename);
};
