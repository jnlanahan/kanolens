import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import type { ChatMessage as ChatMessageType } from "@shared/schema";

interface ChatInterfaceProps {
  messages: ChatMessageType[];
  onSendMessage: (content: string, metadata?: any) => void;
  isLoading: boolean;
  currentStep: string;
}

const stepNames: Record<string, string> = {
  discovery: "Strategic Discovery & Scoping",
  research: "Competitive Research",
  categorization: "Kano Categorization",
  table: "Table Generation",
  analysis: "Strategic Analysis",
};

export default function ChatInterface({ 
  messages, 
  onSendMessage, 
  isLoading, 
  currentStep 
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 kano-gradient-light">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-mono-heading text-lg font-semibold text-gray-900 dark:text-white">
              Analysis Chat
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              AI-guided competitive analysis using Kano Model
            </p>
          </div>
          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        {currentStep && (
          <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
            Current Step: {stepNames[currentStep] || currentStep}
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Show welcome message only if no real messages exist */}
        {messages.length === 0 && (
          <div className="animate-slide-up">
            <ChatMessage
              message={{
                id: "welcome",
                role: "assistant",
                content: "Welcome to KanoLens! I'll help you create a comprehensive competitive analysis using the Kano Model framework.\n\nLet's start with **Strategic Discovery**. Do you have an existing product to compare, or are we exploring a new market opportunity?",
                createdAt: new Date(),
                sessionId: 0,
                metadata: {
                  step: "Strategic Discovery & Scoping",
                }
              }}
            />
          </div>
        )}
        
        {/* Only render messages that have content */}
        {messages.filter(message => message.content && message.content.trim()).map((message) => (
          <div key={message.id} className="animate-slide-up">
            <ChatMessage message={message} />
          </div>
        ))}
        
        {isLoading && (
          <div className="animate-slide-up">
            <ChatMessage
              message={{
                id: "typing",
                role: "assistant",
                content: "",
                createdAt: new Date(),
                sessionId: 0,
              }}
              isTyping={true}
            />
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <ChatInput 
        onSendMessage={onSendMessage} 
        disabled={isLoading}
        placeholder="Describe your product features, upload docs, or ask questions..."
      />
    </div>
  );
}
