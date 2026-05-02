import { Navbar } from '@/components/navbar';
import { ImageViewer } from '@/components/image-viewer';
import { DiagnosisPanel } from '@/components/diagnosis-panel';
import { ChatPanel } from '@/components/chat-panel';

export default function Home() {
  return (
    <main className="h-screen flex flex-col bg-background">
      {/* Navbar */}
      <Navbar />

      {/* Main Workspace - 3 Panel System */}
      <div className="flex-1 flex overflow-hidden gap-0">
        {/* Left Panel - Image Viewer (40%) */}
        <div className="flex-1 flex flex-col min-w-0">
          <ImageViewer />
        </div>

        {/* Center Panel - AI Diagnosis (30%) */}
        <div className="w-[30%] flex flex-col min-w-0">
          <DiagnosisPanel />
        </div>

        {/* Right Panel - Chat Assistant (30%) */}
        <div className="w-[30%] flex flex-col min-w-0">
          <ChatPanel />
        </div>
      </div>
    </main>
  );
}
