import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import AnalysisSetup from "@/pages/AnalysisSetup";
import SuggestionReview from "@/pages/SuggestionReview";
import ProgressTracker from "@/pages/ProgressTracker";
import Results from "@/pages/Results";
import AgentArchitecture from "@/pages/AgentArchitecture";
import Debug from "@/pages/Debug";
import Admin from "@/pages/Admin";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/analysis/setup" component={AnalysisSetup} />
          <Route path="/analysis/suggestions" component={SuggestionReview} />
          <Route path="/analysis/:sessionId/progress" component={ProgressTracker} />
          <Route path="/analysis/:sessionId/results" component={Results} />
          <Route path="/analysis/:id" component={Home} />
          <Route path="/agent-architecture" component={AgentArchitecture} />
          <Route path="/debug" component={Debug} />
          <Route path="/admin" component={Admin} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
