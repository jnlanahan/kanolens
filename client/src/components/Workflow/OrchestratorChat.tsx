import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X, Send, Brain } from "lucide-react";

interface OrchestratorChatProps {
  isVisible: boolean;
  onToggle: () => void;
  onMessage: (message: string) => void;
  context: 'form' | 'suggestions' | 'progress' | 'results';
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'orchestrator';
  timestamp: Date;
}

export default function OrchestratorChat({ 
  isVisible, 
  onToggle, 
  onMessage, 
  context 
}: OrchestratorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");

  const contextPrompts = {
    form: [
      "I need help with my product list",
      "What target customers should I focus on?",
      "Can you suggest features to analyze?"
    ],
    suggestions: [
      "Add more competitors",
      "Remove some products",
      "Modify the feature list"
    ],
    progress: [
      "How long will this take?",
      "Can you explain what each agent does?",
      "Pause the analysis"
    ],
    results: [
      "Explain this analysis",
      "Can you modify the results?",
      "Export this data"
    ]
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    onMessage(inputValue);
    setInputValue("");

    // Simulate orchestrator response
    setTimeout(() => {
      const response: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `I understand you want to "${inputValue}". Let me help you with that. What specific changes would you like me to make?`,
        sender: 'orchestrator',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, response]);
    }, 1000);
  };

  const handlePromptClick = (prompt: string) => {
    setInputValue(prompt);
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={onToggle}
          size="lg"
          className="rounded-full shadow-lg"
        >
          <MessageCircle className="h-5 w-5 mr-2" />
          Chat with Orchestrator
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96">
      <Card className="shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Brain className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-sm">Orchestrator Agent</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  Online
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Actions */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Quick Actions:</p>
            <div className="flex flex-wrap gap-2">
              {contextPrompts[context].map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePromptClick(prompt)}
                  className="text-xs"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>

          {/* Chat Messages */}
          {messages.length > 0 && (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs p-3 rounded-lg text-sm ${
                      message.sender === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask me anything..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}