"use client";

import { useState, useRef } from "react";
import { ZoomIn, ZoomOut, Maximize2, X } from "lucide-react";
import { useClarityStore } from "@/lib/store";
import { HeatmapCanvas } from "./heatmap-canvas";

export function ImageViewer() {
  const [scale, setScale] = useState(1);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.6);
  const {
    selectedImage,
    currentOverlay,
    currentAttentionMap,
    currentHeatmapData,
    selectedSentenceIndex,
    isAnalyzing,
  } = useClarityStore();

  const handleZoom = (direction: "in" | "out") => {
    setScale((prev) => {
      const newScale = direction === "in" ? prev + 0.1 : prev - 0.1;
      return Math.max(0.5, Math.min(newScale, 3));
    });
  };

  // Ensure showHeatmap is true when currentOverlay changes
  const lastOverlay = useRef<string | null>(null);
  if (currentOverlay && currentOverlay !== lastOverlay.current) {
    if (!showHeatmap) setShowHeatmap(true);
    lastOverlay.current = currentOverlay;
  } else if (!currentOverlay) {
    lastOverlay.current = null;
  }

  return (
    <div className="flex flex-col h-full bg-card border-r border-border font-sans">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 bg-muted/30 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              Visual Evidence
            </h3>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
              Modality: Chest Radiograph (X-Ray)
            </p>
          </div>
          <div className="flex items-center gap-2 bg-background/50 border border-border px-3 py-1.5 rounded-full">
            <button
              onClick={() => handleZoom("out")}
              className="p-1 hover:bg-muted rounded-full transition-colors"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[10px] font-black w-8 text-center tabular-nums">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => handleZoom("in")}
              className="p-1 hover:bg-muted rounded-full transition-colors"
            >
              <ZoomIn size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Controls / Layers */}
      <div className="border-b border-border px-6 py-4 grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
            <div className="relative flex h-5 w-10 items-center">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-4 w-9 rounded-full bg-border transition-colors peer-checked:bg-accent ring-1 ring-inset ring-black/5"></div>
              <div className="absolute left-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"></div>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
              {currentOverlay?.startsWith("iVBORw0KGgo")
                ? "Attention Layer"
                : "Activation Map"}
            </span>
          </label>
        </div>

        <div className="space-y-4">
          {showHeatmap && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                <span>Intensity</span>
                <span>{Math.round(heatmapOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={heatmapOpacity}
                onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-accent"
              />
            </div>
          )}
        </div>
      </div>

      {/* Image Display Area */}
      <div className="flex-1 overflow-hidden relative flex items-center justify-center p-8 bg-[#0a0a0a]">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#ffffff 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        {isAnalyzing ? (
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-16 h-16 border-2 border-accent/20 rounded-full" />
              <div className="absolute inset-0 w-16 h-16 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground tracking-widest uppercase mb-2 animate-pulse font-sans">
                Processing Voxel Data
              </p>
              <p className="text-[10px] text-muted-foreground max-w-[200px]">
                MedGemma is computing attention weights across the spatial
                domain...
              </p>
            </div>
          </div>
        ) : selectedImage ? (
          <div
            className="relative shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-lg transition-transform duration-300 ease-out"
            style={{
              width: "auto",
              height: "85%",
              aspectRatio: "1/1",
              transform: `scale(${scale})`,
            }}
          >
            {/* Base Image */}
            <img
              src={`data:image/png;base64,${selectedImage}`}
              alt="Chest X-Ray"
              className="w-full h-full object-contain rounded-lg shadow-2xl"
            />

            {/* Heatmap Overlay (Grad-CAM or Sentence Attention) */}
            {currentOverlay && (
              <img
                src={`data:image/png;base64,${currentOverlay}`}
                alt="Heatmap Overlay"
                className="absolute inset-0 w-full h-full object-contain rounded-lg pointer-events-none transition-opacity duration-300"
                style={{ opacity: showHeatmap ? heatmapOpacity : 0 }}
              />
            )}

            {/* Viewport Info */}
            <div className="absolute bottom-4 left-4 flex gap-2">
              <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[9px] font-mono text-white/50 border border-white/10 uppercase tracking-tighter">
                512 x 512
              </div>
              <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[9px] font-mono text-white/50 border border-white/10 uppercase tracking-tighter">
                DICOM Render
              </div>
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-center gap-4 text-muted-foreground">
            <div className="p-6 rounded-3xl border border-border bg-muted/50">
              <Maximize2 size={32} className="opacity-20" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]">
              Awaiting Modality Input
            </p>
          </div>
        )}
      </div>

      {/* Detail View (Only shows when a sentence is selected) */}
      {selectedSentenceIndex !== null && currentOverlay && (
        <div className="h-[220px] bg-card/95 backdrop-blur border-t border-border flex flex-col p-4 z-20 shadow-md">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center justify-between">
            <span>
              Attention Breakdown (Sentence {selectedSentenceIndex + 1})
            </span>
          </div>
          <div
            className={`flex-1 grid ${currentAttentionMap || currentHeatmapData ? "grid-cols-3" : "grid-cols-2"} gap-6 px-12`}
          >
            {/* Original */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex-1 w-full bg-black rounded-lg border border-border overflow-hidden relative shadow-sm">
                <img
                  src={`data:image/png;base64,${selectedImage}`}
                  alt="Original"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </div>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                Original
              </span>
            </div>
            {/* Attention Map (Only if available) */}
            {(currentAttentionMap || currentHeatmapData) && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex-1 w-full bg-black rounded-lg border border-border overflow-hidden relative shadow-sm">
                  {currentAttentionMap ? (
                    <img
                      src={`data:image/png;base64,${currentAttentionMap}`}
                      alt="Attention Map"
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                  ) : currentHeatmapData ? (
                    <HeatmapCanvas data={currentHeatmapData} />
                  ) : null}
                </div>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  Attention Map
                </span>
              </div>
            )}
            {/* Overlay */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex-1 w-full bg-black rounded-lg border border-border overflow-hidden relative shadow-sm">
                <img
                  src={`data:image/png;base64,${currentOverlay}`}
                  alt="Overlay"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </div>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                Overlay
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
