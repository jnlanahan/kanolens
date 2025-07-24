import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Brain, Search, CheckCircle, Database, Eye, Play, TestTube, AlertCircle, Clock } from "lucide-react";

interface AgentStep {
  agent: string;
  instruction: string;
  input?: any;
  output?: any;
  timestamp: string;
  duration?: number;
  status: 'pending' | 'running' | 'completed' | 'error';
  error?: string;
}

interface DebugSession {
  sessionId: number;
  steps: AgentStep[];
  finalResult?: any;
}

interface TestResult {
  agent: string;
  test: string;
  status: 'pass' | 'fail' | 'error';
  input?: any;
  output?: any;
  error?: string;
  duration?: number;
  details?: any;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  errors: number;
  success: boolean;
}

interface ComprehensiveTestResults {
  summary: TestSummary;
  testResults: TestResult[];
  timestamp: string;
  environment: {
    nodeEnv: string;
    hasPerplexityKey: boolean;
    hasOpenAIKey: boolean;
    perplexityKeyPrefix: string;
    openaiKeyPrefix: string;
  };
}

export default function Debug() {
  const [session, setSession] = useState<DebugSession | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [products, setProducts] = useState('Notion, Obsidian, Roam Research');
  const [targetCustomer, setTargetCustomer] = useState('Knowledge workers and researchers');
  const [selectedStep, setSelectedStep] = useState<AgentStep | null>(null);
  const [testResults, setTestResults] = useState<ComprehensiveTestResults | null>(null);
  const [isTestingAgents, setIsTestingAgents] = useState(false);
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);

  const agentInstructions = {
    orchestrator: `You are the Orchestrator Agent responsible for coordinating the multi-agent Kano Model analysis.

Your role:
1. Parse user requirements and determine analysis scope
2. Coordinate between Research, Validator, Analyst, and Evaluator agents
3. Ensure proper data flow between agents
4. Handle errors and retries
5. Generate final comprehensive results

Input: User request with products and target customer
Output: Coordinated agent results and final analysis`,

    researcher: `You are the Researcher Agent responsible for gathering competitive intelligence using real web research.

Your role:
1. Research each product using Perplexity AI for real, current data
2. Analyze features, capabilities, pricing, and market positioning
3. Gather user reviews and feedback from Reddit, forums, review sites
4. Extract concrete feature implementations and benefits
5. NO FALLBACK CONTENT - only real research data

Research queries include:
- Product overview, features, pricing plans
- User reviews, Reddit discussions, complaints, pros/cons
- Competitive comparisons and market analysis
- Technical features, API integrations, security
- Market share, pricing strategy, business model

Input: List of products and target customer
Output: Comprehensive research data with real sources`,

    validator: `You are the Validator Agent responsible for categorizing features according to Kano Model principles.

Your role:
1. Analyze research data to extract unique features
2. Categorize features using strict Kano Model rules:
   - MUST-HAVE: Basic expectations (YES/NO ratings only)
   - PERFORMANCE: Linear satisfaction (HIGH/MEDIUM/LOW ratings)
   - DELIGHTER: Surprise features (YES or blank ratings)
3. Use REAL research data only - no probability distributions
4. Generate product-specific ratings based on actual feature presence
5. Provide justifications based on research evidence

Input: Research data from Researcher Agent
Output: Categorized features with real product ratings`,

    analyst: `You are the Analyst Agent responsible for transforming validated data into Kano Model format.

Your role:
1. Convert categorized features into table structure
2. Apply proper Kano Model rating systems
3. Generate feature descriptions and customer benefits
4. Create comprehensive analysis with insights
5. Ensure data consistency and completeness

Input: Validated and categorized features
Output: Complete Kano Model table with analysis`,

    evaluator: `You are the Evaluator Agent responsible for quality assurance and final review.

Your role:
1. Review final analysis for accuracy and completeness
2. Validate Kano Model compliance
3. Check for missing features or inconsistencies
4. Generate summary insights and recommendations
5. Ensure target customer relevance

Input: Complete Kano Model analysis
Output: Quality-assured final results with insights`
  };

  const runDebugAnalysis = async () => {
    if (!products.trim() || !targetCustomer.trim()) {
      alert('Please enter products and target customer');
      return;
    }

    setIsRunning(true);
    setSession(null);
    setSelectedStep(null);

    try {
      const response = await fetch('/api/analysis/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products: products.split(',').map(p => p.trim()),
          targetCustomer: targetCustomer.trim()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setSession(result);
    } catch (error) {
      console.error('Debug analysis failed:', error);
      alert('Debug analysis failed: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  const runComprehensiveTests = async () => {
    setIsTestingAgents(true);
    setTestResults(null);
    setSelectedTest(null);

    try {
      const response = await fetch('/api/analysis/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setTestResults(result);
    } catch (error) {
      console.error('Comprehensive testing failed:', error);
      alert('Comprehensive testing failed: ' + error.message);
    } finally {
      setIsTestingAgents(false);
    }
  };

  const getStepIcon = (agent: string) => {
    switch (agent.toLowerCase()) {
      case 'orchestrator': return <Brain className="h-4 w-4" />;
      case 'researcher': return <Search className="h-4 w-4" />;
      case 'validator': return <CheckCircle className="h-4 w-4" />;
      case 'analyst': return <Database className="h-4 w-4" />;
      case 'evaluator': return <Eye className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTestStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-100 text-green-800';
      case 'fail': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTestIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Agent Debug Console
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor agent flow, instructions, and data handoffs in real-time
          </p>
        </div>

        <Tabs defaultValue="analysis" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analysis">Agent Flow Analysis</TabsTrigger>
            <TabsTrigger value="testing">Comprehensive Testing</TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Input Panel */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    Run Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="products">Products (comma-separated)</Label>
                    <Textarea
                      id="products"
                      value={products}
                      onChange={(e) => setProducts(e.target.value)}
                      placeholder="Notion, Obsidian, Roam Research"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="customer">Target Customer</Label>
                    <Input
                      id="customer"
                      value={targetCustomer}
                      onChange={(e) => setTargetCustomer(e.target.value)}
                      placeholder="Knowledge workers and researchers"
                      className="mt-1"
                    />
                  </div>

                  <Button 
                    onClick={runDebugAnalysis} 
                    disabled={isRunning}
                    className="w-full"
                  >
                    {isRunning ? 'Running Analysis...' : 'Start Debug Analysis'}
                  </Button>
                </CardContent>
              </Card>

          {/* Agent Flow Panel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Agent Execution Flow</CardTitle>
            </CardHeader>
            <CardContent>
              {!session ? (
                <div className="text-center py-8 text-gray-500">
                  Run an analysis to see agent flow
                </div>
              ) : (
                <div className="space-y-3">
                  {session.steps.map((step, index) => (
                    <div
                      key={index}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedStep === step ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedStep(step)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStepIcon(step.agent)}
                          <div>
                            <div className="font-medium">{step.agent}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(step.timestamp).toLocaleTimeString()}
                              {step.duration && ` (${step.duration}ms)`}
                            </div>
                          </div>
                        </div>
                        <Badge className={getStatusColor(step.status)}>
                          {step.status}
                        </Badge>
                      </div>
                      {step.error && (
                        <div className="mt-2 text-sm text-red-600">
                          Error: {step.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed View */}
        {selectedStep && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStepIcon(selectedStep.agent)}
                {selectedStep.agent} Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="instruction" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="instruction">Instructions</TabsTrigger>
                  <TabsTrigger value="input">Input</TabsTrigger>
                  <TabsTrigger value="output">Output</TabsTrigger>
                  <TabsTrigger value="analysis">Analysis</TabsTrigger>
                </TabsList>
                
                <TabsContent value="instruction" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-auto whitespace-pre-wrap">
                        {agentInstructions[selectedStep.agent.toLowerCase() as keyof typeof agentInstructions] || 'No instructions available'}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="input" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-auto">
                        {selectedStep.input ? JSON.stringify(selectedStep.input, null, 2) : 'No input data'}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="output" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-auto">
                        {selectedStep.output ? JSON.stringify(selectedStep.output, null, 2) : 'No output data'}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="analysis" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Execution Summary</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Status:</span>
                              <Badge className={`ml-2 ${getStatusColor(selectedStep.status)}`}>
                                {selectedStep.status}
                              </Badge>
                            </div>
                            <div>
                              <span className="text-gray-500">Duration:</span>
                              <span className="ml-2">{selectedStep.duration || 'N/A'}ms</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Timestamp:</span>
                              <span className="ml-2">{new Date(selectedStep.timestamp).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        {selectedStep.error && (
                          <div>
                            <h4 className="font-medium mb-2 text-red-600">Error Details</h4>
                            <pre className="text-sm bg-red-50 text-red-800 p-4 rounded-lg">
                              {selectedStep.error}
                            </pre>
                          </div>
                        )}
                        
                        <div>
                          <h4 className="font-medium mb-2">Data Flow Analysis</h4>
                          <div className="text-sm space-y-2">
                            <div>
                              <span className="text-gray-500">Input Size:</span>
                              <span className="ml-2">
                                {selectedStep.input ? JSON.stringify(selectedStep.input).length : 0} characters
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Output Size:</span>
                              <span className="ml-2">
                                {selectedStep.output ? JSON.stringify(selectedStep.output).length : 0} characters
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Final Results */}
        {session?.finalResult && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Final Results</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-auto">
                {JSON.stringify(session.finalResult, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="testing" className="mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Test Control Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Comprehensive Testing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Run comprehensive tests on all agents to identify issues:
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Environment variables</li>
                  <li>Perplexity API connection</li>
                  <li>Researcher agent</li>
                  <li>Validator agent</li>
                  <li>Analyst agent</li>
                  <li>Orchestrator integration</li>
                </ul>
              </div>

              <Button 
                onClick={runComprehensiveTests} 
                disabled={isTestingAgents}
                className="w-full"
                variant="outline"
              >
                {isTestingAgents ? 'Testing Agents...' : 'Run Comprehensive Tests'}
              </Button>

              {testResults && (
                <div className="space-y-2">
                  <h4 className="font-medium">Test Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">
                        {testResults.summary.passed} Passed
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-100 text-red-800">
                        {testResults.summary.errors} Errors
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {testResults.summary.failed} Failed
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={testResults.summary.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {testResults.summary.success ? "All Good" : "Issues Found"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Results Panel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              {!testResults ? (
                <div className="text-center py-8 text-gray-500">
                  Run comprehensive tests to see detailed results
                </div>
              ) : (
                <div className="space-y-3">
                  {testResults.testResults.map((test, index) => (
                    <div
                      key={index}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTest === test ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedTest(test)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getTestIcon(test.status)}
                          <div>
                            <div className="font-medium">{test.agent} - {test.test}</div>
                            <div className="text-sm text-gray-500">
                              {test.duration}ms
                            </div>
                          </div>
                        </div>
                        <Badge className={getTestStatusColor(test.status)}>
                          {test.status}
                        </Badge>
                      </div>
                      {test.error && (
                        <div className="mt-2 text-sm text-red-600">
                          Error: {test.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Selected Test Details */}
        {selectedTest && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getTestIcon(selectedTest.status)}
                {selectedTest.agent} - {selectedTest.test}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="input">Input</TabsTrigger>
                  <TabsTrigger value="output">Output</TabsTrigger>
                  <TabsTrigger value="analysis">Analysis</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-500">Status:</span>
                            <Badge className={`ml-2 ${getTestStatusColor(selectedTest.status)}`}>
                              {selectedTest.status}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-gray-500">Duration:</span>
                            <span className="ml-2">{selectedTest.duration}ms</span>
                          </div>
                        </div>
                        
                        {selectedTest.error && (
                          <div>
                            <h4 className="font-medium mb-2 text-red-600">Error Details</h4>
                            <pre className="text-sm bg-red-50 text-red-800 p-4 rounded-lg">
                              {selectedTest.error}
                            </pre>
                          </div>
                        )}
                        
                        {selectedTest.details && (
                          <div>
                            <h4 className="font-medium mb-2">Test Details</h4>
                            <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-auto">
                              {JSON.stringify(selectedTest.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="input" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-auto">
                        {selectedTest.input ? JSON.stringify(selectedTest.input, null, 2) : 'No input data'}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="output" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-auto">
                        {selectedTest.output ? JSON.stringify(selectedTest.output, null, 2) : 'No output data'}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="analysis" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Test Analysis</h4>
                          <div className="text-sm space-y-2">
                            <div>
                              <span className="text-gray-500">Agent:</span>
                              <span className="ml-2">{selectedTest.agent}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Test Type:</span>
                              <span className="ml-2">{selectedTest.test}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Input Size:</span>
                              <span className="ml-2">
                                {selectedTest.input ? JSON.stringify(selectedTest.input).length : 0} characters
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Output Size:</span>
                              <span className="ml-2">
                                {selectedTest.output ? JSON.stringify(selectedTest.output).length : 0} characters
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
      </div>
    </div>
  );
}