import { useEffect, useRef, useState } from "react";
import { SendHorizonal, Sparkles } from "lucide-react";

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
  /** Called when the user submits a message. Stub until mutation contract confirmed. */
  onSend?: (text: string) => Promise<string>;
}

export function RefineChat({ onSend }: RefineChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
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
      let reply: string;
      if (onSend) {
        reply = await onSend(trimmed);
      } else {
        // Stub: echo back until mutation contract confirmed
        await new Promise((r) => setTimeout(r, 600));
        reply = `Got it — "${trimmed}". (Refine chat is not yet wired to the AI endpoint. Confirm the mutation contract to enable live updates.)`;
      }
      const aiMsg: ChatMessage = { id: `a-${Date.now()}`, role: "ai", text: reply };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setSending(false);
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
    </div>
  );
}
