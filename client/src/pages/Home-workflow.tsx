import React from "react";
import { useAuth } from "@/hooks/useAuth";
import WorkflowSteps from "@/components/Workflow/WorkflowSteps";

export default function Home() {
  const { user } = useAuth();

  const handleAnalysisComplete = (data: any) => {
    // Handle completed analysis
    console.log("Analysis completed:", data);
  };

  return (
    <div className="min-h-screen">
      <WorkflowSteps onAnalysisComplete={handleAnalysisComplete} />
    </div>
  );
}