"use client";

import { useRef, useState, useEffect } from "react";
import { Activity, Upload, Loader2, RotateCcw, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { useClarityStore } from "@/lib/store";
import { ModeToggle } from "@/components/ModeToggle";
import type { AnalyzeResponse, AnalyzeResponseWithSession, ReportOnlyResponse } from "@/lib/api-types";

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
  const { reportData, isUploading, setReport, setUploading, reset, cacheHeatmap } =
    useClarityStore();

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      const raw: AnalyzeResponseWithSession = await res.json();
      const mapped: ReportOnlyResponse = {
        model: raw.model,
        report: raw.report,
        sentence_count: raw.sentence_count,
        sentences: raw.sentences.map((s) => ({ index: s.index, sentence: s.sentence })),
      };
      setReport(file, mapped, raw.session_id);
      raw.sentences.forEach((s) => cacheHeatmap(s.index, s.overlay_b64));
    } catch (err: unknown) {
      toast.error("Analysis failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-xl"
      style={{
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)",
      }}
    >
      <div className="flex items-center justify-between px-5 py-2.5">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            className="relative flex h-9 w-9 items-center justify-center rounded-xl"
            style={{
              background: "var(--gradient-brand)",
              boxShadow: "0 2px 8px var(--color-accent-glow), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            <Activity size={18} className="text-white" />
          </div>
          <div>
            <h1
              className="text-[15px] font-extrabold tracking-wider uppercase"
              style={{ color: "var(--color-text)" }}
            >
              CLARITY
            </h1>
            <p className="text-[10px] font-medium" style={{ color: "var(--color-text-ghost)" }}>
              Explainable Radiology AI
            </p>
          </div>
        </div>

        {/* Model badge */}
        {reportData && (
          <div
            className="hidden md:flex items-center gap-2 rounded-full px-3.5 py-1.5"
            style={{
              background: "var(--color-accent-glow)",
              border: "1px solid var(--color-accent-glow)",
            }}
          >
            <div className="pulse-dot" />
            <span
              className="font-mono text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-accent)" }}
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
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all duration-200"
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
            onClick={handleUploadClick}
            disabled={isUploading}
            className="flex items-center gap-2 rounded-xl px-5 py-2 text-[13px] font-bold text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: "var(--gradient-brand)",
              boxShadow: "0 2px 12px var(--color-accent-glow), 0 1px 2px rgba(0,0,0,0.1)",
            }}
          >
            {isUploading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Upload size={15} />
            )}
            <span>{isUploading ? "Analyzing…" : "Analyze Scan"}</span>
          </button>

          <div className="h-5 w-px mx-1" style={{ background: "var(--color-border)" }} />
          <ModeToggle />
          <ShutdownButton />
        </div>
      </div>
    </header>
  );
}
