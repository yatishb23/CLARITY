"use client";

import { useRef, useState, useEffect } from "react";
import { Activity, Upload, Loader2, RotateCcw, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { useClarityStore } from "@/lib/store";
import { ModeToggle } from "@/components/ModeToggle";
import type { AnalyzeResponse, ReportOnlyResponse } from "@/lib/api-types";

// ─── Shutdown ─────────────────────────────────────────────────────────────────

function ShutdownButton() {
  const [confirming, setConfirming] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (confirming) {
      timeoutRef.current = setTimeout(() => setConfirming(false), 4000);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [confirming]);

  const handleClick = async () => {
    if (!confirming) { setConfirming(true); return; }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setConfirming(false);
    setIsShuttingDown(true);
    try {
      await fetch("/api/shutdown", { method: "POST" });
      toast.success("Backend shut down");
    } catch {
      toast.success("Backend shut down (connection closed)");
    } finally {
      setIsShuttingDown(false);
    }
  };

  if (isShuttingDown) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-[12px]" style={{ color: "var(--color-text-dim)" }}>
        <Loader2 size={13} className="animate-spin" />
        <span className="hidden sm:inline">Shutting down…</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      onBlur={() => { setTimeout(() => setConfirming(false), 150); }}
      title={confirming ? "Click again to confirm" : "Shut down backend"}
      className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all duration-200"
      style={{
        borderColor: confirming ? "rgba(239,68,68,0.5)" : "var(--color-border)",
        background: confirming ? "rgba(239,68,68,0.08)" : "transparent",
        color: confirming ? "#ef4444" : "var(--color-text-dim)",
        boxShadow: confirming ? "0 0 12px rgba(239,68,68,0.1)" : "none",
      }}
    >
      <PowerOff size={13} />
      <span className="hidden sm:inline">{confirming ? "Confirm?" : "Shutdown"}</span>
    </button>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

export function Navbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { reportData, isUploading, setReport, setUploading, reset, cacheHeatmap, saveToScanCache, restoreFromScanCache } =
    useClarityStore();

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Attempt to restore from cache before hitting the backend
    if (restoreFromScanCache(file.name)) {
      toast.success(`Restored cached analysis for ${file.name}`);
      e.target.value = "";
      return;
    }

    e.target.value = "";
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error((err as { detail?: string }).detail ?? `HTTP ${res.status}`);
      }

      const raw: AnalyzeResponse = await res.json();

      // Map backend response → UI view model
      // Handle both new schema (sentences are strings, sentence_results has heatmaps)
      // and old schema (sentences are objects with embedded heatmaps)
      const mapped: ReportOnlyResponse = {
        model: raw.top_pathology || raw.model || "Unknown Model",
        report: raw.report,
        sentence_count: raw.sentences.length,
        sentences: raw.sentences.map((item: any, idx: number) => ({
          index: item?.index !== undefined ? item.index : idx,
          sentence: typeof item === "string" ? item : (item?.sentence || ""),
        })),
      };

      // Convert file to base64 Data URL for localStorage persistence
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const sessionId = (raw as any).session_id || (raw as any).sessionId || `fallback-session-${Date.now()}`;
        setReport(dataUrl, mapped, sessionId);

        // Seed heatmap cache
        if (raw.sentence_results) {
          raw.sentence_results.forEach((sr: any) => cacheHeatmap(sr.index, sr.overlay_b64));
        } else {
          // Fallback for older backend format
          raw.sentences.forEach((s: any, idx: number) => {
            if (s && s.overlay_b64) cacheHeatmap(s.index !== undefined ? s.index : idx, s.overlay_b64);
          });
        }
        setUploading(false);
        
        // Save this entire session state under the filename
        saveToScanCache(file.name);
      };
      reader.readAsDataURL(file);

    } catch (err: unknown) {
      toast.error("Analysis failed", {
        description: err instanceof Error ? err.message : String(err),
      });
      setUploading(false);
    }
  };

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between px-5 py-2.5">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              background: "var(--color-surface-dim)",
              border: "1px solid var(--color-border)",
            }}
          >
            <Activity size={16} style={{ color: "var(--color-text-dim)" }} />
          </div>
          <div>
            <h1
              className="text-[14px] font-bold tracking-widest uppercase"
              style={{ color: "var(--color-text)", letterSpacing: "0.12em" }}
            >
              CLARITY
            </h1>
            <p className="text-[10px]" style={{ color: "var(--color-text-ghost)" }}>
              Explainable Radiology AI
            </p>
          </div>
        </div>

        {/* Model badge */}
        {reportData && (
          <div
            className="hidden md:flex items-center gap-2 rounded-md px-3 py-1"
            style={{
              background: "var(--color-surface-dim)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="pulse-dot" />
            <span
              className="font-mono text-[10px] font-medium uppercase tracking-wider"
              style={{ color: "var(--color-text-dim)" }}
            >
              {reportData.model}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={handleFileChange}
          />

          {reportData && (
            <button
              onClick={reset}
              title="Reset"
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all duration-200 hover:opacity-70"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-text-dim)",
              }}
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          <button
            id="analyze-scan-button"
            onClick={handleUploadClick}
            disabled={isUploading}
            className="flex items-center gap-2 rounded-lg border px-4 py-1.5 text-[12px] font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-surface-dim)",
              color: "var(--color-text)",
            }}
          >
            {isUploading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Upload size={13} />
            )}
            <span>{isUploading ? "Analyzing…" : "Analyze Scan"}</span>
          </button>

          <div className="h-5 w-px mx-0.5" style={{ background: "var(--color-border)" }} />
          <ModeToggle />
          <ShutdownButton />
        </div>
      </div>
    </header>
  );
}
