import { Navbar } from "@/components/navbar";
import { ImageViewer } from "@/components/image-viewer";
import { ReportView } from "@/components/report-view";
import { ChatBox } from "@/components/chat-box";

export default function Home() {
  return (
    <main className="relative flex h-screen flex-col overflow-hidden" style={{ background: "var(--color-bg)" }}>
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--gradient-glow)" }}
      />

      <Navbar />

      {/* Two-panel workspace */}
      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left — Image viewer (55%) */}
        <div className="h-[50vh] w-full shrink-0 lg:h-full lg:w-[55%]">
          <ImageViewer />
        </div>

        {/* Right — Report (45%) + Chat */}
        <div className="flex min-h-0 w-full flex-1 flex-col lg:h-full">
          <div className="min-h-0 flex-1">
            <ReportView />
          </div>
          <ChatBox />
        </div>
      </div>
    </main>
  );
}
