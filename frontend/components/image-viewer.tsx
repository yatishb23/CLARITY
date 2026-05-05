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
    <div
      className="flex flex-col h-full 
                    bg-neutral-50 dark:bg-neutral-950 
                    border-r border-neutral-200 dark:border-neutral-800"
    >
      {/* Header */}
      <div
        className="border-b border-neutral-200 dark:border-neutral-800 
                      px-3 sm:px-5 py-3 sm:py-3.5 
                      bg-neutral-100 dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 mb-0.5">
              Imaging Modality
            </p>
            <h3 className="text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              Chest Radiograph · AP View
            </h3>
          </div>

          <div
            className="flex items-center gap-1 
                          bg-neutral-50 dark:bg-neutral-950 
                          border border-neutral-200 dark:border-neutral-800 
                          rounded-md px-1.5 py-1"
          >
            <button
              onClick={() => handleZoom("out")}
              className="p-1 rounded 
                         text-neutral-500 dark:text-neutral-400 
                         hover:bg-neutral-200 dark:hover:bg-neutral-800 
                         hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              <ZoomOut size={13} />
            </button>

            <span
              className="text-[11px] font-mono font-semibold w-9 text-center 
                             text-neutral-800 dark:text-neutral-200"
            >
              {Math.round(scale * 100)}%
            </span>

            <button
              onClick={() => handleZoom("in")}
              className="p-1 rounded 
                         text-neutral-500 dark:text-neutral-400 
                         hover:bg-neutral-200 dark:hover:bg-neutral-800 
                         hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div
        className="border-b border-neutral-200 dark:border-neutral-800 
                      px-3 sm:px-5 py-2 sm:py-3 
                      bg-neutral-100 dark:bg-neutral-900 
                      flex items-center justify-between sm:justify-start gap-4 sm:gap-6"
      >
        {/* Toggle */}
        <label className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group">
          <div className="relative flex h-4 sm:h-5 w-8 sm:w-9 items-center">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              className="peer sr-only"
            />
            <div
              className="h-[16px] sm:h-[18px] w-8 sm:w-9 rounded-full 
                            bg-neutral-300 dark:bg-neutral-700 
                            peer-checked:bg-teal-500"
            />
            <div
              className="absolute left-0.5 h-3 sm:h-3.5 w-3 sm:w-3.5 rounded-full 
                            bg-white shadow-sm 
                            transition-transform 
                            peer-checked:translate-x-[16px] sm:peer-checked:translate-x-[18px]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Layers size={10} className="text-neutral-500 sm:w-[11px] sm:h-[11px]" />
            <span
              className="text-[10px] sm:text-[11px] 
                             text-neutral-600 dark:text-neutral-400 
                             group-hover:text-neutral-900 dark:group-hover:text-neutral-200"
            >
              {overlayLabel}
            </span>
          </div>
        </label>

        {/* Opacity */}
        {showHeatmap && currentOverlay && (
          <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-[150px] sm:max-w-[200px]">
            <span className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 hidden sm:inline">
              Intensity
            </span>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={heatmapOpacity}
              onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
              className="flex-1 h-[3px] appearance-none rounded-full 
                         cursor-pointer 
                         bg-neutral-300 dark:bg-neutral-700 
                         accent-teal-500"
            />

            <span
              className="text-[11px] w-7 text-right 
                             text-neutral-500 dark:text-neutral-400"
            >
              {Math.round(heatmapOpacity * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Viewport */}
      <div
        className="flex-1 overflow-hidden relative flex items-center justify-center p-6 
                     bg-neutral-900"
      >
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #94a3b8 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />

        {isAnalyzing ? (
          <div className="flex flex-col items-center gap-5">
            <div className="w-14 h-14 border border-teal-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-neutral-400">Processing...</p>
          </div>
        ) : selectedImage ? (
          <div
            className="relative transition-transform duration-300"
            style={{
              height: "85%",
              aspectRatio: "1 / 1",
              transform: `scale(${scale})`,
            }}
          >
            <img
              src={`data:image/png;base64,${selectedImage}`}
              className="w-full h-full object-contain rounded shadow-xl"
            />

            {currentOverlay && (
              <img
                src={`data:image/png;base64,${currentOverlay}`}
                className="absolute inset-0 w-full h-full object-contain rounded"
                style={{ opacity: showHeatmap ? heatmapOpacity : 0 }}
              />
            )}

            <div className="absolute bottom-3 left-3 flex gap-1.5">
              <span
                className="text-xs px-2 py-1 rounded 
                              bg-neutral-800 
                              text-neutral-300"
              >
                512 × 512
              </span>
              <span
                className="text-xs px-2 py-1 rounded 
                               bg-neutral-800 
                               text-neutral-300"
              >
                DICOM
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-neutral-500">
            <Maximize2 size={28} className="opacity-20" />
            <p className="text-xs">Awaiting image upload</p>
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      {selectedSentenceIndex !== null && selectedSentenceIndex !== -1 && currentOverlay && (
        <div className="h-auto sm:h-[240px] bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 p-3 sm:p-4 shrink-0 flex flex-col">
          <p className="text-[10px] sm:text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 mb-2 sm:mb-3">
            Attention Breakdown · Sentence {selectedSentenceIndex + 1}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 min-h-0">
            {/* Original */}
            <div className="flex flex-col items-center gap-1 sm:gap-1.5 h-[150px] sm:h-auto min-h-0">
              <div className="w-full flex-1 min-h-0 bg-white dark:bg-black/50 rounded-md border border-neutral-200 dark:border-white/10 overflow-hidden flex items-center justify-center p-1 relative">
                <img
                  src={`data:image/png;base64,${selectedImage}`}
                  className="w-full h-full object-contain rounded-sm"
                  alt="Original"
                />
              </div>
              <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider shrink-0">
                Original Image
              </span>
            </div>

            {/* Saliency */}
            {(currentAttentionMap || currentHeatmapData) ? (
              <div className="flex flex-col items-center gap-1 sm:gap-1.5 h-[150px] sm:h-auto min-h-0">
                <div className="w-full flex-1 min-h-0 bg-white dark:bg-black/50 rounded-md border border-neutral-200 dark:border-white/10 overflow-hidden flex items-center justify-center p-1 relative">
                  {currentAttentionMap ? (
                    <img
                      src={`data:image/png;base64,${currentAttentionMap}`}
                      alt="Attention Map"
                      className="w-full h-full object-contain rounded-sm mix-blend-multiply dark:mix-blend-screen"
                    />
                  ) : currentHeatmapData ? (
                    <HeatmapCanvas data={currentHeatmapData} />
                  ) : null}
                </div>
                <span className="text-[10px] font-medium text-teal-600 dark:text-teal-500/80 uppercase tracking-wider shrink-0">
                  Saliency Map
                </span>
              </div>
            ) : (
               <div />
            )}

            {/* Overlay */}
            <div className="flex flex-col items-center gap-1 sm:gap-1.5 h-[150px] sm:h-auto min-h-0">
              <div className="w-full flex-1 min-h-0 bg-white dark:bg-black/50 rounded-md border border-neutral-200 dark:border-white/10 overflow-hidden flex items-center justify-center p-1 relative">
                <img
                  src={`data:image/png;base64,${selectedImage}`}
                  className="w-full h-full object-contain rounded-sm absolute inset-0 p-1"
                  alt="Base"
                />
                <img
                  src={`data:image/png;base64,${currentOverlay}`}
                  className="w-full h-full object-contain rounded-sm absolute inset-0 p-1"
                  style={{ opacity: 0.7 }}
                  alt="Overlay"
                />
              </div>
              <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider shrink-0">
                Overlay
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
