import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Download, Share, Edit, Clock, Brain, Users, Check, Send } from "lucide-react";
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

const getRatingBadge = (rating: string, category: string) => {
  // Handle blank/empty ratings
  if (!rating || rating.trim() === '') {
    return "bg-gray-50 dark:bg-gray-800/30 text-gray-400 dark:text-gray-500";
  }
  
  if (category === "performance") {
    const colorMap = {
      "High": "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200",
      "Medium": "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200",
      "Low": "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200",
    };
    return colorMap[rating] || "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200";
  } else {
    const colorMap = {
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

  const handleExport = useCallback(async () => {
    if (!tableData) return;
    
    try {
      // Create CSV content
      const csvHeaders = ['Feature', 'Category', 'Description', 'Customer Benefit', ...tableData.products];
      const csvRows = tableData.features.map(feature => [
        feature.name,
        feature.category,
        feature.description,
        feature.customerBenefit,
        ...tableData.products.map(product => tableData.ratings[feature.id]?.[product] || '')
      ]);
      
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'kano-analysis.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: "Your Kano analysis has been exported as CSV.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting your analysis.",
        variant: "destructive",
      });
    }
  }, [tableData, toast]);

  const handleShare = useCallback(async () => {
    if (!tableData) return;
    
    try {
      const shareData = {
        title: 'Kano Model Analysis',
        text: `Competitive analysis of ${tableData.products.join(', ')} with ${tableData.features.length} features analyzed.`,
        url: window.location.href,
      };
      
      if (navigator.share) {
        await navigator.share(shareData);
        toast({
          title: "Shared Successfully",
          description: "Your Kano analysis has been shared.",
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        toast({
          title: "Link Copied",
          description: "Analysis link has been copied to your clipboard.",
        });
      }
    } catch (error) {
      toast({
        title: "Share Failed",
        description: "There was an error sharing your analysis.",
        variant: "destructive",
      });
    }
  }, [tableData, toast]);

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
      
      // Add AI response to chat
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.aiMessage.content 
      }]);
      
      // If the AI response indicates table data was updated, trigger a refresh
      if (result.aiMessage && onEditTable) {
        // Close the chat modal immediately
        setIsEditChatOpen(false);
        
        // Clear chat messages for next time
        setChatMessages([]);
        
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
    <div className="flex flex-col h-full">
      {/* Table Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 kano-gradient-light">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-mono-heading text-lg font-semibold text-gray-900 dark:text-white">
              Kano Model Comparison
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Real-time competitive analysis • Last updated: just now
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={handleShare} variant="outline" size="sm">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button onClick={handleEditTableClick} variant="default" size="sm" className="kano-gradient text-white">
              <Edit className="h-4 w-4 mr-2" />
              Edit Table
            </Button>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto p-4">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
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
                          return (
                            <td key={product} className="p-4 text-center">
                              <Badge className={getRatingBadge(rating, category)}>
                                {rating === "Yes" && "✓ Yes"}
                                {rating === "No" && "✗ No"}
                                {rating !== "Yes" && rating !== "No" && rating}
                              </Badge>
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

        {/* Analysis Summary Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 kano-gradient-light border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-2 mb-3">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-mono-heading font-semibold text-gray-900 dark:text-white">Under 10 Minutes</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Complete analysis time</p>
          </Card>

          <Card className="p-4 kano-gradient-light border-purple-200 dark:border-purple-800">
            <div className="flex items-center space-x-2 mb-3">
              <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-mono-heading font-semibold text-gray-900 dark:text-white">AI-Powered</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Smart feature categorization</p>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-center space-x-2 mb-3">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="font-mono-heading font-semibold text-gray-900 dark:text-white">Shareable</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Instant collaboration</p>
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
  );
}
