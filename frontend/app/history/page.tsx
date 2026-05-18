"use client";

import { useClarityStore } from "@/lib/store";
import { Navbar } from "@/components/navbar";
import { useRouter } from "next/navigation";
import { Clock, ChevronRight, FileX } from "lucide-react";
import { useEffect, useState } from "react";

export default function HistoryPage() {
  const { scanCache, restoreFromScanCache } = useClarityStore();
  const router = useRouter();
  
  // Need to handle hydration mismatch by only rendering after mount
  const [mounted, setMounted] = useState(false);
  const [localScans, setLocalScans] = useState<Record<string, any>>({});

  useEffect(() => {
    setMounted(true);
    // Also read from standard localStorage to show older scans before IndexedDB switch
    try {
      const lsData = window.localStorage.getItem("clarity-storage");
      if (lsData) {
        const parsed = JSON.parse(lsData);
        if (parsed?.state?.scanCache) {
          setLocalScans(parsed.state.scanCache);
        }
      }
    } catch (e) {
      console.error("Failed to parse localStorage clarity-storage", e);
    }
  }, []);

  const handleRestore = (fileName: string) => {
    // If it's in localScans but not in the IDB scanCache, we could manually restore it,
    // but the store's restore function might only look at its own scanCache.
    // However, if we just push to home, the store needs to know about it.
    // For now, let's try the store's restore, and if it fails, we manually set it.
    if (restoreFromScanCache(fileName)) {
      router.push("/");
    } else if (localScans[fileName]) {
      const scan = localScans[fileName];
      useClarityStore.setState({
        reportData: scan.reportData,
        uploadedImageDataUrl: scan.uploadedImageDataUrl,
        sessionId: scan.sessionId,
        heatmapCache: scan.heatmapCache,
        chatMessages: scan.chatMessages,
        chatHistory: scan.chatHistory,
        selectedSentenceIndex: null,
        loadingHeatmapIndex: null,
      });
      router.push("/");
    }
  };

  // Merge the caches, preferring the store's cache
  const mergedCache = { ...localScans, ...scanCache };
  const cachedScans = Object.entries(mergedCache || {});

  return (
    <main className="relative flex h-screen flex-col overflow-hidden" style={{ background: "var(--color-bg)" }}>
      <Navbar />

      <div className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="mx-auto max-w-5xl">
          <header className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight mb-2">Scan History</h1>
            <p className="text-[13px]" style={{ color: "var(--color-text-dim)" }}>
              View and restore previously analyzed patient scans. All data is cached locally in your browser.
            </p>
          </header>

          {!mounted ? (
            <div className="flex h-40 items-center justify-center opacity-50">Loading history...</div>
          ) : cachedScans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50 border border-dashed rounded-lg" style={{ borderColor: "var(--color-border)" }}>
              <FileX size={48} className="mb-4" />
              <p className="text-sm">No scans in history.</p>
              <p className="text-xs mt-1">Upload and analyze an X-ray to see it here.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cachedScans.map(([fileName, scan]) => (
                <div 
                  key={fileName}
                  className="glass-card overflow-hidden flex flex-col group cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                  onClick={() => handleRestore(fileName)}
                >
                  <div className="h-40 w-full relative bg-black/10 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={scan.uploadedImageDataUrl} 
                      alt={fileName}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute top-2 right-2 viewer-badge bg-black/60 backdrop-blur-sm">
                      {scan.reportData.model}
                    </div>
                  </div>
                  
                  <div className="p-4 flex flex-col flex-1 border-t border-[var(--color-border)]">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-semibold truncate" title={fileName}>
                        {fileName}
                      </h3>
                    </div>
                    
                    <div className="mt-auto pt-4 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-dim)]">
                        <Clock size={12} />
                        <span>{scan.chatMessages.length + scan.chatHistory.flat().length} messages</span>
                      </div>
                      
                      <div className="text-xs font-medium text-[var(--color-text)] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                        Restore <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
