import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, Settings, User, LogOut, Wifi, WifiOff, Trash2, Edit, Check, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import type { AnalysisSession } from "@shared/schema";

interface HeaderProps {
  onCreateSession: () => void;
  sessions: AnalysisSession[];
  currentSessionId: number | null;
  onSessionSelect: (id: number) => void;
}

export default function Header({ 
  onCreateSession, 
  sessions, 
  currentSessionId, 
  onSessionSelect 
}: HeaderProps) {
  // Check OpenAI connection status
  const { data: openaiStatus } = useQuery({
    queryKey: ["/api/openai/test"],
    refetchInterval: 30000, // Check every 30 seconds
    retry: false,
  });

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState("");

  const handleSignOut = () => {
    window.location.href = "/api/logout";
  };

  const queryClient = useQueryClient();

  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      return apiRequest("PUT", `/api/analysis/sessions/${id}`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis/sessions"] });
      toast({
        title: "Session updated",
        description: "The session title has been successfully updated.",
      });
      setIsEditingTitle(false);
    },
    onError: () => {
      toast({
        title: "Error updating session",
        description: "Failed to update the session title. Please try again.",
        variant: "destructive",
      });
      setIsEditingTitle(false);
    },
  });

  const handleStartEditing = () => {
    if (currentSession) {
      setEditingTitle(currentSession.title);
      setIsEditingTitle(true);
    }
  };

  const handleSaveTitle = () => {
    if (currentSession && editingTitle.trim() && editingTitle !== currentSession.title) {
      updateSessionMutation.mutate({ id: currentSession.id, title: editingTitle.trim() });
    } else {
      setIsEditingTitle(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingTitle(false);
    setEditingTitle("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveTitle();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const deleteSessionMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/analysis/sessions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis/sessions"] });
      toast({
        title: "Session deleted",
        description: "The session has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error deleting session",
        description: "Failed to delete the session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteSession = (id: number) => {
    deleteSessionMutation.mutate(id);
  };

  return (
    <header className="border-b border-white/20 dark:border-slate-700/50 glass-card shadow-lg backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 animate-slide-in-right">
            <div className="kano-lens-logo">
              <div className="inner"></div>
              <div className="core"></div>
            </div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-mono-heading font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                kanolens
              </h1>
              {currentSession && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">•</span>
                  {isEditingTitle ? (
                    <div className="flex items-center space-x-1">
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="h-7 px-2 text-sm min-w-[200px]"
                        autoFocus
                        onBlur={handleSaveTitle}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSaveTitle}
                        disabled={updateSessionMutation.isPending}
                        className="h-7 w-7 p-0 hover:bg-green-100 dark:hover:bg-green-900/20"
                      >
                        <Check className="h-3 w-3 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        className="h-7 w-7 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                      >
                        <X className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 group">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {currentSession.title}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleStartEditing}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-slate-700"
                        title="Edit session title"
                      >
                        <Edit className="h-3 w-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <Badge variant="secondary" className="text-xs glass-button border-blue-200 text-blue-700 dark:text-blue-300 animate-pulse-gentle">
              BETA
            </Badge>
          </div>

          {/* Session Selector */}
          {sessions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-4">
                  {currentSession?.title || "Select Session"}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {sessions.map((session) => (
                  <DropdownMenuItem
                    key={session.id}
                    onClick={() => onSessionSelect(session.id)}
                    className={currentSessionId === session.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{session.title}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {session.status} • {session.currentStep}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session.id);
                      }}
                      disabled={deleteSessionMutation.isPending}
                      className="ml-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div 
            onClick={onCreateSession}
            className="group relative cursor-pointer"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-xl blur opacity-20 group-hover:opacity-60 transition duration-500"></div>
            <div className="relative px-6 py-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 group-hover:border-transparent transition-all duration-300 shadow-lg group-hover:shadow-xl">
              <div className="flex items-center space-x-3">
                <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <Plus className="h-4 w-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    New Analysis
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Start fresh
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* OpenAI Status Indicator */}
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border ${
            openaiStatus?.connected 
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
              : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              openaiStatus?.connected 
                ? "bg-green-500 animate-pulse-gentle" 
                : "bg-red-500"
            }`}></div>
            <span className={`text-sm font-medium ${
              openaiStatus?.connected 
                ? "text-green-700 dark:text-green-300" 
                : "text-red-700 dark:text-red-300"
            }`}>
              {openaiStatus?.connected ? "AI Ready" : "AI Offline"}
            </span>
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">Account</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}