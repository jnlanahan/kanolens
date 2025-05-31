import { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import AnalysisForm, { type AnalysisFormData } from "./AnalysisForm";
import ConfirmationPanel from "./ConfirmationPanel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
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

  const handleFormSubmit = (formData: AnalysisFormData) => {
    // Create a comprehensive message from all form fields
    const parts = [];

    if (formData.description.trim()) {
      parts.push(`Analysis Request: ${formData.description.trim()}`);
    }

    if (formData.products.trim()) {
      parts.push(`Products to Compare: ${formData.products.trim()}`);
    }

    if (formData.targetCustomers.trim()) {
      parts.push(`Target Customers: ${formData.targetCustomers.trim()}`);
    }

    if (formData.features.trim()) {
      parts.push(`Features/Benefits to Analyze: ${formData.features.trim()}`);
    }

    if (parts.length > 0) {
      const message = parts.join("\n\n");
      onSendMessage(message);
    }
  };

  console.log("ChatInterface received messages:", messages);
  console.log("Valid messages count:", Array.isArray(messages) ? messages.filter(msg => msg && typeof msg === 'object' && 'content' in msg).length : 0);

  const validMessages = Array.isArray(messages) ? messages.filter(msg => 
    msg && 
    typeof msg === 'object' && 
    'content' in msg &&
    !msg.content.startsWith('Table Edit Request:') // Filter out table edit messages
  ) : [];

  // Check if we should show confirmation panel
  const lastMessage = validMessages[validMessages.length - 1];
  const showConfirmationPanel = lastMessage?.role === 'assistant' && 
                                lastMessage?.metadata?.step === 'confirmation' &&
                                lastMessage?.metadata?.confirmationData;

  const handleConfirmAnalysis = () => {
    onSendMessage("Yes, looks good! Proceed with the analysis.");
  };

  const handleRequestChanges = () => {
    onSendMessage("I'd like to make some changes to the analysis scope.");
  };

  if (!Array.isArray(messages)) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="p-6 text-center">
            <div className="text-gray-500 dark:text-gray-400">
              Loading messages...
            </div>
          </Card>
        </div>
        <ChatInput onSendMessage={onSendMessage} disabled={isLoading} />
      </div>
    );
  }

  // Show form if no messages exist yet
  if (validMessages.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 kano-gradient-light">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-mono-heading text-lg font-semibold text-gray-900 dark:text-white">
                Analysis Setup
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Configure your competitive analysis parameters
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Form Area */}
        <div className="flex-1 overflow-y-auto p-2 pt-1">
          <div className="flex justify-center">
            <AnalysisForm onSubmit={handleFormSubmit} disabled={isLoading} />
          </div>
        </div>
      </div>
    );
  }

  // Show confirmation panel if in confirmation step
  if (showConfirmationPanel) {
    return (
      <div className="flex flex-col h-full">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 kano-gradient-light">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-mono-heading text-lg font-semibold text-gray-900 dark:text-white">
                Analysis Confirmation
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Review and confirm the analysis scope before proceeding
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Confirmation Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          <ConfirmationPanel
            data={lastMessage.metadata.confirmationData}
            onConfirm={handleConfirmAnalysis}
            onRequestChanges={handleRequestChanges}
            isLoading={isLoading}
          />
        </div>
      </div>
    );
  }

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
      <div className="flex-1 flex flex-col min-h-0">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {validMessages.length > 0 ? (
            validMessages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          ) : null}
        </div>

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