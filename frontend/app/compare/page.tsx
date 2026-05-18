"use client";

import { useClarityStore } from "@/lib/store";
import { Navbar } from "@/components/navbar";
import { useState, useEffect, useRef } from "react";
import { SplitSquareHorizontal, Image as ImageIcon, UploadCloud, Loader2, GitCompare, MousePointerClick } from "lucide-react";
import type { AnalyzeResponse } from "@/lib/api-types";

export default function ComparePage() {
  const { scanCache, parallelCache, cacheParallelAnalysis, _hasHydrated } = useClarityStore();
  
  // UI State
  const [mode, setMode] = useState<"historical" | "manual">("historical");
  
  // Historical Selection state
  const [leftScanId, setLeftScanId] = useState<string>("");
  const [rightScanId, setRightScanId] = useState<string>("");

  // Manual Mode state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [manualOriginalImage, setManualOriginalImage] = useState<string | null>(null);
  const [manualLeftScan, setManualLeftScan] = useState<AnalyzeResponse | null>(null);
  const [manualRightScan, setManualRightScan] = useState<AnalyzeResponse | null>(null);
  const [leftSentenceIdx, setLeftSentenceIdx] = useState<number | null>(null);
  const [rightSentenceIdx, setRightSentenceIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Restore the most recent parallel analysis if we don't have one active
    if (_hasHydrated && !manualLeftScan) {
      const keys = Object.keys(parallelCache);
      if (keys.length > 0) {
        const latest = parallelCache[keys[keys.length - 1]];
        setManualOriginalImage(latest.manualOriginalImage);
        setManualLeftScan(latest.manualLeftScan);
        setManualRightScan(latest.manualRightScan);
        setLeftSentenceIdx(null);
        setRightSentenceIdx(null);
      }
    }
  }, [_hasHydrated]);

  const availableScans = Object.entries(scanCache || {});

  const leftScan = scanCache[leftScanId];
  const rightScan = scanCache[rightScanId];

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check Network Cache (parallelCache) first
    if (parallelCache[file.name]) {
      const cached = parallelCache[file.name];
      setManualOriginalImage(cached.manualOriginalImage);
      setManualLeftScan(cached.manualLeftScan);
      setManualRightScan(cached.manualRightScan);
      setLeftSentenceIdx(null);
      setRightSentenceIdx(null);
      return; // Instantly load without hitting the API
    }

    setIsAnalyzing(true);
    setManualLeftScan(null);
    setManualRightScan(null);
    setLeftSentenceIdx(null);
    setRightSentenceIdx(null);

    // Show the base image immediately and await it for the cache
    const base64Image = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setManualOriginalImage(result);
        resolve(result);
      };
      reader.readAsDataURL(file);
    });

    try {
      // Create FormData A (Standard Baseline)
      const fdA = new FormData();
      fdA.append("file", file);
      fdA.append("attn_sigma", "1.5");
      fdA.append("n_layers_from_end", "6");

      // Create FormData B (High-Sensitivity)
      const fdB = new FormData();
      fdB.append("file", file);
      fdB.append("attn_sigma", "2.5");
      fdB.append("n_layers_from_end", "12"); // Deeper attention probing

      // Fire parallel requests
      const [resA, resB] = await Promise.all([
        fetch("/api/analyze", { method: "POST", body: fdA }),
        fetch("/api/analyze", { method: "POST", body: fdB })
      ]);

      if (!resA.ok || !resB.ok) throw new Error("Parallel analysis failed.");

      const dataA: AnalyzeResponse = await resA.json();
      const dataB: AnalyzeResponse = await resB.json();

      setManualLeftScan(dataA);
      setManualRightScan(dataB);

      // Persist to cache so it survives tab reloads and prevents duplicate API calls
      cacheParallelAnalysis(file.name, {
        manualOriginalImage: base64Image,
        manualLeftScan: dataA,
        manualRightScan: dataB,
      });
    } catch (err) {
      console.error(err);
      alert("Error processing parallel analysis.");
    } finally {
      setIsAnalyzing(false);
      e.target.value = ""; // reset input
    }
  };

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
              {mode === "historical" 
                ? "Side-by-side progression tracking using historical cached scans."
                : "Parallel AI execution (Baseline vs High-Sensitivity) on a single radiograph."}
            </p>
          </div>

          <div className="flex bg-[var(--color-surface-dim)] rounded-lg p-1 border border-[var(--color-border)]">
            <button
              onClick={() => setMode("historical")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${mode === "historical" ? "bg-[var(--color-text)] text-[var(--color-bg)]" : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"}`}
            >
              Historical Scans
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${mode === "manual" ? "bg-[var(--color-text)] text-[var(--color-bg)]" : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"}`}
            >
              <GitCompare size={12} />
              Parallel Analysis
            </button>
          </div>
        </header>

        {!_hasHydrated ? (
          <div className="flex-1 flex items-center justify-center opacity-50">Loading interface...</div>
        ) : mode === "historical" ? (
          /* ── HISTORICAL MODE ─────────────────────────────────────────────────── */
          availableScans.length < 2 ? (
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
          )
        ) : (
          /* ── MANUAL PARALLEL MODE ────────────────────────────────────────────── */
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleManualUpload} 
            />

            {!manualLeftScan && !isAnalyzing && (
              <div 
                className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-colors cursor-pointer hover:bg-[var(--color-surface-dim)]" 
                style={{ borderColor: "var(--color-border)" }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="p-4 rounded-full bg-[var(--color-surface-dim)] mb-4">
                  <UploadCloud size={32} className="text-[var(--color-text-dim)]" />
                </div>
                <h3 className="text-lg font-bold">Upload Radiograph</h3>
                <p className="text-sm text-[var(--color-text-ghost)] mt-1">Click to trigger dual parallel analysis pipelines</p>
              </div>
            )}

            {(isAnalyzing || manualLeftScan) && (
              <div className="flex-1 flex gap-4 min-h-0">
                {/* Left Parallel Viewer */}
                <div className="flex-1 glass-card flex flex-col overflow-hidden">
                  <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-surface-dim)] shrink-0 flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-sub)]">Baseline Processing</span>
                    <span className="text-[10px] font-mono text-[var(--color-text-ghost)]">sigma=1.5 | layers=6</span>
                  </div>
                  <div className="flex-1 relative bg-black/5 p-4 flex flex-col min-h-0">
                    {isAnalyzing ? (
                      <div className="flex flex-col items-center justify-center h-full gap-3">
                        <Loader2 size={24} className="animate-spin text-[var(--color-accent)]" />
                        <span className="text-xs text-[var(--color-text-sub)]">Pipeline A running...</span>
                      </div>
                    ) : manualLeftScan && manualOriginalImage ? (
                      <>
                        <div className="flex-1 min-h-0 w-full flex items-center justify-center p-2 relative">
                          <div className="relative h-full w-full rounded-lg overflow-hidden border border-[rgba(255,255,255,0.05)] bg-black/20 flex items-center justify-center">
                            <img 
                              src={manualOriginalImage} 
                              alt="Original" 
                              className="absolute inset-0 h-full w-full object-contain"
                            />
                            {(leftSentenceIdx !== null && manualLeftScan.sentence_results?.[leftSentenceIdx]?.overlay_b64) ? (
                              <img 
                                src={`data:image/png;base64,${manualLeftScan.sentence_results[leftSentenceIdx].overlay_b64}`} 
                                alt="Overlay Heatmap" 
                                className="absolute inset-0 h-full w-full object-contain opacity-70 mix-blend-screen transition-all"
                              />
                            ) : manualLeftScan.gradcam_results?.[0]?.overlay_b64 ? (
                              <img 
                                src={`data:image/png;base64,${manualLeftScan.gradcam_results[0].overlay_b64}`} 
                                alt="Overlay Heatmap" 
                                className="absolute inset-0 h-full w-full object-contain opacity-70 mix-blend-screen transition-all"
                              />
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-4 p-3 rounded-lg bg-[var(--color-surface-dim)] border border-[var(--color-border)] w-full overflow-y-auto h-[40%] shrink-0 scrollbar-thin flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase text-[var(--color-text-ghost)]">Top Finding:</span>
                            <span className="text-sm font-semibold text-[var(--color-accent)]">{manualLeftScan.top_pathology}</span>
                          </div>
                          <div className="text-[10px] font-bold uppercase text-[var(--color-text-ghost)] mt-1 mb-1">Generated Sentences</div>
                          <p className="text-[13px] leading-relaxed text-[var(--color-text-sub)]">
                            {manualLeftScan.sentences.map((s, idx) => {
                              const text = typeof s === "string" ? s : (s as any).sentence;
                              const isSelected = leftSentenceIdx === idx;
                              return (
                                <span key={idx}>
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    aria-pressed={isSelected}
                                    onClick={() => setLeftSentenceIdx(isSelected ? null : idx)}
                                    className={`cursor-pointer transition-colors px-1 py-0.5 rounded ${
                                      isSelected 
                                        ? "bg-[var(--color-accent)] text-black font-semibold" 
                                        : "hover:bg-white/10"
                                    }`}
                                  >
                                    {text}
                                  </span>
                                  {idx < manualLeftScan.sentences.length - 1 ? " " : ""}
                                </span>
                              );
                            })}
                          </p>
                          {leftSentenceIdx === null && (
                            <div className="mt-2 text-[10px] text-[var(--color-text-ghost)] flex items-center gap-1">
                              <MousePointerClick size={10} /> Click a sentence to reveal its attention map
                            </div>
                          )}
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Right Parallel Viewer */}
                <div className="flex-1 glass-card flex flex-col overflow-hidden">
                  <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-surface-dim)] shrink-0 flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase tracking-wider text-[var(--color-ok)]">High Sensitivity</span>
                    <span className="text-[10px] font-mono text-[var(--color-text-ghost)]">sigma=2.5 | layers=12</span>
                  </div>
                  <div className="flex-1 relative bg-black/5 p-4 flex flex-col min-h-0">
                    {isAnalyzing ? (
                      <div className="flex flex-col items-center justify-center h-full gap-3">
                        <Loader2 size={24} className="animate-spin text-[var(--color-ok)]" />
                        <span className="text-xs text-[var(--color-text-sub)]">Pipeline B running...</span>
                      </div>
                    ) : manualRightScan && manualOriginalImage ? (
                      <>
                        <div className="flex-1 min-h-0 w-full flex items-center justify-center p-2 relative">
                          <div className="relative h-full w-full rounded-lg overflow-hidden border border-[rgba(255,255,255,0.05)] bg-black/20 flex items-center justify-center">
                            <img 
                              src={manualOriginalImage} 
                              alt="Original" 
                              className="absolute inset-0 h-full w-full object-contain"
                            />
                            {(rightSentenceIdx !== null && manualRightScan.sentence_results?.[rightSentenceIdx]?.overlay_b64) ? (
                              <img 
                                src={`data:image/png;base64,${manualRightScan.sentence_results[rightSentenceIdx].overlay_b64}`} 
                                alt="Overlay Heatmap" 
                                className="absolute inset-0 h-full w-full object-contain opacity-70 mix-blend-screen transition-all"
                              />
                            ) : manualRightScan.gradcam_results?.[0]?.overlay_b64 ? (
                              <img 
                                src={`data:image/png;base64,${manualRightScan.gradcam_results[0].overlay_b64}`} 
                                alt="Overlay Heatmap" 
                                className="absolute inset-0 h-full w-full object-contain opacity-70 mix-blend-screen transition-all"
                              />
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-4 p-3 rounded-lg bg-[var(--color-surface-dim)] border border-[var(--color-border)] w-full overflow-y-auto h-[40%] shrink-0 scrollbar-thin flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase text-[var(--color-text-ghost)]">Top Finding:</span>
                            <span className="text-sm font-semibold text-[var(--color-ok)]">{manualRightScan.top_pathology}</span>
                          </div>
                          <div className="text-[10px] font-bold uppercase text-[var(--color-text-ghost)] mt-1 mb-1">Generated Sentences</div>
                          <p className="text-[13px] leading-relaxed text-[var(--color-text-sub)]">
                            {manualRightScan.sentences.map((s, idx) => {
                              const text = typeof s === "string" ? s : (s as any).sentence;
                              const isSelected = rightSentenceIdx === idx;
                              return (
                                <span key={idx}>
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    aria-pressed={isSelected}
                                    onClick={() => setRightSentenceIdx(isSelected ? null : idx)}
                                    className={`cursor-pointer transition-colors px-1 py-0.5 rounded ${
                                      isSelected 
                                        ? "bg-[var(--color-ok)] text-black font-semibold" 
                                        : "hover:bg-white/10"
                                    }`}
                                  >
                                    {text}
                                  </span>
                                  {idx < manualRightScan.sentences.length - 1 ? " " : ""}
                                </span>
                              );
                            })}
                          </p>
                          {rightSentenceIdx === null && (
                            <div className="mt-2 text-[10px] text-[var(--color-text-ghost)] flex items-center gap-1">
                              <MousePointerClick size={10} /> Click a sentence to reveal its attention map
                            </div>
                          )}
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
            
            {(manualLeftScan || isAnalyzing) && (
              <button 
                onClick={() => {
                  setManualLeftScan(null);
                  setManualRightScan(null);
                  setManualOriginalImage(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                disabled={isAnalyzing}
                className="self-center mt-2 px-6 py-2 rounded-md bg-[var(--color-surface-dim)] border border-[var(--color-border)] text-sm font-medium hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Upload New Comparison
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
