import AgentArchitectureDiagram from "@/components/AgentArchitectureDiagram";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/Layout/PageLayout";
import StandardHeader from "@/components/Layout/StandardHeader";

export default function AgentArchitecture() {
  const [, setLocation] = useLocation();

  const headerActions = (
    <Button 
      variant="outline" 
      size="sm"
      onClick={() => setLocation("/dashboard")}
      className="flex items-center gap-2"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to Dashboard
    </Button>
  );

  return (
    <PageLayout>
      <StandardHeader 
        title="kanolens" 
        subtitle="Agent Architecture"
        actions={headerActions}
      />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <AgentArchitectureDiagram />
      </main>
    </PageLayout>
  );
}