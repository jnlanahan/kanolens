
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, Users, Package, Star } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@shared/schema";

interface ChatMessageProps {
  message: ChatMessageType;
  isTyping?: boolean;
}

// Helper function to check if message contains suggestions
function isSuggestionMessage(content: string): boolean {
  return content.includes('**Suggested Additional') || content.includes('**Key Features/Benefits');
}

// Helper function to parse suggestions from message content
function parseSuggestions(content: string) {
  const lines = content.split('\n');
  const suggestions = {
    products: [] as string[],
    features: [] as string[]
  };
  
  let currentSection = '';
  
  for (const line of lines) {
    if (line.includes('**Suggested Additional')) {
      currentSection = 'products';
    } else if (line.includes('**Key Features/Benefits')) {
      currentSection = 'features';
    } else if (line.match(/^\d+\.\s/) && currentSection) {
      const item = line.replace(/^\d+\.\s/, '').trim();
      if (currentSection === 'products') {
        suggestions.products.push(item);
      } else if (currentSection === 'features') {
        suggestions.features.push(item);
      }
    }
  }
  
  return suggestions;
}

export default function ChatMessage({ message, isTyping = false }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isSuggestion = !isUser && isSuggestionMessage(message.content);

  // Don't render if message has no content (unless it's a typing indicator)
  if (!isTyping && (!message.content || message.content.trim() === "")) {
    return null;
  }

  if (isTyping) {
    return (
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 kano-gradient rounded-full flex items-center justify-center text-white text-sm font-bold">
          AI
        </div>
        <div className="flex-1 max-w-sm">
          <Card className="p-3 bg-gray-100 dark:bg-slate-700 rounded-2xl rounded-tl-sm">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Skip rendering suggestion messages in chat since they appear in the right panel
  if (isSuggestion) {
    return (
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 kano-gradient rounded-full flex items-center justify-center text-white text-sm font-bold">
          AI
        </div>
        
        <div className="flex-1 max-w-sm">
          <Card className="p-3 rounded-2xl bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-tl-sm">
            <div className="text-sm">
              I've analyzed your request and prepared suggestions for additional products and features. 
              Please review them in the panel on the right.
            </div>
          </Card>
          
          {message.createdAt && (
            <div className="flex items-center justify-between mt-1 ml-3 text-xs text-gray-500 dark:text-gray-400">
              <span>discovery</span>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start space-x-3 ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <div className="w-8 h-8 kano-gradient rounded-full flex items-center justify-center text-white text-sm font-bold">
          {isSystem ? "S" : "AI"}
        </div>
      )}
      
      <div className={`flex-1 max-w-sm ${isUser ? "order-first" : ""}`}>
        <Card className={`p-3 rounded-2xl ${
          isUser 
            ? "kano-gradient text-white rounded-tr-sm" 
            : "bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-tl-sm"
        }`}>
          <div className="text-sm whitespace-pre-wrap">
            {message.content}
          </div>
          
          {/* Progress indicator for AI messages */}
          {!isUser && message.metadata && 'progress' in message.metadata && message.metadata.progress !== undefined && (
            <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 mb-1">
                <span>Researching competitive features...</span>
                <span>{message.metadata.progress}%</span>
              </div>
              <Progress value={message.metadata.progress} className="h-1" />
            </div>
          )}
          
          {/* Document upload indicator */}
          {message.metadata && 'uploadedFiles' in message.metadata && message.metadata.uploadedFiles && (
            <div className="mt-2 space-y-1">
              {message.metadata.uploadedFiles.map((file: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  📄 {file}
                </Badge>
              ))}
            </div>
          )}
        </Card>
        
        {/* Only show timestamp if message has a valid createdAt */}
        {message.createdAt && (
          <div className="flex items-center justify-between mt-1 ml-3 text-xs text-gray-500 dark:text-gray-400">
            {message.metadata && 'step' in message.metadata && message.metadata.step && (
              <span>{message.metadata.step}</span>
            )}
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>
        )}
      </div>
      
      {isUser && (
        <div className="w-8 h-8 bg-gray-400 dark:bg-gray-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
          U
        </div>
      )}
    </div>
  );
}
