"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader, User, Bot, MessageSquare } from "lucide-react";
import { useClarityStore } from "@/lib/store";
import axios from "axios";
import { ChatMessage, ChatResponse } from "@/lib/api-types";

const QUICK_PROMPTS = ["Why this diagnosis?", "Affected region?", "Confidence level?"];

export function ChatPanel() {
  const { analysis, chatHistory, addChatMessage, isChatting, setChatting } =
    useClarityStore();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isChatting]);

  const handleSendMessage = async (text: string = inputValue) => {
    if (!text.trim() || !analysis) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    addChatMessage(userMsg);
    setInputValue("");
    setChatting(true);

    try {
      const response = await axios.post<ChatResponse>("/api/process", {
        session_id: analysis.session_id,
        message: text,
        history: chatHistory,
      });

      addChatMessage({
        role: "assistant",
        content: response.data.reply,
      });

      if (response.data.image_b64) {
        useClarityStore.setState({ currentOverlay: response.data.image_b64 });
      }
    } catch (error) {
      console.error("Chat error:", error);
      addChatMessage({
        role: "assistant",
        content:
          "Unable to process the request. Please ensure the backend service is running.",
      });
    } finally {
      setChatting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-primary border-l border-ui-border font-body">
      {/* Header */}
      <div className="border-b border-ui-border px-5 py-4 bg-surface-secondary/80 backdrop-blur-md clay-shadow-sm">
        <p className="text-label-xs text-text-muted mb-0.5">AI Assistant</p>
        <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Bot size={14} className="text-clinical-teal" />
          Diagnostic Consultation
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 scrollbar-thin">
        {chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 pb-8">
            <div className="p-4 rounded-3xl border border-ui-border bg-surface-secondary mb-4 clay-shadow-sm">
              <MessageSquare size={24} className="text-text-muted opacity-40" />
            </div>
            <p className="text-[13px] font-medium text-text-secondary mb-1">
              {analysis ? "Ready for consultation" : "Upload an image first"}
            </p>
            <p className="text-[11px] text-text-muted leading-relaxed max-w-[180px]">
              {analysis
                ? "Ask questions about the findings or request region-specific analysis."
                : "A scan is required to enable the diagnostic assistant."}
            </p>
          </div>
        )}

        {chatHistory.map((message, idx) => (
          <div
            key={idx}
            className={`flex items-end gap-2.5 ${
              message.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border clay-shadow-sm ${
                message.role === "user"
                  ? "bg-surface-tertiary border-ui-border"
                  : "bg-clinical-teal/15 border-clinical-teal/30"
              }`}
            >
              {message.role === "user" ? (
                <User size={12} className="text-text-secondary" />
              ) : (
                <Bot size={12} className="text-clinical-teal" />
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[82%] rounded-3xl px-4 py-3 text-[13px] leading-relaxed clay-shadow-sm ${
                message.role === "user"
                  ? "bg-gradient-to-br from-clinical-teal to-clinical-teal-dark text-white rounded-br-none"
                  : "bg-surface-secondary border border-ui-border text-text-primary rounded-bl-none"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isChatting && (
          <div className="flex items-end gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-clinical-teal/15 border border-clinical-teal/30 clay-shadow-sm">
              <Bot size={12} className="text-clinical-teal" />
            </div>
            <div className="bg-surface-secondary border border-ui-border rounded-3xl rounded-bl-none px-4 py-3 clay-shadow-sm">
              <Loader className="animate-spin text-text-muted" size={14} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {analysis && chatHistory.length === 0 && (
        <div className="px-5 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {QUICK_PROMPTS.map((txt) => (
            <button
              key={txt}
              onClick={() => handleSendMessage(txt)}
              className="whitespace-nowrap text-[11px] font-medium px-3 py-2 rounded-2xl border border-ui-border bg-surface-secondary text-text-secondary hover:border-clinical-teal/40 hover:text-clinical-teal hover:bg-clinical-teal/8 transition-all clay-shadow-sm"
            >
              {txt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-5 py-4 border-t border-ui-border bg-surface-secondary clay-shadow-sm">
        <div className="flex items-center gap-2.5">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder={
              analysis ? "Ask about the scan…" : "Upload image to begin"
            }
            disabled={!analysis || isChatting}
            className="flex-1 bg-surface-primary border border-ui-border rounded-2xl px-4 py-2.5 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-clinical-teal/40 focus:border-clinical-teal/40 disabled:opacity-40 transition-all clay-shadow-sm"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || !analysis || isChatting}
            className="p-2.5 bg-gradient-to-br from-clinical-teal to-clinical-teal-dark text-white rounded-2xl hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 clay-shadow-sm hover:clay-shadow"
            title="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
