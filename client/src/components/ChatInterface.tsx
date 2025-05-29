import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Upload, Paperclip, Send, Settings } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

interface ChatInterfaceProps {
  sessionId?: number;
  onAnalysisUpdate?: (analysis: any) => void;
  onNewSession?: (sessionId: number) => void;
}

export default function ChatInterface({ sessionId, onAnalysisUpdate, onNewSession }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Welcome to KanoLens! I'll help you create a comprehensive competitive analysis using the Kano Model framework.\n\nLet's start with **Strategic Discovery**. Do you have an existing product to compare, or are we exploring a new market opportunity?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    console.log("=== CHAT DEBUG: Messages state changed ===", messages);
  }, [messages]);

  const handleSendMessage = async () => {
    console.log("=== CHAT DEBUG: handleSendMessage called ===");
    console.log("Input value:", inputValue);
    console.log("Session ID:", sessionId);
    console.log("Is loading:", isLoading);
    
    if (!inputValue.trim() || isLoading) {
      console.log("=== CHAT DEBUG: Message blocked - empty input or loading ===");
      return;
    }

    if (!sessionId) {
      console.log("=== CHAT DEBUG: No session ID available ===");
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: inputValue,
      timestamp: new Date()
    };

    console.log("=== CHAT DEBUG: Adding user message ===", userMessage);
    setMessages(prev => {
      console.log("=== CHAT DEBUG: Current messages before add:", prev);
      const newMessages = [...prev, userMessage];
      console.log("=== CHAT DEBUG: New messages after add:", newMessages);
      return newMessages;
    });
    setInputValue("");
    setIsLoading(true);

    try {
      console.log("Sending message to:", `/api/analysis/sessions/${sessionId}/messages`);
      console.log("Message content:", inputValue);
      
      const response = await apiRequest("POST", `/api/analysis/sessions/${sessionId}/messages`, {
        content: inputValue
      });

      const result = await response.json();
      console.log("=== CHAT DEBUG: Response received ===", result);
      console.log("=== CHAT DEBUG: result.aiMessage ===", result.aiMessage);
      console.log("=== CHAT DEBUG: result.aiMessage.content ===", result.aiMessage?.content);
      
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: result.aiMessage?.content || "Error: No content received",
        timestamp: new Date()
      };

      console.log("=== CHAT DEBUG: Adding assistant message ===", assistantMessage);
      setMessages(prev => {
        console.log("=== CHAT DEBUG: Current messages before assistant add:", prev);
        const newMessages = [...prev, assistantMessage];
        console.log("=== CHAT DEBUG: New messages after assistant add:", newMessages);
        return newMessages;
      });

      if (result.sessionUpdate) {
        console.log("=== CHAT DEBUG: Session update received ===", result.sessionUpdate);
        onAnalysisUpdate?.(result.sessionUpdate);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "I apologize, but I encountered an error processing your message. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (sessionId) {
        formData.append("sessionId", sessionId.toString());
      }

      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const document = await response.json();
      
      const uploadMessage: ChatMessage = {
        role: "assistant",
        content: `Document "${file.name}" uploaded successfully! I've extracted the key information and will incorporate it into our analysis.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, uploadMessage]);
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage: ChatMessage = {
        role: "assistant", 
        content: "There was an error uploading your document. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  };

  useEffect(() => {
    autoResize();
  }, [inputValue]);

  console.log("=== CHAT DEBUG: Rendering ChatInterface, messages count:", messages.length);

  return (
    <div className="w-2/5 min-w-0 flex flex-col bg-white border-r border-slate-200">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-500/5 to-violet-500/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-mono text-lg font-semibold text-gray-900">Analysis Chat</h2>
            <p className="text-sm text-slate-600 mt-1">AI-guided competitive analysis using Kano Model</p>
          </div>
          <Button variant="ghost" size="sm" className="text-slate-600 hover:text-gray-900">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
          console.log(`=== CHAT DEBUG: Rendering message ${index} ===`, message);
          return (
          <div
            key={index}
            className={`flex items-start space-x-3 animate-in slide-in-from-bottom-2 duration-300 ${
              message.role === "user" ? "justify-end" : ""
            }`}
          >
            {message.role === "assistant" && (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                AI
              </div>
            )}
            
            <div className={`max-w-sm ${message.role === "user" ? "order-first" : ""}`}>
              <div
                className={`rounded-2xl p-3 ${
                  message.role === "user"
                    ? "bg-slate-500 text-white rounded-tr-sm"
                    : "bg-gray-100 text-gray-900 rounded-tl-sm"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </div>
                {message.timestamp && (
                  <div className={`text-xs mt-1 ${
                    message.role === "user" ? "text-slate-200" : "text-slate-500"
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>

            {message.role === "user" && (
              <div className="w-8 h-8 bg-slate-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                U
              </div>
            )}
          </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start space-x-3 animate-in slide-in-from-bottom-2 duration-300">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              AI
            </div>
            <div className="max-w-sm">
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm p-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isUploading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              AI
            </div>
            <div className="max-w-sm">
              <Card className="p-3">
                <div className="flex items-center justify-between text-xs text-blue-700 mb-2">
                  <span>Uploading document...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-1" />
              </Card>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Describe your product features, upload docs, or ask questions..."
              className="min-h-[40px] max-h-[120px] resize-none border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>
          
          <div className="flex space-x-1">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              className="border-slate-300 hover:border-slate-400"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span className="text-slate-400">Powered by OpenAI GPT-4</span>
        </div>
      </div>
    </div>
  );
}