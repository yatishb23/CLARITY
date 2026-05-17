"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  Bot,
  User,
} from "lucide-react";
import { useClarityStore } from "@/lib/store";
import type { ChatMessageDisplay } from "@/lib/api-types";

// ─── Message bubble ───────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: ChatMessageDisplay }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style={{
          background: isUser ? "var(--gradient-brand)" : "var(--color-accent-glow)",
          border: isUser ? "none" : "1px solid var(--color-accent-glow)",
        }}
      >
        {isUser ? (
          <User size={12} className="text-white" />
        ) : (
          <Bot size={12} style={{ color: "var(--color-accent)" }} />
        )}
      </div>

      <div className={`max-w-[85%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className="rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap"
          style={{
            background: isUser ? "var(--gradient-brand)" : "var(--color-card)",
            color: isUser ? "#fff" : "var(--color-text-sub)",
            border: isUser ? "none" : "1px solid var(--color-border)",
          }}
        >
          {msg.content}
        </div>

        {msg.image_b64 && (
          <div className="mt-2 overflow-hidden rounded-xl border" style={{ borderColor: "var(--color-border)" }}>
            {msg.image_label && (
              <div
                className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  background: "var(--color-accent-soft)",
                  color: "var(--color-accent)",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                {msg.image_label}
              </div>
            )}
            <img
              src={`data:image/png;base64,${msg.image_b64}`}
              alt={msg.image_label ?? "Generated visualization"}
              className="w-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ChatBox() {
  const { sessionId, chatMessages, isChatLoading, addChatMessage, setChatLoading } = useClarityStore();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasSession = !!sessionId;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !sessionId || isChatLoading) return;

    const userMsg: ChatMessageDisplay = { role: "user", content: text };
    addChatMessage(userMsg);
    setInput("");
    setChatLoading(true);

    try {
      const history = chatMessages.map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: text, history }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const assistantMsg: ChatMessageDisplay = { role: "assistant", content: data.reply };
      if (data.image_b64) {
        assistantMsg.image_b64 = data.image_b64;
        assistantMsg.image_label = data.image_label;
      }
      addChatMessage(assistantMsg);
    } catch {
      addChatMessage({
        role: "assistant",
        content: "Sorry, I hit an error. Please try again.",
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!hasSession && chatMessages.length === 0) return null;

  return (
    <div
      className="flex flex-col"
      style={{
        background: "var(--color-surface)",
        borderTop: "1px solid var(--color-border)",
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-5 py-2.5 transition-colors hover:opacity-80"
        style={{ color: "var(--color-text-dim)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-lg"
            style={{
              background: "var(--color-accent-soft)",
              border: "1px solid var(--color-accent-glow)",
            }}
          >
            <MessageSquare size={12} style={{ color: "var(--color-accent)" }} />
          </div>
          <span className="text-[12px] font-semibold" style={{ color: "var(--color-text)" }}>
            Ask AI
          </span>
          {chatMessages.length > 0 && (
            <span className="text-[10px] font-medium" style={{ color: "var(--color-text-ghost)" }}>
              · {chatMessages.length} message{chatMessages.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div style={{ color: "var(--color-text-ghost)" }}>
          {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </div>
      </button>

      {isOpen && (
        <div className="flex flex-col" style={{ maxHeight: "min(40vh, 360px)" }}>
          <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-5 py-3">
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Bot size={20} style={{ color: "var(--color-text-ghost)" }} />
                <p className="text-[12px]" style={{ color: "var(--color-text-ghost)" }}>
                  Ask questions about the radiology report or request visualizations.
                </p>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} />
            ))}

            {isChatLoading && (
              <div className="flex items-center gap-2.5 pl-1">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                  style={{
                    background: "var(--color-accent-glow)",
                    border: "1px solid var(--color-accent-glow)",
                  }}
                >
                  <Bot size={12} style={{ color: "var(--color-accent)" }} />
                </div>
                <div
                  className="flex items-center gap-2 rounded-2xl px-4 py-2.5"
                  style={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-ghost)",
                  }}
                >
                  <Loader2 size={11} className="animate-spin" />
                  <span className="text-[12px]">Thinking…</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="px-5 pb-3 pt-1">
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about this scan…"
                disabled={isChatLoading}
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[13px] disabled:opacity-50"
                style={{ color: "var(--color-text)" }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isChatLoading}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-all disabled:opacity-30"
                style={{
                  background: input.trim() && !isChatLoading ? "var(--gradient-brand)" : "transparent",
                  color: input.trim() && !isChatLoading ? "#fff" : "var(--color-text-ghost)",
                }}
              >
                {isChatLoading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
