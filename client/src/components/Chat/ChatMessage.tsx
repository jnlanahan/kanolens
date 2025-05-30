
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

  // Special rendering for suggestion messages
  if (isSuggestion) {
    const suggestions = parseSuggestions(message.content);
    return (
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 kano-gradient rounded-full flex items-center justify-center text-white text-sm font-bold">
          AI
        </div>
        
        <div className="flex-1 max-w-4xl">
          <Card className="p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm">
            {/* Header */}
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <Star className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  AI Analysis Suggestions
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Based on your request, I've identified additional products and key features for analysis.
              </p>
            </div>

            <div className="space-y-6">
              {/* Additional Products Section */}
              {suggestions.products.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Package className="w-4 h-4 text-blue-600" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Suggested Additional Products
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {suggestions.products.map((product, index) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                        <div className="text-sm text-gray-900 dark:text-white font-medium">
                          {product}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Features Section */}
              {suggestions.features.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Users className="w-4 h-4 text-green-600" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Key Features/Benefits to Analyze
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {suggestions.features.map((feature, index) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {feature}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirmation Question */}
              <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-300">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Ready to proceed?</span>
                </div>
                <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                  Would you like to proceed with this analysis using the suggested products and features?
                </p>
              </div>
            </div>
          </Card>
          
          {/* Timestamp */}
          {message.createdAt && (
            <div className="flex items-center justify-between mt-2 ml-3 text-xs text-gray-500 dark:text-gray-400">
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
