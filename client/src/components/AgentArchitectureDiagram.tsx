import React from 'react';

export default function AgentArchitectureDiagram() {
  return (
    <div className="w-full bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center mb-8 text-gray-800 dark:text-gray-200">
        KanoLens Multi-Agent Architecture
      </h2>
      
      <svg viewBox="0 0 1200 800" className="w-full h-auto">
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
          </pattern>
          
          {/* Arrow marker */}
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#6366f1"
            />
          </marker>
        </defs>
        
        <rect width="1200" height="800" fill="url(#grid)" />
        
        {/* User Box */}
        <g transform="translate(500, 20)">
          <rect x="0" y="0" width="200" height="80" rx="8" fill="#3b82f6" />
          <text x="100" y="30" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">
            User
          </text>
          <text x="100" y="55" textAnchor="middle" fill="white" fontSize="14">
            Provides requirements
          </text>
        </g>
        
        {/* Agent 1 - Orchestrator */}
        <g transform="translate(400, 150)">
          <rect x="0" y="0" width="400" height="120" rx="8" fill="#10b981" stroke="#059669" strokeWidth="2" />
          <text x="200" y="25" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">
            Agent 1: Orchestrator
          </text>
          <text x="200" y="50" textAnchor="middle" fill="white" fontSize="14">
            OpenAI GPT-4o
          </text>
          <text x="200" y="70" textAnchor="middle" fill="white" fontSize="12">
            • Collects & synthesizes information
          </text>
          <text x="200" y="88" textAnchor="middle" fill="white" fontSize="12">
            • Manages user interaction
          </text>
          <text x="200" y="106" textAnchor="middle" fill="white" fontSize="12">
            • Validates agent outputs
          </text>
        </g>
        
        {/* Agent 2 - Researcher */}
        <g transform="translate(100, 350)">
          <rect x="0" y="0" width="350" height="120" rx="8" fill="#8b5cf6" stroke="#7c3aed" strokeWidth="2" />
          <text x="175" y="25" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">
            Agent 2: Researcher
          </text>
          <text x="175" y="50" textAnchor="middle" fill="white" fontSize="14">
            Perplexity AI
          </text>
          <text x="175" y="70" textAnchor="middle" fill="white" fontSize="12">
            • Product research
          </text>
          <text x="175" y="88" textAnchor="middle" fill="white" fontSize="12">
            • Feature/benefit compilation
          </text>
          <text x="175" y="106" textAnchor="middle" fill="white" fontSize="12">
            • Citation management
          </text>
        </g>
        
        {/* Agent 3 - Validator */}
        <g transform="translate(500, 350)">
          <rect x="0" y="0" width="300" height="120" rx="8" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
          <text x="150" y="25" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">
            Agent 3: Validator
          </text>
          <text x="150" y="50" textAnchor="middle" fill="white" fontSize="14">
            Claude (Anthropic)
          </text>
          <text x="150" y="70" textAnchor="middle" fill="white" fontSize="12">
            • Validates research
          </text>
          <text x="150" y="88" textAnchor="middle" fill="white" fontSize="12">
            • Confirms accuracy
          </text>
          <text x="150" y="106" textAnchor="middle" fill="white" fontSize="12">
            • Quality control
          </text>
        </g>
        
        {/* Agent 4 - Analyst */}
        <g transform="translate(850, 350)">
          <rect x="0" y="0" width="300" height="120" rx="8" fill="#ef4444" stroke="#dc2626" strokeWidth="2" />
          <text x="150" y="25" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">
            Agent 4: Analyst
          </text>
          <text x="150" y="50" textAnchor="middle" fill="white" fontSize="14">
            OpenAI o1
          </text>
          <text x="150" y="70" textAnchor="middle" fill="white" fontSize="12">
            • Strategic analysis
          </text>
          <text x="150" y="88" textAnchor="middle" fill="white" fontSize="12">
            • Gap identification
          </text>
          <text x="150" y="106" textAnchor="middle" fill="white" fontSize="12">
            • Recommendations
          </text>
        </g>
        
        {/* Kano Model Output */}
        <g transform="translate(450, 600)">
          <rect x="0" y="0" width="300" height="100" rx="8" fill="#06b6d4" stroke="#0891b2" strokeWidth="2" />
          <text x="150" y="30" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">
            Kano Model Analysis
          </text>
          <text x="150" y="55" textAnchor="middle" fill="white" fontSize="14">
            Final Output
          </text>
          <text x="150" y="75" textAnchor="middle" fill="white" fontSize="12">
            Strategic recommendations
          </text>
        </g>
        
        {/* Arrows showing flow */}
        {/* User to Orchestrator */}
        <line x1="600" y1="100" x2="600" y2="150" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrowhead)" />
        
        {/* Orchestrator to Researcher */}
        <line x1="500" y1="270" x2="300" y2="350" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrowhead)" />
        
        {/* Researcher to Validator */}
        <line x1="450" y1="410" x2="500" y2="410" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrowhead)" />
        
        {/* Validator to Orchestrator (feedback) */}
        <path d="M 650 350 Q 650 310 600 270" fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="5,5" markerEnd="url(#arrowhead)" />
        
        {/* Orchestrator to Analyst */}
        <line x1="700" y1="270" x2="900" y2="350" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrowhead)" />
        
        {/* Analyst to Orchestrator (feedback) */}
        <path d="M 1000 350 Q 1000 250 800 210" fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="5,5" markerEnd="url(#arrowhead)" />
        
        {/* Orchestrator to Output */}
        <line x1="600" y1="270" x2="600" y2="600" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrowhead)" />
        
        {/* Legend */}
        <g transform="translate(50, 700)">
          <text x="0" y="0" fontSize="14" fontWeight="bold" fill="#374151">Legend:</text>
          <line x1="80" y1="-5" x2="120" y2="-5" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrowhead)" />
          <text x="130" y="0" fontSize="12" fill="#374151">Data flow</text>
          <line x1="250" y1="-5" x2="290" y2="-5" stroke="#6366f1" strokeWidth="2" strokeDasharray="5,5" markerEnd="url(#arrowhead)" />
          <text x="300" y="0" fontSize="12" fill="#374151">Feedback/Validation</text>
        </g>
      </svg>
      
      {/* Agent System Prompts */}
      <div className="mt-12 space-y-6">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Agent System Prompts & Instructions</h3>
        
        {/* Agent 1 */}
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-bold text-green-800 dark:text-green-200 mb-3">Agent 1: Orchestrator (OpenAI GPT-4o)</h4>
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <p><strong>System Prompt:</strong></p>
            <p className="pl-4 italic">
              "You are the Orchestrator agent for KanoLens, an AI-powered competitive analysis platform. Your role is to:
              1. Interact directly with users to understand their analysis needs
              2. Generate and refine lists of products, target customers, and features/benefits
              3. Coordinate with other agents by dispatching tasks and synthesizing their outputs
              4. Validate the completeness and accuracy of research and analysis
              5. Present final insights to users in a clear, actionable format
              
              Always suggest additional competitors, features, and customer segments that users might have overlooked.
              Ensure all analysis follows the Kano Model framework (Must-have, Performance, Delighter features)."
            </p>
            <p className="mt-2"><strong>Key Responsibilities:</strong></p>
            <ul className="list-disc list-inside pl-4">
              <li>User communication and requirement gathering</li>
              <li>Task delegation to specialized agents</li>
              <li>Quality control and validation</li>
              <li>Synthesis of multi-agent outputs</li>
            </ul>
          </div>
        </div>
        
        {/* Agent 2 */}
        <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg border border-purple-200 dark:border-purple-800">
          <h4 className="font-bold text-purple-800 dark:text-purple-200 mb-3">Agent 2: Researcher (Perplexity AI)</h4>
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <p><strong>System Prompt:</strong></p>
            <p className="pl-4 italic">
              "You are the Research agent for KanoLens. Your primary function is to conduct comprehensive online research about:
              1. Product features and capabilities
              2. Customer benefits and value propositions
              3. Market positioning and pricing
              4. Integration capabilities and technical specifications
              
              For each research query, provide:
              - Detailed findings with specific examples
              - Direct citations and source URLs
              - Comparative insights across products
              - Recent updates or changes (within last 6 months)
              
              Focus on factual, verifiable information from official sources, documentation, and reputable reviews."
            </p>
            <p className="mt-2"><strong>Research Guidelines:</strong></p>
            <ul className="list-disc list-inside pl-4">
              <li>Prioritize official product documentation</li>
              <li>Include user reviews and case studies</li>
              <li>Provide publication dates for all sources</li>
              <li>Flag any conflicting information found</li>
            </ul>
          </div>
        </div>
        
        {/* Agent 3 */}
        <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-lg border border-amber-200 dark:border-amber-800">
          <h4 className="font-bold text-amber-800 dark:text-amber-200 mb-3">Agent 3: Validator (Claude/Anthropic)</h4>
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <p><strong>System Prompt:</strong></p>
            <p className="pl-4 italic">
              "You are the Validation agent for KanoLens. Your role is to ensure research accuracy and completeness by:
              1. Cross-referencing research findings with known information
              2. Identifying potential biases or outdated information
              3. Flagging missing critical features or benefits
              4. Verifying citation accuracy and relevance
              
              Evaluate research based on:
              - Accuracy: Is the information correct and current?
              - Completeness: Are all key aspects covered?
              - Relevance: Does it address the user's specific needs?
              - Objectivity: Is the research balanced and unbiased?
              
              Provide specific feedback on what needs correction or additional research."
            </p>
            <p className="mt-2"><strong>Validation Criteria:</strong></p>
            <ul className="list-disc list-inside pl-4">
              <li>Source credibility assessment</li>
              <li>Information currency (prefer recent data)</li>
              <li>Coverage completeness check</li>
              <li>Bias and accuracy review</li>
            </ul>
          </div>
        </div>
        
        {/* Agent 4 */}
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-800">
          <h4 className="font-bold text-red-800 dark:text-red-200 mb-3">Agent 4: Analyst (OpenAI o1)</h4>
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <p><strong>System Prompt:</strong></p>
            <p className="pl-4 italic">
              "You are the Strategic Analysis agent for KanoLens. Using advanced reasoning, analyze the competitive landscape to provide:
              
              1. Gap Analysis: Identify unmet needs and market opportunities
              2. Competitive Positioning: Map strengths/weaknesses across competitors
              3. Strategic Recommendations: Prioritized actions for competitive advantage
              4. Risk Assessment: Potential threats and mitigation strategies
              
              Apply the Kano Model framework to categorize insights:
              - Must-have: Features needed for market entry
              - Performance: Features for competitive parity
              - Delighters: Features for differentiation
              
              Provide actionable, prioritized recommendations with clear reasoning."
            </p>
            <p className="mt-2"><strong>Analysis Framework:</strong></p>
            <ul className="list-disc list-inside pl-4">
              <li>Market gap identification</li>
              <li>Competitive advantage opportunities</li>
              <li>Feature prioritization matrix</li>
              <li>Strategic roadmap recommendations</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Workflow Overview */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">Multi-Agent Workflow</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li><strong>User Input:</strong> User provides initial requirements to Agent 1</li>
          <li><strong>Orchestration:</strong> Agent 1 enhances requirements and creates research tasks</li>
          <li><strong>Research:</strong> Agent 2 conducts comprehensive online research with citations</li>
          <li><strong>Validation:</strong> Agent 3 reviews research for accuracy and completeness</li>
          <li><strong>Analysis:</strong> Agent 4 performs strategic analysis and generates recommendations</li>
          <li><strong>Synthesis:</strong> Agent 1 combines all outputs into final Kano Model analysis</li>
          <li><strong>Delivery:</strong> User receives comprehensive competitive analysis with actionable insights</li>
        </ol>
      </div>
    </div>
  );
}