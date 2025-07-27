import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import AnalysisSetup from "@/pages/AnalysisSetup";
import SuggestionReview from "@/pages/SuggestionReview";
import ProgressTracker from "@/pages/ProgressTracker";
import Results from "@/pages/Results";
import AgentArchitecture from "@/pages/AgentArchitecture";
import Debug from "@/pages/Debug";
import Admin from "@/pages/Admin";
import AccountSettings from "@/pages/AccountSettings";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner during authentication check
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route component={() => <Landing />} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/login" component={() => <Dashboard />} />
      <Route path="/register" component={() => <Dashboard />} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/analysis/setup" component={AnalysisSetup} />
      <Route path="/analysis/suggestions" component={SuggestionReview} />
      <Route path="/analysis/:sessionId/progress" component={ProgressTracker} />
      <Route path="/analysis/:sessionId/results" component={Results} />
      <Route path="/agent-architecture" component={AgentArchitecture} />
      <Route path="/debug" component={Debug} />
      <Route path="/admin" component={Admin} />
      <Route path="/account" component={AccountSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
