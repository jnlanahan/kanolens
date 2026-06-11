import { useEffect, useRef, useState } from "react";
import { Lock, SendHorizonal, Sparkles } from "lucide-react";
import type { QueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useAuth";
import { ApiError, api } from "@/lib/api";
import { toast } from "sonner";

export interface ChatMessage {
  id: string;
  role: "ai" | "user";
  text: string;
}

const SEED_MESSAGES: ChatMessage[] = [
  {
    id: "seed-1",
    role: "ai",
    text: "I can update this analysis in plain language. Try asking me to add a competitor, drop a benefit, or explain a rating.",
  },
];

const SUGGESTIONS = [
  "Add a competitor",
  "Drop a benefit",
  "Explain a rating",
  "Re-rate a feature",
];

interface RefineChatProps {
  sessionId: string;
  queryClient: QueryClient;
}

type LockReason = "free_run_no_refine" | "refine_limit_reached";

export function RefineChat({ sessionId, queryClient }: RefineChatProps) {
  const { data: user } = useCurrentUser();
  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [locked, setLocked] = useState<LockReason | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    setSending(true);

    try {
      const { reply } = await api.refine(sessionId, trimmed);
      const aiMsg: ChatMessage = { id: `a-${Date.now()}`, role: "ai", text: reply };
      setMessages((prev) => [...prev, aiMsg]);
      // Refetch the analysis so the table reflects any mutations
      await queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        const code = (err.detail as { error?: string })?.error;
        if (code === "free_run_no_refine" || code === "refine_limit_reached") {
          setLocked(code as LockReason);
          setSending(false);
          return;
        }
      }
      const errMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        role: "ai",
        text: err instanceof Error ? `Error: ${err.message}` : "Something went wrong. Please try again.",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  }

  async function handleBuyRun() {
    setCheckingOut(true);
    try {
      const { url } = await api.createCheckout();
      if (url) {
        window.location.href = url;
      } else {
        toast.error("Couldn't start checkout — no URL returned from Stripe.");
      }
    } catch (err) {
      toast.error("Checkout failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setCheckingOut(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(draft);
    }
  }

  return (
    <div className="chat">
      {/* Header */}
      <div className="chat__head">
        <span className="chat__head-mark" aria-hidden="true">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-sm font-semibold">Refine</p>
          <p className="text-xs text-muted-foreground">Edit this analysis in plain language</p>
        </div>
      </div>

      {/* Thread */}
      <div className="chat__thread" ref={threadRef} aria-live="polite" aria-label="Refine chat thread">
        {messages.map((msg) => (
          <div key={msg.id} className={`msg msg--${msg.role}`}>
            <div className="msg__bubble">{msg.text}</div>
          </div>
        ))}
        {sending ? (
          <div className="msg msg--ai">
            <div className="msg__bubble text-muted-foreground">
              <span className="spin inline-block w-3 h-3 border border-current border-t-transparent rounded-full" aria-hidden="true" />
              {" "}Thinking…
            </div>
          </div>
        ) : null}
      </div>

      {/* Paywall banner (shown when a 402 gate is hit) */}
      {locked ? (
        <div className="chat__paywall">
          <Lock className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {locked === "refine_limit_reached"
                ? "Refinement limit reached"
                : "This is your free preview run"}
            </p>
            <p className="text-xs text-muted-foreground">
              {locked === "refine_limit_reached"
                ? "You've used all 3 refinements. Start a new analysis to keep iterating."
                : (user?.runCredits ?? 0) > 0
                  ? "You have a run credit — start a new analysis to use it."
                  : "Start a new paid analysis ($5) to refine and iterate."}
            </p>
          </div>
          {locked === "free_run_no_refine" && (user?.runCredits ?? 0) === 0 ? (
            <Button
              size="sm"
              className="btn-brand shrink-0"
              onClick={() => void handleBuyRun()}
              disabled={checkingOut}
            >
              {checkingOut ? "Loading…" : "Get a full run — $5"}
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          {/* Suggestion chips */}
          {messages.length <= 2 ? (
            <div className="chat__suggests">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="chat__chip"
                  onClick={() => void send(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}

          {/* Composer */}
          <div className="chat__composer">
            <textarea
              className="chat__input"
              rows={1}
              placeholder="Ask to refine the analysis…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Refine message"
              disabled={sending}
            />
            <button
              type="button"
              className="chat__send"
              onClick={() => void send(draft)}
              disabled={sending || !draft.trim()}
              aria-label="Send"
            >
              <SendHorizonal className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
