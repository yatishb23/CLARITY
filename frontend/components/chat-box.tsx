"use client";

import { useState, useRef, useEffect, JSX } from "react";
import {
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  Bot,
  User,
  AlertTriangle,
} from "lucide-react";
import { useClarityStore } from "@/lib/store";
import type { ChatMessageDisplay } from "@/lib/api-types";

// ─── Radiology guard ──────────────────────────────────────────────────────────

const RADIOLOGY_KEYWORDS = [
  "chest", "lung", "pulmonary", "cardiac", "heart", "mediastin", "pleural",
  "pneumo", "edema", "effusion", "atelectasis", "consolidation", "opacity",
  "cardiomegaly", "fracture", "radiograph", "x-ray", "xray", "scan", "image",
  "finding", "report", "pathology", "diagnosis", "heatmap", "grad-cam", "gradcam",
  "attention", "lesion", "bone", "rib", "diaphragm", "costophrenic", "trachea",
  "airspace", "silhouette", "density", "nodule", "mass", "infiltrate",
  "what", "why", "how", "show", "explain", "tell", "describe", "is", "are",
  "does", "can", "which", "where", "when", "probability", "confidence",
];

function isRadiologyRelated(message: string): boolean {
  const lower = message.toLowerCase();
  // Allow short follow-up queries (likely in-context)
  if (lower.split(" ").length <= 5) return true;
  return RADIOLOGY_KEYWORDS.some((kw) => lower.includes(kw));
}

const OUT_OF_SCOPE_REPLY =
  "I'm CLARITY, a radiology AI assistant. I can only answer questions about the uploaded chest X-ray, radiology findings, pathology probabilities, or attention visualizations. Please ask something related to this scan.";

// ─── Simple markdown renderer ─────────────────────────────────────────────────

function renderMarkdown(text: string): JSX.Element {
  // Split into lines and process bold (**text**), *italic*, and plain text
  const lines = text.split("\n");
  const elements: JSX.Element[] = [];

  lines.forEach((line, lineIdx) => {
    if (line.trim() === "") {
      elements.push(<br key={`br-${lineIdx}`} />);
      return;
    }

    // Detect list items
    const unorderedMatch = line.match(/^(\s*)[*\-•]\s+(.*)/);
    const orderedMatch = line.match(/^(\s*)\d+\.\s+(.*)/);

    if (unorderedMatch || orderedMatch) {
      const content = unorderedMatch ? unorderedMatch[2] : orderedMatch![2];
      elements.push(
        <div key={lineIdx} className="flex items-start gap-1.5 my-0.5">
          <span className="mt-1.5 shrink-0" style={{ color: "var(--color-text-ghost)", fontSize: 8 }}>●</span>
          <span>{inlineMarkdown(content)}</span>
        </div>
      );
    } else {
      elements.push(<div key={lineIdx}>{inlineMarkdown(line)}</div>);
    }
  });

  return <>{elements}</>;
}

