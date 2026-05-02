"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader, User, Bot, Sparkles } from "lucide-react";
import { useClarityStore } from "@/lib/store";
import axios from "axios";
import { ChatMessage, ChatResponse } from "@/lib/api-types";

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

    // 1. Add user message to UI
    const userMsg: ChatMessage = { role: "user", content: text };
    addChatMessage(userMsg);
    setInputValue("");
    setChatting(true);

    try {
      // 2. Call local API proxy
      const response = await axios.post<ChatResponse>("/api/process", {
        session_id: analysis.session_id,
        message: text,
        history: chatHistory,
      });

      // 3. Add assistant message
      addChatMessage({
        role: "assistant",
        content: response.data.reply,
      });

      // Handle tool results (like new Grad-CAM images)
      if (response.data.image_b64) {
        useClarityStore.setState({ currentOverlay: response.data.image_b64 });
      }
    } catch (error) {
      console.error("Chat error:", error);
      addChatMessage({
        role: "assistant",
        content:
          "I encountered an error while processing your request. Please ensure the backend is running.",
      });
    } finally {
      setChatting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border-l border-border overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 bg-secondary/50">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Bot size={20} className="text-primary" />
          Conversational Assistant
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Ask questions about the diagnosis
        </p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Sparkles size={32} className="text-primary/20 mb-3" />
            <p className="text-sm text-muted-foreground">
              {analysis
                ? "I'm ready. Ask me anything about the scan results."
                : "Upload an image first to enable the AI assistant."}
            </p>
          </div>
        )}

        {chatHistory.map((message, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === "user" ? "bg-primary/10" : "bg-accent/10"
              }`}
            >
              {message.role === "user" ? (
                <User size={14} />
              ) : (
                <Bot size={14} className="text-accent" />
              )}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/80 border border-border text-foreground"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isChatting && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
              <Bot size={14} className="text-accent" />
            </div>
            <div className="bg-secondary/80 border border-border rounded-2xl px-4 py-3">
              <Loader
                className="animate-spin text-muted-foreground"
                size={16}
              />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card">
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder={
              analysis ? "Ask a question..." : "Upload image to start..."
            }
            disabled={!analysis || isChatting}
            className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || !analysis || isChatting}
            className="p-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>

        {analysis && chatHistory.length === 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {["Why this diagnosis?", "Affected region?", "Confidence?"].map(
              (txt) => (
                <button
                  key={txt}
                  onClick={() => handleSendMessage(txt)}
                  className="whitespace-nowrap px-3 py-1.5 rounded-full border border-border bg-secondary/30 text-[11px] font-medium hover:bg-secondary transition-colors"
                >
                  {txt}
                </button>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
