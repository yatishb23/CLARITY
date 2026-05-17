"use client";

import { useState, useEffect } from "react";
import { ZoomIn, ZoomOut, Layers, ScanSearch, Sparkles } from "lucide-react";
import { useClarityStore } from "@/lib/store";

export function ImageViewer() {
  const [scale, setScale] = useState(1);
  const [overlayOpacity, setOverlayOpacity] = useState(0.65);
  const [showOverlay, setShowOverlay] = useState(true);

  const {
    uploadedImageDataUrl,
    reportData,
    selectedSentenceIndex,
    loadingHeatmapIndex,
    heatmapCache,
    isUploading,
  } = useClarityStore();

  const currentOverlay =
    selectedSentenceIndex !== null
      ? heatmapCache[selectedSentenceIndex] ?? null
      : null;

  const isHeatmapLoading = loadingHeatmapIndex !== null;

  const handleZoom = (dir: "in" | "out") =>
    setScale((s) => Math.max(0.4, Math.min(3, s + (dir === "in" ? 0.15 : -0.15))));

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: "var(--color-viewer)",
        borderRight: "1px solid var(--color-border)",
      }}
    >
      {/* ── Toolbar ───────────────────────────────────────── */}
      <div
        className="flex items-center justify-between gap-4 px-4 py-2.5"
        style={{
          background: "rgba(0,0,0,0.4)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.3)" }}>
            Imaging Modality
          </p>
          <h3 className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.65)" }}>
            Chest Radiograph · AP View
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Overlay toggle */}
          {currentOverlay && (
            <label className="flex cursor-pointer items-center gap-2 group">
              <div className="relative flex h-4 w-8 items-center">
                <input
                  type="checkbox"
                  checked={showOverlay}
                  onChange={(e) => setShowOverlay(e.target.checked)}
                  className="peer sr-only"
                />
                <div
                  className="h-[16px] w-8 rounded-full transition-colors"
                  style={{ background: showOverlay ? "var(--color-accent)" : "rgba(255,255,255,0.1)" }}
                />
                <div
                  className="absolute left-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform"
                  style={{ transform: showOverlay ? "translateX(16px)" : "translateX(0)" }}
                />
              </div>
              <Layers size={11} style={{ color: "rgba(255,255,255,0.35)" }} />
            </label>
          )}

          {/* Opacity slider */}
          {currentOverlay && showOverlay && (
            <div className="flex items-center gap-2">
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Opacity</span>
              <input
                type="range" min="0" max="1" step="0.05"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                className="h-[3px] w-20 cursor-pointer appearance-none rounded-full"
                style={{ background: "rgba(255,255,255,0.15)", accentColor: "var(--color-accent)" }}
              />
              <span className="w-7 text-right font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                {Math.round(overlayOpacity * 100)}%
              </span>
            </div>
          )}

          {/* Zoom controls */}
          <div
            className="flex items-center gap-1 rounded-lg px-2 py-1"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <button
              onClick={() => handleZoom("out")}
              className="rounded p-0.5 transition"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              <ZoomOut size={13} />
            </button>
            <span className="w-9 text-center font-mono text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.55)" }}>
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => handleZoom("in")}
              className="rounded p-0.5 transition"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Viewport ──────────────────────────────────────── */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-8">
        {/* Ambient glow */}
        {uploadedImageDataUrl && (
          <div
            className="absolute inset-0 opacity-30"
            style={{ background: "var(--gradient-glow)" }}
          />
        )}

        {/* Dot grid */}
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.03,
            backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <div
                className="h-16 w-16 rounded-full border-2 animate-spin"
                style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
              />
              <div
                className="absolute inset-2 h-12 w-12 rounded-full border animate-spin"
                style={{
                  borderColor: "var(--color-accent2)",
                  borderTopColor: "transparent",
                  animationDirection: "reverse",
                  animationDuration: "1.5s",
                }}
              />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
                Running inference…
              </p>
              <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                Generating radiology report
              </p>
            </div>
          </div>
        ) : uploadedImageDataUrl ? (
          <div
            className="relative transition-transform duration-300 ease-out"
            style={{ height: "88%", aspectRatio: "1/1", transform: `scale(${scale})` }}
          >
            {/* Image with vignette */}
            <div className="relative h-full w-full rounded-lg overflow-hidden" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)" }}>
              <img
                src={uploadedImageDataUrl}
                alt="Chest radiograph"
                className="h-full w-full object-contain"
              />

              {/* Heatmap overlay */}
              {currentOverlay && (
                <img
                  src={`data:image/png;base64,${currentOverlay}`}
                  alt="Attention heatmap"
                  className="absolute inset-0 h-full w-full object-contain transition-opacity duration-500"
                  style={{ opacity: showOverlay ? overlayOpacity : 0 }}
                />
              )}

              {/* Loading overlay */}
              {isHeatmapLoading && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)" }}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className="h-10 w-10 animate-spin rounded-full border-2"
                      style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
                    />
                    <div className="flex items-center gap-1.5" style={{ color: "var(--color-accent)" }}>
                      <Sparkles size={11} />
                      <span className="text-[11px] font-medium">Loading attention…</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Prompt hint */}
            {!currentOverlay && !isHeatmapLoading && reportData && (
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                <div
                  className="flex items-center gap-2 rounded-full px-4 py-2"
                  style={{
                    background: "rgba(0,0,0,0.5)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <ScanSearch size={12} style={{ color: "var(--color-accent)" }} />
                  <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                    Click a sentence in the report to visualize attention
                  </span>
                </div>
              </div>
            )}

            {/* Corner badges */}
            <div className="absolute bottom-3 right-3 flex gap-1.5">
              <span className="viewer-badge">PNG</span>
              <span className="viewer-badge">CXR</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <ScanSearch size={24} style={{ color: "rgba(255,255,255,0.15)" }} />
            </div>
            <div>
              <p className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
                Awaiting radiograph upload
              </p>
              <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.18)" }}>
                Use the Analyze Scan button above
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