function inlineMarkdown(text: string): JSX.Element {
  // Process **bold**, *italic*, `code`
  const parts: (string | JSX.Element)[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldIdx = remaining.indexOf("**");
    const italicIdx = remaining.indexOf("*");
    const codeIdx = remaining.indexOf("`");

    const indices = [
      boldIdx !== -1 ? boldIdx : Infinity,
      italicIdx !== -1 && italicIdx !== boldIdx ? italicIdx : Infinity,
      codeIdx !== -1 ? codeIdx : Infinity,
    ];
    const minIdx = Math.min(...indices);

    if (minIdx === Infinity) {
      parts.push(remaining);
      break;
    }

    if (minIdx > 0) {
      parts.push(remaining.slice(0, minIdx));
      remaining = remaining.slice(minIdx);
      continue;
    }

    if (remaining.startsWith("**")) {
      const end = remaining.indexOf("**", 2);
      if (end !== -1) {
        parts.push(<strong key={key++}>{remaining.slice(2, end)}</strong>);
        remaining = remaining.slice(end + 2);
        continue;
      }
    }

    if (remaining.startsWith("`")) {
      const end = remaining.indexOf("`", 1);
      if (end !== -1) {
        parts.push(
          <code key={key++} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, background: "rgba(0,0,0,0.07)", borderRadius: 3, padding: "1px 4px" }}>
            {remaining.slice(1, end)}
          </code>
        );
        remaining = remaining.slice(end + 1);
        continue;
      }
    }

    if (remaining.startsWith("*")) {
      const end = remaining.indexOf("*", 1);
      if (end !== -1) {
        parts.push(<em key={key++}>{remaining.slice(1, end)}</em>);
        remaining = remaining.slice(end + 1);
        continue;
      }
    }

    parts.push(remaining[0]);
    remaining = remaining.slice(1);
  }

  return <>{parts}</>;
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: ChatMessageDisplay }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full mt-0.5"
        style={{
          background: isUser ? "var(--color-text)" : "var(--color-surface-dim)",
          border: "1px solid var(--color-border)",
        }}
      >
        {isUser ? (
          <User size={11} style={{ color: "var(--color-bg)" }} />
        ) : (
          <Bot size={11} style={{ color: "var(--color-text-dim)" }} />
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[88%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1.5`}>
        <div
          className="rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed"
          style={{
            background: isUser ? "var(--color-text)" : "var(--color-surface-dim)",
            color: isUser ? "var(--color-bg)" : "var(--color-text-sub)",
            border: isUser ? "none" : "1px solid var(--color-border)",
          }}
        >
          {isUser ? (
            msg.content
          ) : (
            <div className="prose-chat">
              {renderMarkdown(msg.content)}
            </div>
          )}
        </div>

        {/* Attached image (Grad-CAM) */}
        {msg.image_b64 && (
          <div
            className="overflow-hidden rounded-lg border"
            style={{ borderColor: "var(--color-border)", maxWidth: "100%" }}
          >
            {msg.image_label && (
              <div
                className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  background: "var(--color-surface-dim)",
                  color: "var(--color-text-dim)",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                {msg.image_label}
              </div>
            )}
            <img
              src={`data:image/png;base64,${msg.image_b64}`}
              alt={msg.image_label ?? "Visualization"}
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

    // Radiology-only guard
    if (!isRadiologyRelated(text)) {
      addChatMessage({ role: "user", content: text });
      setInput("");
      addChatMessage({ role: "assistant", content: OUT_OF_SCOPE_REPLY });
      return;
    }

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

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json();

      // Use the full `reply` content from the RAG response
      const assistantMsg: ChatMessageDisplay = {
        role: "assistant",
        content: data.reply ?? "I couldn't generate a response. Please try again.",
      };

      // Attach Grad-CAM image if present
      if (data.image_b64) {
        assistantMsg.image_b64 = data.image_b64;
        assistantMsg.image_label = data.image_label ?? "Visualization";
      }

      addChatMessage(assistantMsg);
    } catch (err: unknown) {
      addChatMessage({
        role: "assistant",
        content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`,
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

  return (
    <div
      className="flex flex-col"
      style={{
        background: "var(--color-surface)",
        borderTop: "1px solid var(--color-border)",
      }}
    >
      {/* Header toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-5 py-2.5 transition-colors"
        style={{ color: "var(--color-text-dim)" }}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={13} style={{ color: "var(--color-text-dim)" }} />
          <span className="text-[12px] font-semibold" style={{ color: "var(--color-text)" }}>
            Ask AI
          </span>
          {chatMessages.length > 0 && (
            <span className="text-[10px]" style={{ color: "var(--color-text-ghost)" }}>
              · {chatMessages.length} message{chatMessages.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div style={{ color: "var(--color-text-ghost)" }}>
          {isOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </div>
      </button>

      {isOpen && (
        <div className="flex flex-col" style={{ maxHeight: "min(45vh, 400px)" }}>
          {/* Messages */}
          <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Bot size={18} style={{ color: "var(--color-text-ghost)" }} />
                {hasSession ? (
                  <p className="text-[12px] leading-relaxed" style={{ color: "var(--color-text-ghost)", maxWidth: 240 }}>
                    Ask questions about this radiology scan, findings, or request Grad-CAM visualizations.
                  </p>
                ) : (
                  <p className="text-[12px] leading-relaxed" style={{ color: "var(--color-text-ghost)", maxWidth: 240 }}>
                    Upload a scan first to activate the AI assistant.
                  </p>
                )}
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} />
            ))}

            {isChatLoading && (
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: "var(--color-surface-dim)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <Bot size={11} style={{ color: "var(--color-text-dim)" }} />
                </div>
                <div
                  className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5"
                  style={{
                    background: "var(--color-surface-dim)",
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

          {/* Input */}
          <div className="px-4 pb-3 pt-1">
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{
                background: "var(--color-surface-dim)",
                border: "1px solid var(--color-border)",
              }}
            >
              <input
                ref={inputRef}
                id="chat-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={hasSession ? "Ask about this scan…" : "Upload a scan to chat…"}
                disabled={isChatLoading || !hasSession}
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[13px] disabled:opacity-50"
                style={{ color: "var(--color-text)" }}
              />
              <button
                id="chat-send-button"
                onClick={handleSend}
                disabled={!input.trim() || isChatLoading || !hasSession}
                className="flex h-6 w-6 items-center justify-center rounded-md transition-all disabled:opacity-25"
                style={{
                  background: input.trim() && !isChatLoading && hasSession ? "var(--color-text)" : "transparent",
                  color: input.trim() && !isChatLoading && hasSession ? "var(--color-bg)" : "var(--color-text-ghost)",
                }}
                aria-label="Send message"
              >
                {isChatLoading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Send size={12} />
                )}
              </button>
            </div>

            {/* Scope hint */}
            <p className="mt-1.5 flex items-center gap-1 text-[10px]" style={{ color: "var(--color-text-ghost)" }}>
              <AlertTriangle size={9} />
              Radiology context only — findings, pathologies, and visualizations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
