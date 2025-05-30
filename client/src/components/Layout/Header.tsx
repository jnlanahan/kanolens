import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, Settings, User, LogOut, Wifi, WifiOff, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
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

  const handleSignOut = () => {
    window.location.href = "/api/logout";
  };

  const queryClient = useQueryClient();

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
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 shadow-sm">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Lens-shaped logo */}
          <div className="kano-lens-logo">
            <div className="inner dark:bg-slate-900"></div>
            <div className="core"></div>
          </div>
          <h1 className="text-xl font-mono-heading font-semibold text-gray-900 dark:text-white">
            kanolens
          </h1>
          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            BETA
          </Badge>

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

          <Button onClick={onCreateSession} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Analysis
          </Button>
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