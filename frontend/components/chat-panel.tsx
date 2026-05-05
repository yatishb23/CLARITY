"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader, User, Bot, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useClarityStore } from "@/lib/store";
import axios from "axios";
import { ChatMessage, ChatResponse } from "@/lib/api-types";

const QUICK_PROMPTS = [
  "Why this diagnosis?",
  "Affected region?",
  "Confidence level?",
];

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
        session_id: analysis.session_id || "fallback-session-id",
        message: text,
        history: chatHistory,
      });

      addChatMessage({
        role: "assistant",
        content: response.data.reply,
      });

      if (response.data.image_b64) {
        useClarityStore.setState({
          currentOverlay: response.data.image_b64,
          // Since this is a Grad-CAM request, we don't have the original attention map
          currentAttentionMap: null,
          currentHeatmapData: null,
          // Unset the localized sentence index because we are viewing a global grad-cam instead of a sentence specific
          selectedSentenceIndex: -1,
        });
      }
    } catch (error) {
      addChatMessage({
        role: "assistant",
        content: "Unable to process the request. Ensure backend is running.",
      });
    } finally {
      setChatting(false);
    }
  };

  return (
    <div
      className="flex flex-col h-full 
                    bg-neutral-50 dark:bg-neutral-950 
                    border-l border-neutral-200 dark:border-neutral-800"
    >
      {/* Header */}
      <div
        className="border-b border-neutral-200 dark:border-neutral-800 
                      px-5 py-4 
                      bg-neutral-100 dark:bg-neutral-900"
      >
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-0.5">
          AI Assistant
        </p>
        <h2
          className="text-sm font-semibold flex items-center gap-2 
                       text-neutral-800 dark:text-neutral-200"
        >
          <Bot size={14} className="text-teal-500" />
          Diagnostic Consultation
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 pb-8">
            <div
              className="p-4 rounded-2xl border 
                            border-neutral-200 dark:border-neutral-800 
                            bg-neutral-100 dark:bg-neutral-900 mb-4"
            >
              <MessageSquare
                size={22}
                className="text-neutral-400 opacity-30"
              />
            </div>

            <p
              className="text-[13px] font-medium 
                          text-neutral-700 dark:text-neutral-300 mb-1"
            >
              {analysis ? "Ready for consultation" : "Upload an image first"}
            </p>

            <p
              className="text-[11px] 
                          text-neutral-500 dark:text-neutral-400 
                          max-w-[180px]"
            >
              {analysis
                ? "Ask questions about the findings."
                : "A scan is required to enable assistant."}
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
              className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                message.role === "user"
                  ? "bg-neutral-200 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700"
                  : "bg-teal-500/10 border-teal-500/30"
              }`}
            >
              {message.role === "user" ? (
                <User
                  size={11}
                  className="text-neutral-600 dark:text-neutral-300"
                />
              ) : (
                <Bot size={11} className="text-teal-500" />
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] ${
                message.role === "user"
                  ? "bg-teal-500 text-white rounded-br-sm"
                  : "bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-bl-sm prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:m-0"
              }`}
            >
              {message.role === "assistant" ? (
                <ReactMarkdown
                  components={{
                    p: ({ node, ...props }) => (
                      <p className="mb-2 last:mb-0" {...props} />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong
                        className="font-semibold text-teal-700 dark:text-teal-400"
                        {...props}
                      />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="my-2 list-disc pl-4" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="my-2 list-decimal pl-4" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="mb-1" {...props} />
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}

        {isChatting && (
          <div className="flex items-end gap-2.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center 
                            bg-teal-500/10 border border-teal-500/30"
            >
              <Bot size={11} className="text-teal-500" />
            </div>

            <div
              className="bg-neutral-100 dark:bg-neutral-900 
                            border border-neutral-200 dark:border-neutral-800 
                            rounded-2xl px-3.5 py-3"
            >
              <Loader className="animate-spin text-neutral-500" size={14} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {analysis && chatHistory.length === 0 && (
        <div className="px-5 pb-2 flex gap-1.5 overflow-x-auto">
          {QUICK_PROMPTS.map((txt) => (
            <button
              key={txt}
              onClick={() => handleSendMessage(txt)}
              className="text-[11px] font-medium px-2.5 py-1.5 rounded-md border 
                         border-neutral-200 dark:border-neutral-800 
                         bg-neutral-100 dark:bg-neutral-900 
                         text-neutral-600 dark:text-neutral-400 
                         hover:text-teal-500 hover:border-teal-500/40"
            >
              {txt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div
        className="px-5 py-4 border-t 
                      border-neutral-200 dark:border-neutral-800 
                      bg-neutral-100 dark:bg-neutral-900"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder={analysis ? "Ask about the scan…" : "Upload image"}
            disabled={!analysis || isChatting}
            className="flex-1 px-3.5 py-2.5 rounded-lg border 
                       bg-neutral-50 dark:bg-neutral-950 
                       border-neutral-200 dark:border-neutral-800 
                       text-neutral-800 dark:text-neutral-200 
                       placeholder:text-neutral-400 
                       focus:outline-none focus:ring-1 focus:ring-teal-500/40 
                       disabled:opacity-40"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || !analysis || isChatting}
            className="p-2.5 bg-teal-500 text-white rounded-lg 
                       hover:bg-teal-600 
                       disabled:opacity-40"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
