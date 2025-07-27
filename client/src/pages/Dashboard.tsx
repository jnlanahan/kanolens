import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Plus, BarChart3, Calendar, Users, Trash2, CheckSquare, Square, Settings, Network, LogOut } from "lucide-react";
import PageLayout from "@/components/Layout/PageLayout";
import StandardHeader from "@/components/Layout/StandardHeader";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import type { AnalysisSession, AnalysisLimits } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedSessions, setSelectedSessions] = useState<Set<number>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user sessions
  const { data: sessions, isLoading } = useQuery<AnalysisSession[]>({
    queryKey: ["/api/analysis/sessions"],
    retry: false,
  });

  // Fetch user analysis limits
  const { data: analysisLimits } = useQuery<AnalysisLimits>({
    queryKey: ["/api/analysis/limits"],
    retry: false,
  });

  // Delete sessions mutation
  const deleteSessionsMutation = useMutation({
    mutationFn: async (sessionIds: number[]) => {
      const results = [];
      let successCount = 0;
      let lastError = null;
      
      // Delete sessions one by one to handle individual failures
      for (const id of sessionIds) {
        try {
          const response = await apiRequest("DELETE", `/api/analysis/sessions/${id}`);
          results.push({ id, success: true });
          successCount++;
        } catch (error) {
          results.push({ id, success: false, error });
          lastError = error;
          console.error(`Failed to delete session ${id}:`, error);
        }
      }
      
      // If all deletions failed, throw the last error
      if (successCount === 0 && lastError) {
        throw lastError;
      }
      
      return { results, successCount, totalCount: sessionIds.length };
    },
    onSuccess: (data, deletedIds) => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analysis/limits"] });
      setSelectedSessions(new Set());
      
      const { successCount, totalCount } = data;
      
      if (successCount === totalCount) {
        toast({
          title: "Sessions Deleted",
          description: `Successfully deleted ${successCount} analysis session${successCount === 1 ? '' : 's'}.`,
        });
      } else if (successCount > 0) {
        toast({
          title: "Partial Success",
          description: `Deleted ${successCount} of ${totalCount} sessions. Some deletions failed.`,
          variant: "destructive",
        });
      }
      
      setShowDeleteDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed", 
        description: error.message || "Failed to delete sessions",
        variant: "destructive",
      });
      setShowDeleteDialog(false);
    }
  });

  const handleCreateNew = () => {
    if (analysisLimits && !analysisLimits.canCreateMore) {
      toast({
        title: "Analysis Limit Reached",
        description: "You have used your free analysis. Delete your current analysis to create a new one, or upgrade to a paid plan (coming soon).",
        variant: "destructive",
      });
      return;
    }
    setLocation("/analysis/setup");
  };

  const handleOpenAnalysis = (sessionId: number) => {
    setLocation(`/analysis/${sessionId}/results`);
  };

