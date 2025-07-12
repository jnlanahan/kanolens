import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FeedbackButtonProps {
  sessionId?: number;
  messageId?: number;
  content: string;
  metadata?: any;
}

export function FeedbackButton({ sessionId, messageId, content, metadata }: FeedbackButtonProps) {
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const feedbackMutation = useMutation({
    mutationFn: async (data: {
      feedbackType: 'thumbs_up' | 'thumbs_down';
      feedbackText?: string;
    }) => {
      return apiRequest('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          messageId,
          feedbackType: data.feedbackType,
          feedbackText: data.feedbackText,
          context: {
            content,
            metadata,
            timestamp: new Date().toISOString(),
          },
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Thank you for your feedback!",
        description: "Your feedback helps us improve our AI responses.",
      });
      setHasSubmittedFeedback(true);
      setShowFeedbackDialog(false);
      setFeedbackText("");
      
      // Invalidate feedback queries if needed
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: [`/api/feedback/session/${sessionId}`] });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to submit feedback",
        description: "Please try again later.",
        variant: "destructive",
      });
      console.error("Feedback error:", error);
    },
  });

  const handleFeedback = (type: 'thumbs_up' | 'thumbs_down') => {
    setFeedbackType(type);
    
    if (type === 'thumbs_up') {
      // Submit positive feedback immediately
      feedbackMutation.mutate({ feedbackType: type });
    } else {
      // Show dialog for negative feedback to get details
      setShowFeedbackDialog(true);
    }
  };

  const submitNegativeFeedback = () => {
    if (feedbackType === 'thumbs_down') {
      feedbackMutation.mutate({
        feedbackType: 'thumbs_down',
        feedbackText: feedbackText.trim(),
      });
    }
  };

  if (hasSubmittedFeedback) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Thanks for your feedback!</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFeedback('thumbs_up')}
          disabled={feedbackMutation.isPending}
          className="h-8 px-2"
        >
          <ThumbsUp className="h-4 w-4 mr-1" />
          <span className="sr-only">Helpful</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleFeedback('thumbs_down')}
          disabled={feedbackMutation.isPending}
          className="h-8 px-2"
        >
          <ThumbsDown className="h-4 w-4 mr-1" />
          <span className="sr-only">Not helpful</span>
        </Button>
      </div>

      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Help us improve</DialogTitle>
            <DialogDescription>
              What went wrong with this response? Your feedback helps us make our AI better.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="Tell us what could be improved..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFeedbackDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={submitNegativeFeedback}
              disabled={feedbackMutation.isPending}
            >
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}