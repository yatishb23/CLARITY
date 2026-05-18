"use client";

import { useClarityStore } from "@/lib/store";
import { Navbar } from "@/components/navbar";
import { useState, useEffect } from "react";
import { SplitSquareHorizontal, Image as ImageIcon } from "lucide-react";

export default function ComparePage() {
  const { scanCache } = useClarityStore();
  const [mounted, setMounted] = useState(false);
  
  // Local storage fallback state
  const [localScans, setLocalScans] = useState<Record<string, any>>({});
  
  // Selection state
  const [leftScanId, setLeftScanId] = useState<string>("");
  const [rightScanId, setRightScanId] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    try {
      const lsData = window.localStorage.getItem("clarity-storage");
      if (lsData) {
        const parsed = JSON.parse(lsData);
        if (parsed?.state?.scanCache) {
          setLocalScans(parsed.state.scanCache);
        }
      }
    } catch (e) {
      console.error("Failed to parse localStorage", e);
    }
  }, []);

  const mergedCache = { ...localScans, ...scanCache };
  const availableScans = Object.entries(mergedCache || {});

  const leftScan = mergedCache[leftScanId];
  const rightScan = mergedCache[rightScanId];

  return (
    <main className="relative flex h-screen flex-col overflow-hidden" style={{ background: "var(--color-bg)" }}>
      <Navbar />

      <div className="flex-1 flex flex-col p-4 md:p-6 min-h-0">
        <header className="mb-4 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <SplitSquareHorizontal size={20} className="text-[var(--color-text-dim)]" />
              Comparative Analysis
            </h1>
            <p className="text-[12px] mt-1" style={{ color: "var(--color-text-ghost)" }}>
              Side-by-side progression tracking using historical cached scans.
            </p>
          </div>
        </header>

        {!mounted ? (
          <div className="flex-1 flex items-center justify-center opacity-50">Loading interface...</div>
        ) : availableScans.length < 2 ? (
          <div className="flex-1 flex flex-col items-center justify-center border border-dashed rounded-lg opacity-50" style={{ borderColor: "var(--color-border)" }}>
            <ImageIcon size={48} className="mb-4" />
            <p className="text-sm">Not enough scans for comparison.</p>
            <p className="text-xs mt-1">Please analyze at least two scans to use this feature.</p>
          </div>
        ) : (
          <div className="flex-1 flex gap-4 min-h-0">
            {/* Left Viewer */}
            <div className="flex-1 glass-card flex flex-col overflow-hidden">
              <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-surface-dim)] shrink-0">
                <select 
                  className="w-full bg-transparent text-sm outline-none font-medium cursor-pointer"
                  value={leftScanId}
                  onChange={(e) => setLeftScanId(e.target.value)}
                >
                  <option value="" disabled>Select Prior Scan...</option>
                  {availableScans.map(([id]) => (
                    <option key={`left-${id}`} value={id}>{id}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 relative bg-black/5 p-4 flex items-center justify-center">
                {leftScan ? (
                  <div className="relative h-full w-full flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={leftScan.uploadedImageDataUrl} 
                      alt="Left Scan" 
                      className="max-h-full max-w-full object-contain drop-shadow-2xl rounded-md"
                    />
                    <div className="absolute bottom-4 right-4 viewer-badge bg-black/60 backdrop-blur-md">
                      PRIOR: {leftScan.reportData?.model || "Unknown Model"}
                    </div>
                  </div>
                ) : (
                  <div className="opacity-30 text-xs uppercase tracking-widest font-semibold flex items-center gap-2">
                    <ImageIcon size={14} /> Select a scan
                  </div>
                )}
              </div>
            </div>

            {/* Right Viewer */}
            <div className="flex-1 glass-card flex flex-col overflow-hidden">
              <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-surface-dim)] shrink-0">
                <select 
                  className="w-full bg-transparent text-sm outline-none font-medium cursor-pointer"
                  value={rightScanId}
                  onChange={(e) => setRightScanId(e.target.value)}
                >
                  <option value="" disabled>Select Current Scan...</option>
                  {availableScans.map(([id]) => (
                    <option key={`right-${id}`} value={id}>{id}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 relative bg-black/5 p-4 flex items-center justify-center">
                {rightScan ? (
                  <div className="relative h-full w-full flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={rightScan.uploadedImageDataUrl} 
                      alt="Right Scan" 
                      className="max-h-full max-w-full object-contain drop-shadow-2xl rounded-md"
                    />
                    <div className="absolute bottom-4 right-4 viewer-badge bg-black/60 backdrop-blur-md">
                      CURRENT: {rightScan.reportData?.model || "Unknown Model"}
                    </div>
                  </div>
                ) : (
                  <div className="opacity-30 text-xs uppercase tracking-widest font-semibold flex items-center gap-2">
                    <ImageIcon size={14} /> Select a scan
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
