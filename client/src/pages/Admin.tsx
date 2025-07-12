import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  Search, 
  CheckCircle, 
  Target, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  RefreshCw,
  FileText,
  Star
} from "lucide-react";
import type { AgentEvaluation, PromptVersion } from "@shared/schema";

interface EvaluationSummary {
  agentName: string;
  averageScore: number;
  totalEvaluations: number;
  commonWeaknesses: string[];
  commonStrengths: string[];
  trend: 'improving' | 'declining' | 'stable';
}

const agentInfo = {
  orchestrator: {
    name: "Orchestrator",
    icon: Brain,
    description: "Coordinates multi-agent workflow and synthesizes outputs",
    color: "bg-purple-500"
  },
  researcher: {
    name: "Researcher",
    icon: Search,
    description: "Conducts online research with Perplexity AI",
    color: "bg-blue-500"
  },
  validator: {
    name: "Validator",
    icon: CheckCircle,
    description: "Categorizes features using Claude/Anthropic",
    color: "bg-green-500"
  },
  analyst: {
    name: "Analyst",
    icon: Target,
    description: "Provides strategic insights with OpenAI o1",
    color: "bg-orange-500"
  }
};

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<string>("orchestrator");
  const [newPrompt, setNewPrompt] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [newVersion, setNewVersion] = useState("");

  // Fetch evaluations for selected agent
  const { data: evaluations, isLoading: evaluationsLoading } = useQuery<AgentEvaluation[]>({
    queryKey: ['/api/admin/evaluations', selectedAgent],
    queryFn: () => apiRequest(`/api/admin/evaluations?agentName=${selectedAgent}`),
  });

  // Fetch prompt versions for selected agent
  const { data: promptData } = useQuery<{
    versions: PromptVersion[];
    activeVersion: PromptVersion | null;
  }>({
    queryKey: [`/api/admin/prompt-versions/${selectedAgent}`],
  });

  // Create new prompt version mutation
  const createPromptMutation = useMutation({
    mutationFn: async (data: {
      agentName: string;
      version: string;
      prompt: string;
      changeReason: string;
    }) => {
      return apiRequest('/api/admin/prompt-versions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Prompt updated successfully",
        description: "The new prompt version is now active.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/prompt-versions/${selectedAgent}`] });
      setNewPrompt("");
      setChangeReason("");
      setNewVersion("");
    },
    onError: (error) => {
      toast({
        title: "Failed to update prompt",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Test evaluation mutation
  const testEvaluationMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/test-evaluation', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      toast({
        title: "Test evaluation created",
        description: "A test evaluation has been generated to verify the system works.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evaluations'] });
    },
    onError: (error) => {
      toast({
        title: "Test evaluation failed",
        description: "Please check the console for details.",
        variant: "destructive",
      });
    },
  });

  const calculateSummary = (evals: AgentEvaluation[]): EvaluationSummary => {
    if (!evals || evals.length === 0) {
      return {
        agentName: selectedAgent,
        averageScore: 0,
        totalEvaluations: 0,
        commonWeaknesses: [],
        commonStrengths: [],
        trend: 'stable'
      };
    }

    const scores = evals.map(e => e.evaluation.score);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Collect all strengths and weaknesses
    const allStrengths = evals.flatMap(e => e.evaluation.strengths || []);
    const allWeaknesses = evals.flatMap(e => e.evaluation.weaknesses || []);

    // Find common patterns (simplified)
    const commonStrengths = [...new Set(allStrengths)].slice(0, 3);
    const commonWeaknesses = [...new Set(allWeaknesses)].slice(0, 3);

    // Calculate trend (simplified - compare recent vs older)
    const recentScores = scores.slice(-5);
    const olderScores = scores.slice(0, 5);
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
    
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentAvg > olderAvg + 5) trend = 'improving';
    else if (recentAvg < olderAvg - 5) trend = 'declining';

    return {
      agentName: selectedAgent,
      averageScore,
      totalEvaluations: evals.length,
      commonWeaknesses,
      commonStrengths,
      trend
    };
  };

  const summary = calculateSummary(evaluations || []);
  const AgentIcon = agentInfo[selectedAgent as keyof typeof agentInfo]?.icon || Brain;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            KanoLens Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor agent performance and manage system prompts
          </p>
        </div>

        <div className="mb-6">
          <Label htmlFor="agent-select">Select Agent</Label>
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger id="agent-select" className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(agentInfo).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <info.icon className="h-4 w-4" />
                    <span>{info.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
            <TabsTrigger value="prompts">Prompt Management</TabsTrigger>
            <TabsTrigger value="feedback">User Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Agent Overview Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${agentInfo[selectedAgent as keyof typeof agentInfo]?.color || 'bg-gray-500'}`}>
                      <AgentIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle>{agentInfo[selectedAgent as keyof typeof agentInfo]?.name || selectedAgent}</CardTitle>
                      <CardDescription>
                        {agentInfo[selectedAgent as keyof typeof agentInfo]?.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={summary.trend === 'improving' ? 'default' : summary.trend === 'declining' ? 'destructive' : 'secondary'}>
                    {summary.trend === 'improving' && <TrendingUp className="h-3 w-3 mr-1" />}
                    {summary.trend === 'declining' && <TrendingDown className="h-3 w-3 mr-1" />}
                    {summary.trend}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Average Score</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">{summary.averageScore.toFixed(1)}</p>
                      <Progress value={summary.averageScore} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Evaluations</p>
                    <p className="text-2xl font-bold">{summary.totalEvaluations}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Active Prompt Version</p>
                    <p className="text-2xl font-bold">{promptData?.activeVersion?.version || '1.0'}</p>
                  </div>
                </div>

                {summary.commonStrengths.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Common Strengths</h4>
                    <div className="flex flex-wrap gap-2">
                      {summary.commonStrengths.map((strength, idx) => (
                        <Badge key={idx} variant="outline" className="text-green-600">
                          {strength}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {summary.commonWeaknesses.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Common Weaknesses</h4>
                    <div className="flex flex-wrap gap-2">
                      {summary.commonWeaknesses.map((weakness, idx) => (
                        <Badge key={idx} variant="outline" className="text-red-600">
                          {weakness}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {summary.totalEvaluations === 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <h4 className="text-sm font-medium">No evaluations yet</h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Evaluations are generated automatically when the multi-agent system processes an analysis. 
                      You can create a test evaluation to verify the system works.
                    </p>
                    <Button 
                      onClick={() => testEvaluationMutation.mutate()} 
                      disabled={testEvaluationMutation.isPending}
                      size="sm"
                      variant="outline"
                    >
                      {testEvaluationMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Creating Test...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Create Test Evaluation
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evaluations" className="space-y-4">
            {evaluationsLoading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>Loading evaluations...</p>
                </CardContent>
              </Card>
            ) : evaluations && evaluations.length > 0 ? (
              evaluations.slice(0, 10).map((evaluation, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Evaluation #{evaluation.id}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge>{evaluation.evaluation.score}/100</Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(evaluation.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Accuracy</p>
                        <p className="font-medium">{evaluation.evaluation.qualityMetrics?.accuracy || 0}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Completeness</p>
                        <p className="font-medium">{evaluation.evaluation.qualityMetrics?.completeness || 0}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Relevance</p>
                        <p className="font-medium">{evaluation.evaluation.qualityMetrics?.relevance || 0}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Clarity</p>
                        <p className="font-medium">{evaluation.evaluation.qualityMetrics?.clarity || 0}%</p>
                      </div>
                    </div>

                    {evaluation.evaluation.suggestions && evaluation.evaluation.suggestions.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          Suggestions for Improvement
                        </h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          {evaluation.evaluation.suggestions.slice(0, 3).map((suggestion, sIdx) => (
                            <li key={sIdx}>• {suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {evaluation.evaluation.promptImprovements && (
                      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <p className="text-sm font-medium mb-1">Suggested Prompt Improvement:</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {evaluation.evaluation.promptImprovements}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No evaluations found for this agent
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="prompts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Update Agent Prompt</CardTitle>
                <CardDescription>
                  Create a new prompt version based on evaluation insights
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="version">Version Number</Label>
                  <Input
                    id="version"
                    placeholder="e.g., 1.1"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompt">New Prompt</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Enter the updated system prompt..."
                    className="min-h-[200px] font-mono text-sm"
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Change Reason</Label>
                  <Textarea
                    id="reason"
                    placeholder="Explain why this change was made..."
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                  />
                </div>

                <Button
                  onClick={() => {
                    if (newPrompt && changeReason && newVersion) {
                      createPromptMutation.mutate({
                        agentName: selectedAgent,
                        version: newVersion,
                        prompt: newPrompt,
                        changeReason,
                      });
                    } else {
                      toast({
                        title: "Missing information",
                        description: "Please fill in all fields",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={createPromptMutation.isPending}
                >
                  {createPromptMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Update Prompt
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {promptData?.versions && promptData.versions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Version History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {promptData.versions.map((version) => (
                      <div
                        key={version.id}
                        className={`p-3 rounded-lg border ${
                          version.isActive
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">v{version.version}</span>
                            {version.isActive && (
                              <Badge variant="default" className="text-xs">Active</Badge>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(version.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {version.changeReason}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4">
            <Card>
              <CardContent className="p-8 text-center">
                <Star className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400">
                  User feedback analytics coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}