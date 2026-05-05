import { Navbar } from "@/components/navbar";
import { ImageViewer } from "@/components/image-viewer";
import { DiagnosisPanel } from "@/components/diagnosis-panel";
import { ChatPanel } from "@/components/chat-panel";

export default function Home() {
  return (
    <main className="h-screen flex flex-col bg-background">
      {/* Navbar */}
      <Navbar />

      {/* Main Workspace - 3 Panel System */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-x-hidden overflow-y-auto lg:overflow-hidden gap-0">
        {/* Left Panel - Image Viewer (40%) */}
        <div className="w-full lg:flex-1 flex flex-col min-w-0 h-[60vh] lg:h-full shrink-0">
          <ImageViewer />
        </div>

        {/* Center Panel - AI Diagnosis (30%) */}
        <div className="w-full lg:w-[30%] flex flex-col min-w-0 h-auto lg:h-full shrink-0 border-t lg:border-t-0 border-neutral-200 dark:border-neutral-800">
          <DiagnosisPanel />
        </div>

        {/* Right Panel - Chat Assistant (30%) */}
        <div className="w-full lg:w-[30%] flex flex-col min-w-0 h-[60vh] lg:h-full shrink-0 border-t lg:border-t-0 border-neutral-200 dark:border-neutral-800">
          <ChatPanel />
        </div>
      </div>
    </main>
  );
}
