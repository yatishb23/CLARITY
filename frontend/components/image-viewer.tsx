"use client";

import { useState, useRef } from "react";
import { ZoomIn, ZoomOut, Maximize2, Layers } from "lucide-react";
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

  const lastOverlay = useRef<string | null>(null);
  if (currentOverlay && currentOverlay !== lastOverlay.current) {
    if (!showHeatmap) setShowHeatmap(true);
    lastOverlay.current = currentOverlay;
  } else if (!currentOverlay) {
    lastOverlay.current = null;
  }

  const overlayLabel = currentOverlay?.startsWith("iVBORw0KGgo")
    ? "Attention Layer"
    : "Activation Map";

  return (
    <div className="flex flex-col h-full bg-surface-primary border-r border-ui-border font-body">
      {/* Header */}
      <div className="border-b border-ui-border px-5 py-3.5 bg-surface-secondary/80 backdrop-blur-md clay-shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-label-xs text-text-muted mb-0.5">Imaging Modality</p>
            <h3 className="text-sm font-semibold text-text-primary tracking-tight">
              Chest Radiograph · AP View
            </h3>
          </div>
          <div className="flex items-center gap-1.5 bg-surface-primary border border-ui-border rounded-2xl px-2 py-1.5 clay-shadow-sm">
            <button
              onClick={() => handleZoom("out")}
              className="p-1.5 hover:bg-surface-hover rounded-lg text-text-secondary hover:text-text-primary transition-colors"
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[11px] font-mono font-semibold w-10 text-center text-text-primary tabular-nums">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => handleZoom("in")}
              className="p-1.5 hover:bg-surface-hover rounded-lg text-text-secondary hover:text-text-primary transition-colors"
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Layer Controls */}
      <div className="border-b border-ui-border px-5 py-3 bg-surface-secondary/80 backdrop-blur-md clay-shadow-sm flex items-center gap-6">
        {/* Toggle */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none group">
          <div className="relative flex h-5 w-9 items-center flex-shrink-0">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-[18px] w-9 rounded-full bg-ui-border transition-colors peer-checked:bg-clinical-teal" />
            <div className="absolute left-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-[18px]" />
          </div>
          <div className="flex items-center gap-1.5">
            <Layers size={11} className="text-text-muted" />
            <span className="text-label-xs text-text-secondary group-hover:text-text-primary transition-colors">
              {overlayLabel}
            </span>
          </div>
        </label>

        {/* Opacity Slider */}
        {showHeatmap && currentOverlay && (
          <div className="flex items-center gap-3 flex-1 max-w-[200px]">
            <span className="text-label-xs text-text-muted whitespace-nowrap">
              Intensity
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={heatmapOpacity}
              onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
              className="flex-1 h-[3px] appearance-none rounded-full cursor-pointer
                         bg-ui-border accent-clinical-teal"
            />
            <span className="text-label-xs text-text-muted tabular-nums w-7 text-right">
              {Math.round(heatmapOpacity * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Viewport */}
      <div className="flex-1 overflow-hidden relative flex items-center justify-center p-6 bg-viewer-bg">
        {/* Subtle dot-grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />

        {isAnalyzing ? (
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-clinical-teal/20" />
              <div className="absolute inset-0 rounded-full border-2 border-t-clinical-teal border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-1.5 animate-pulse">
                Processing
              </p>
              <p className="text-[11px] text-text-muted max-w-[180px] leading-relaxed">
                Computing attention weights across spatial domain…
              </p>
            </div>
          </div>
        ) : selectedImage ? (
          <div
            className="relative transition-transform duration-300 ease-out"
            style={{
              height: "85%",
              aspectRatio: "1 / 1",
              transform: `scale(${scale})`,
            }}
          >
            <img
              src={`data:image/png;base64,${selectedImage}`}
              alt="Chest X-Ray"
              className="w-full h-full object-contain rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.25)]"
            />

            {currentOverlay && (
              <img
                src={`data:image/png;base64,${currentOverlay}`}
                alt="Heatmap Overlay"
                className="absolute inset-0 w-full h-full object-contain rounded pointer-events-none transition-opacity duration-300"
                style={{ opacity: showHeatmap ? heatmapOpacity : 0 }}
              />
            )}

            {/* DICOM metadata badge */}
            <div className="absolute bottom-3 left-3 flex gap-1.5">
              <span className="viewer-badge">512 × 512</span>
              <span className="viewer-badge">DICOM</span>
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-center gap-4 text-text-muted">
            <div className="p-5 rounded-3xl border border-ui-border bg-surface-secondary clay-shadow-sm">
              <Maximize2 size={32} className="opacity-30" />
            </div>
            <p className="text-label-xs text-text-muted">
              Awaiting image upload
            </p>
          </div>
        )}
      </div>

      {/* Sentence Attention Detail */}
      {selectedSentenceIndex !== null && currentOverlay && (
        <div className="h-[210px] bg-surface-secondary border-t border-ui-border flex flex-col p-4 clay-shadow-sm">
          <p className="text-label-xs text-text-muted mb-3 uppercase tracking-widest">
            Attention Breakdown · Sentence {selectedSentenceIndex + 1}
          </p>
          <div
            className={`flex-1 grid ${
              currentAttentionMap || currentHeatmapData ? "grid-cols-3" : "grid-cols-2"
            } gap-4`}
          >
            {/* Original */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex-1 w-full bg-viewer-bg rounded-xl border border-ui-border overflow-hidden relative">
                <img
                  src={`data:image/png;base64,${selectedImage}`}
                  alt="Original"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </div>
              <span className="text-label-xs text-text-muted">Original</span>
            </div>

            {/* Attention / Heatmap */}
            {(currentAttentionMap || currentHeatmapData) && (
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex-1 w-full bg-viewer-bg rounded-xl border border-ui-border overflow-hidden relative">
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
                <span className="text-label-xs text-text-muted">Attention Map</span>
              </div>
            )}

            {/* Overlay */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex-1 w-full bg-viewer-bg rounded-xl border border-ui-border overflow-hidden relative">
                <img
                  src={`data:image/png;base64,${currentOverlay}`}
                  alt="Overlay"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </div>
              <span className="text-label-xs text-text-muted">Overlay</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