<<<<<<< Updated upstream
  const handleSelectSession = useCallback((sessionId: number, checked: boolean) => {
=======
  const handleSignOut = async () => {
    try {
      // Call the JWT logout endpoint
      await apiRequest("POST", "/api/auth/logout");
      
      // Clear local authentication state
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user');
      
      // Redirect to home page
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out error:", error);
      // Even if the API call fails, clear local storage and redirect
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user');
      window.location.href = "/";
    }
  };

  const handleSelectSession = (sessionId: number, checked: boolean) => {
>>>>>>> Stashed changes
    const newSelected = new Set(selectedSessions);
    if (checked) {
      newSelected.add(sessionId);
    } else {
      newSelected.delete(sessionId);
    }
    setSelectedSessions(newSelected);
  }, [selectedSessions]);

  const handleSelectAll = useCallback(() => {
    if (selectedSessions.size === sessions?.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(sessions?.map(s => s.id) || []));
    }
  }, [selectedSessions, sessions]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedSessions.size === 0) {
      toast({
        title: "No Sessions Selected",
        description: "Please select at least one analysis session to delete.",
        variant: "destructive",
      });
      return;
    }
    setShowDeleteDialog(true);
  }, [selectedSessions, toast]);

  const confirmDelete = () => {
    deleteSessionsMutation.mutate(Array.from(selectedSessions));
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "Unknown date";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
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

  const headerActions = useMemo(() => (
    <>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setLocation("/agent-architecture")}
        className="flex items-center gap-2"
      >
        <Network className="w-4 h-4" />
        Agent Architecture
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setLocation("/account")}
        className="flex items-center gap-2"
      >
        <Settings className="w-4 h-4" />
        Account
      </Button>
      {selectedSessions.size > 0 && (
        <>
          <Button 
            onClick={handleDeleteSelected}
            variant="destructive" 
            size="sm" 
            className="flex items-center gap-2"
            disabled={deleteSessionsMutation.isPending}
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected ({selectedSessions.size})
          </Button>
          <Button 
            onClick={() => setSelectedSessions(new Set())}
            variant="outline" 
            size="sm"
          >
            Clear Selection
          </Button>
        </>
      )}
      <Button 
        variant="ghost" 
        size="sm"
        onClick={handleSignOut}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </Button>
    </>
  ), [selectedSessions, handleDeleteSelected, deleteSessionsMutation.isPending, setLocation]);

  return (
    <PageLayout variant="dashboard">
      <StandardHeader 
        title="kanolens" 
        subtitle={`Dashboard - Welcome back, ${user?.firstName || 'User'}`}
        actions={headerActions}
      />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Your Analyses
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage and track your competitive analysis projects
            </p>
          </div>
          <Button 
            onClick={handleCreateNew} 
            size="lg" 
            className="flex items-center gap-2"
            disabled={analysisLimits && !analysisLimits.canCreateMore}
          >
            <Plus className="w-4 h-4" />
            Create New Analysis
          </Button>
        </div>

        {/* Analysis Limits Banner */}
        {analysisLimits && !analysisLimits.isUnlimited && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <BarChart3 className="w-4 h-4" />
                  <span className="font-medium">
                    Analysis Usage: {analysisLimits.current} / {analysisLimits.max}
                  </span>
                </div>
                {!analysisLimits.canCreateMore && (
                  <Badge variant="destructive" className="text-xs">
                    Limit Reached
                  </Badge>
                )}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                {analysisLimits.canCreateMore ? (
                  `${analysisLimits.remainingAnalyses} analysis remaining`
                ) : (
                  "Delete an analysis to create a new one • Paid accounts coming soon!"
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sessions Grid */}
        {isLoading ? (
          <LoadingSkeleton variant="dashboard" />
        ) : sessions && sessions.length > 0 ? (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Your Analyses ({sessions.length})
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedSessions.size > 0 
                    ? `${selectedSessions.size} selected - click Delete Selected to remove them`
                    : 'Click on any analysis to view results or select multiple to delete.'}
                </p>
              </div>
              
              {sessions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="flex items-center gap-2"
                >
                  {selectedSessions.size === sessions.length ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  {selectedSessions.size === sessions.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((session: AnalysisSession) => {
                const isSelected = selectedSessions.has(session.id);
                return (
                  <Card 
                    key={session.id} 
                    className={`relative transition-all ${
                      isSelected 
                        ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/10 shadow-md' 
                        : 'cursor-pointer hover:shadow-lg'
                    }`}
                    onClick={(e) => {
                      // Don't navigate if clicking checkbox area
                      const target = e.target as HTMLElement;
                      if (target.closest('[data-checkbox-area]')) return;
                      handleOpenAnalysis(session.id);
                    }}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            data-checkbox-area
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center"
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => 
                                handleSelectSession(session.id, checked as boolean)
                              }
                              aria-label={`Select ${session.title}`}
                            />
                          </div>
                          <span className="truncate">{session.title}</span>
                        </div>
                        {getStatusBadge(session.status)}
                      </CardTitle>
                    </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      {formatDate(session.createdAt)}
                    </div>
                    
                    {session.targetCustomer && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Users className="w-4 h-4" />
                        {session.targetCustomer}
                      </div>
                    )}
                    
                    {Array.isArray(session.products) && session.products.length > 0 ? (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <BarChart3 className="w-4 h-4" />
                        {session.products.length} products
                      </div>
                    ) : null}
                    
                    <div className="pt-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAnalysis(session.id);
                        }}
                      >
                        View Analysis
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No analyses yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Get started by creating your first competitive analysis. Compare products using the Kano Model framework.
            </p>
            <Button 
              onClick={handleCreateNew} 
              size="lg" 
              className="flex items-center gap-2 mx-auto"
              disabled={analysisLimits && !analysisLimits.canCreateMore}
            >
              <Plus className="w-4 h-4" />
              Create Your First Analysis
            </Button>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Analysis Sessions</DialogTitle>
              <DialogDescription asChild>
                <div>
                  <p>Are you sure you want to delete {selectedSessions.size} analysis session{selectedSessions.size === 1 ? '' : 's'}? This action cannot be undone.</p>
                  
                  {selectedSessions.size > 0 && sessions && (
                    <div className="mt-4 max-h-32 overflow-y-auto">
                      <p className="font-medium text-sm mb-2">Sessions to delete:</p>
                      <ul className="text-sm space-y-1">
                        {Array.from(selectedSessions).map(id => {
                          const session = sessions.find(s => s.id === id);
                          return session && (
                            <li key={id} className="text-gray-600 dark:text-gray-400">
                              • {session.title}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteSessionsMutation.isPending}
              >
                {deleteSessionsMutation.isPending ? 'Deleting...' : `Delete ${selectedSessions.size} Session${selectedSessions.size === 1 ? '' : 's'}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </PageLayout>
  );
}
