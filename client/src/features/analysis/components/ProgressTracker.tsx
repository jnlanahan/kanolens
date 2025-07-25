import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, Loader2 } from "lucide-react";

export interface AgentProgress {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'waiting' | 'working' | 'completed';
  currentTask?: string;
  progress?: number;
  timeEstimate?: string;
}

interface ProgressTrackerProps {
  agents: AgentProgress[];
  sessionId?: number | null;
}

export default function ProgressTracker({ agents, sessionId }: ProgressTrackerProps) {
  const getStatusIcon = (status: AgentProgress['status']) => {
    switch (status) {
      case 'waiting':
        return <Clock className="h-5 w-5 text-gray-400" />;
      case 'working':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: AgentProgress['status']) => {
    switch (status) {
      case 'waiting':
        return 'bg-gray-100 border-gray-200';
      case 'working':
        return 'bg-blue-50 border-blue-200';
      case 'completed':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-100 border-gray-200';
    }
  };

  const completedAgents = agents.filter(agent => agent.status === 'completed').length;
  const totalProgress = (completedAgents / agents.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Analysis in Progress</CardTitle>
          <CardDescription>
            Our AI agents are working together to analyze your competitive landscape
            {sessionId && ` (Session ${sessionId})`}
          </CardDescription>
          
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(totalProgress)}%</span>
            </div>
            <Progress value={totalProgress} className="w-full" />
            <p className="text-xs text-muted-foreground">
              {completedAgents} of {agents.length} agents completed
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {agents.map((agent, index) => {
              const IconComponent = agent.icon;
              
              return (
                <Card 
                  key={agent.name} 
                  className={`transition-all duration-300 ${getStatusColor(agent.status)}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white border-2 border-current">
                          <IconComponent className="h-6 w-6" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{agent.name}</h3>
                          {getStatusIcon(agent.status)}
                          <Badge variant={
                            agent.status === 'completed' ? 'default' :
                            agent.status === 'working' ? 'secondary' : 'outline'
                          }>
                            {agent.status}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {agent.currentTask}
                        </p>
                        
                        {agent.status === 'working' && agent.progress !== undefined && (
                          <div className="space-y-1">
                            <Progress value={agent.progress} className="w-full h-2" />
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>{agent.progress}% complete</span>
                              {agent.timeEstimate && (
                                <span>Est. {agent.timeEstimate}</span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {agent.status === 'waiting' && agent.timeEstimate && (
                          <p className="text-xs text-gray-500">
                            Estimated time: {agent.timeEstimate}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
              <span className="font-medium text-blue-900">Real-time Analysis</span>
            </div>
            <p className="text-sm text-blue-700">
              This analysis is running in real-time. Each agent specializes in different aspects 
              of competitive intelligence to provide you with comprehensive insights.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}