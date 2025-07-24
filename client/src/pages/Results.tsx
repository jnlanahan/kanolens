import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import KanoTable from "@/components/KanoTable/KanoTable";
import { ArrowLeft, Download, Share, BarChart3, Users, Calendar, FileText, Presentation, Link, ChevronDown } from "lucide-react";
import type { AnalysisSession } from "@shared/schema";

export default function Results() {
  const { sessionId } = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);

  // Fetch session details
  const { data: session, isLoading, error } = useQuery({
    queryKey: [`/api/analysis/sessions/${sessionId}`],
    enabled: !!sessionId,
    retry: false,
  });

  const handleBackToDashboard = () => {
    setLocation("/dashboard");
  };

  const handleEditTable = () => {
    // Refresh the session data when table is edited
    queryClient.invalidateQueries({ 
      queryKey: [`/api/analysis/sessions/${sessionId}`] 
    });
  };

  const handleExportPDF = async () => {
    setShowExportMenu(false);
    try {
      const response = await fetch(`/api/analysis/sessions/${sessionId}/export/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session?.title || 'Analysis'} - Report.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('PDF export failed:', error);
      // TODO: Show error toast
    }
  };

  const handleExportPowerPoint = async () => {
    setShowExportMenu(false);
    try {
      const response = await fetch(`/api/analysis/sessions/${sessionId}/export/powerpoint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Failed to generate PowerPoint');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session?.title || 'Analysis'} - Slides.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('PowerPoint export failed:', error);
      // TODO: Show error toast
    }
  };

  const handleShareLink = async () => {
    setShowExportMenu(false);
    try {
      const response = await fetch(`/api/analysis/sessions/${sessionId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Failed to create share link');
      
      const data = await response.json();
      await navigator.clipboard.writeText(data.shareUrl);
      // TODO: Show success toast with "Link copied to clipboard"
      console.log('Share link copied to clipboard:', data.shareUrl);
    } catch (error) {
      console.error('Share link failed:', error);
      // TODO: Show error toast
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: "default",
      in_progress: "secondary",
      failed: "destructive",
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        {/* Header Skeleton */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-64 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-96"></div>
            </div>
          </div>
        </div>
        
        {/* Content Skeleton */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
            <div className="h-96 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <Button 
              variant="ghost" 
              onClick={handleBackToDashboard}
              className="flex items-center gap-2 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Analysis Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The requested analysis session could not be found or you don't have access to it.
            </p>
            <Button onClick={handleBackToDashboard}>
              Return to Dashboard
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const hasTableData = session.tableData && 
    session.tableData.products && 
    session.tableData.features && 
    Array.isArray(session.tableData.products) &&
    Array.isArray(session.tableData.features) &&
    session.tableData.products.length > 0 &&
    session.tableData.features.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={handleBackToDashboard}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {session.title}
                </h1>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">
                    {getStatusBadge(session.status)}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 text-sm">
                    Created {formatDate(session.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Export Actions */}
            {hasTableData && (
              <div className="flex items-center gap-2">
                <div className="relative" ref={exportMenuRef}>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                    onClick={() => setShowExportMenu(!showExportMenu)}
                  >
                    <Download className="w-4 h-4" />
                    Export
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  
                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-gray-200 dark:border-slate-700 z-10">
                      <div className="py-1">
                        <button
                          onClick={handleExportPDF}
                          className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                        >
                          <FileText className="w-4 h-4" />
                          PDF Report
                        </button>
                        <button
                          onClick={handleExportPowerPoint}
                          className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                        >
                          <Presentation className="w-4 h-4" />
                          PowerPoint Slides
                        </button>
                        <button
                          onClick={handleShareLink}
                          className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                        >
                          <Link className="w-4 h-4" />
                          Share Link
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compact Analysis Summary */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              {/* Products */}
              {session.products && Array.isArray(session.products) && session.products.length > 0 && (
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-gray-900 dark:text-white">Products:</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {session.products.slice(0, 3).join(', ')}
                    {session.products.length > 3 && ` +${session.products.length - 3} more`}
                  </span>
                </div>
              )}

              {/* Target Customer */}
              {session.targetCustomer && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-gray-900 dark:text-white">Target:</span>
                  <span className="text-gray-600 dark:text-gray-400">{session.targetCustomer}</span>
                </div>
              )}

              {/* Analysis Stats */}
              {hasTableData && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-gray-900 dark:text-white">Analysis:</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {session.tableData.products.length} products, {session.tableData.features.length} features
                  </span>
                </div>
              )}

              {/* Status Badge */}
              <div className="ml-auto">
                {getStatusBadge(session.status)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kano Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
          {hasTableData ? (
            <div className="min-h-[600px] max-h-[85vh] overflow-auto">
              <KanoTable
                tableData={session.tableData}
                isLoading={false}
                sessionId={sessionId ? parseInt(sessionId) : null}
                onEditTable={handleEditTable}
              />
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Analysis In Progress
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Your competitive analysis is still being processed. The Kano Model table will appear here once the AI agents complete their work.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Processing analysis...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}