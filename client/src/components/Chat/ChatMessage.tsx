import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@shared/schema";

interface ChatMessageProps {
  message: ChatMessageType;
  isTyping?: boolean;
}

export default function ChatMessage({ message, isTyping = false }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

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
          {!isUser && message.metadata?.progress !== undefined && (
            <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 mb-1">
                <span>Researching competitive features...</span>
                <span>{message.metadata.progress}%</span>
              </div>
              <Progress value={message.metadata.progress} className="h-1" />
            </div>
          )}
          
          {/* Document upload indicator */}
          {message.metadata?.uploadedFiles && (
            <div className="mt-2 space-y-1">
              {message.metadata.uploadedFiles.map((file: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  📄 {file}
                </Badge>
              ))}
            </div>
          )}
        </Card>
        
        {/* Message metadata */}
        <div className="flex items-center justify-between mt-1 ml-3 text-xs text-gray-500 dark:text-gray-400">
          {message.metadata?.step && (
            <span>{message.metadata.step}</span>
          )}
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
      
      {isUser && (
        <div className="w-8 h-8 bg-gray-400 dark:bg-gray-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
          U
        </div>
      )}
    </div>
  );
}
