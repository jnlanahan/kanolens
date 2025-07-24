import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, BarChart3, Calendar, Users, Bug, Trash2, CheckSquare, Square } from "lucide-react";
import type { AnalysisSession } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedSessions, setSelectedSessions] = useState<Set<number>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user sessions
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["/api/analysis/sessions"],
    retry: false,
  });

  // Delete sessions mutation
  const deleteSessionsMutation = useMutation({
    mutationFn: async (sessionIds: number[]) => {
      const promises = sessionIds.map(id => 
        fetch(`/api/analysis/sessions/${id}`, { method: 'DELETE' })
      );
      const responses = await Promise.all(promises);
      
      // Check if all deletions were successful
      const failedDeletions = responses.filter(r => !r.ok);
      if (failedDeletions.length > 0) {
        throw new Error(`Failed to delete ${failedDeletions.length} sessions`);
      }
      
      return responses;
    },
    onSuccess: (_, deletedIds) => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis/sessions"] });
      const deletedCount = deletedIds.length;
      setSelectedSessions(new Set());
      toast({
        title: "Sessions Deleted",
        description: `Successfully deleted ${deletedCount} analysis session${deletedCount === 1 ? '' : 's'}.`,
      });
      setShowDeleteDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed", 
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleCreateNew = () => {
    setLocation("/analysis/setup");
  };

  const handleOpenAnalysis = (sessionId: number) => {
    setLocation(`/analysis/${sessionId}/results`);
  };

  const handleSelectSession = (sessionId: number, checked: boolean) => {
    const newSelected = new Set(selectedSessions);
    if (checked) {
      newSelected.add(sessionId);
    } else {
      newSelected.delete(sessionId);
    }
    setSelectedSessions(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedSessions.size === sessions?.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(sessions?.map(s => s.id) || []));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedSessions.size === 0) {
      toast({
        title: "No Sessions Selected",
        description: "Please select at least one analysis session to delete.",
        variant: "destructive",
      });
      return;
    }
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    deleteSessionsMutation.mutate(Array.from(selectedSessions));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                KanoLens Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Welcome back, {user?.firstName || 'User'}
              </p>
            </div>
            <div className="flex items-center gap-3">
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
                onClick={() => setLocation("/debug")} 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2"
              >
                <Bug className="w-4 h-4" />
                Debug Console
              </Button>
              <Button onClick={handleCreateNew} size="lg" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create New Analysis
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
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
                    
                    {session.products && Array.isArray(session.products) && session.products.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <BarChart3 className="w-4 h-4" />
                        {session.products.length} products
                      </div>
                    )}
                    
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
            <Button onClick={handleCreateNew} size="lg" className="flex items-center gap-2 mx-auto">
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
      </div>
    </div>
  );
}