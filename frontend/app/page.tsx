"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { ImageViewer } from "@/components/image-viewer";
import { ReportView } from "@/components/report-view";
import { ChatBox } from "@/components/chat-box";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'report' | 'chat'>('report');

  return (
    <main className="relative flex h-screen flex-col overflow-hidden" style={{ background: "var(--color-bg)" }}>
      <Navbar />

      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left — Image viewer (55%) */}
        <div className="h-[50vh] w-full shrink-0 lg:h-full lg:w-[55%]">
          <ImageViewer />
        </div>

        {/* Right — Tabs Panel (45%) */}
        <div className="flex min-h-0 w-full flex-1 flex-col lg:h-full border-l border-[var(--color-border)]">
          {/* Tabs Header */}
          <div className="flex items-center px-2 border-b border-[var(--color-border)]">
            <button
              onClick={() => setActiveTab('report')}
              className={`px-4 py-3 text-[12px] font-semibold tracking-wider uppercase transition-colors outline-none ${
                activeTab === 'report'
                  ? 'text-[var(--color-text)] border-b-2 border-[var(--color-text)]'
                  : 'text-[var(--color-text-ghost)] hover:text-[var(--color-text-dim)] border-b-2 border-transparent'
              }`}
            >
              Analysis Report
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-3 text-[12px] font-semibold tracking-wider uppercase transition-colors outline-none ${
                activeTab === 'chat'
                  ? 'text-[var(--color-text)] border-b-2 border-[var(--color-text)]'
                  : 'text-[var(--color-text-ghost)] hover:text-[var(--color-text-dim)] border-b-2 border-transparent'
              }`}
            >
              Ask AI
            </button>
            
            <div className="flex-1" />
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-[10px] font-semibold tracking-widest uppercase transition-colors rounded-md border"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-text-dim)",
                background: "var(--color-surface-dim)",
              }}
            >
              Print
            </button>
          </div>

          {/* Tab Content Areas (hidden instead of unmounted to preserve state) */}
          <div className={`flex-1 min-h-0 ${activeTab === 'report' ? 'block' : 'hidden'}`}>
            <ReportView />
          </div>
          <div className={`flex-1 min-h-0 flex flex-col ${activeTab === 'chat' ? 'flex' : 'hidden'}`}>
            <ChatBox />
          </div>
        </div>
      </div>
    </main>
  );
}
