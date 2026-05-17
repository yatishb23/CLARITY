"use client";

import { Fragment } from "react";
import {
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
  MousePointerClick,
  ArrowRight,
} from "lucide-react";
import { useClarityStore } from "@/lib/store";
import { useHeatmapLoader } from "@/hooks/use-heatmap";
import type { ReportSentence } from "@/lib/api-types";

// ─── Sentence span ────────────────────────────────────────────────────────────

interface SentenceSpanProps {
  sentence: ReportSentence;
  isSelected: boolean;
  isLoading: boolean;
  onClick: () => void;
}

function SentenceSpan({ sentence, isSelected, isLoading, onClick }: SentenceSpanProps) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      className={`sentence-span ${isSelected ? "active" : ""} ${isLoading ? "loading" : ""}`}
    >
      {sentence.sentence}
      {isLoading && (
        <Loader2
          size={11}
          className="ml-1 inline-block animate-spin"
          style={{ color: "var(--color-accent)" }}
        />
      )}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ReportSkeleton() {
  return (
    <div className="space-y-3 px-6 py-8">
      {[95, 80, 92, 65, 88, 50, 75].map((w, i) => (
        <div
          key={i}
          className="shimmer h-4 rounded-lg"
          style={{
            width: `${w}%`,
            background: "var(--color-border-dim)",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-10 py-16 text-center">
      {/* Icon */}
      <div
        className="relative flex h-20 w-20 items-center justify-center rounded-2xl"
        style={{
          background: "var(--color-accent-soft)",
          border: "1px solid var(--color-accent-glow)",
        }}
      >
        <FileText size={28} style={{ color: "var(--color-accent)", opacity: 0.5 }} />
        <div
          className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full"
          style={{ background: "var(--gradient-brand)" }}
        >
          <Sparkles size={12} className="text-white" />
        </div>
      </div>

      {/* Copy */}
      <div>
        <p className="text-[15px] font-bold" style={{ color: "var(--color-text)" }}>
          No Report Generated
        </p>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--color-text-dim)" }}>
          Upload a chest radiograph to generate<br />an AI-grounded radiology report.
        </p>
      </div>

      {/* Instruction */}
      <div
        className="flex items-center gap-2.5 rounded-full px-5 py-2.5"
        style={{
          background: "var(--color-accent-soft)",
          border: "1px solid var(--color-accent-glow)",
        }}
      >
        <MousePointerClick size={14} style={{ color: "var(--color-accent)" }} />
        <span className="text-[12px] font-medium" style={{ color: "var(--color-accent)" }}>
          Click a sentence to reveal attention map
        </span>
      </div>
    </div>
  );
}

// ─── Selected sentence detail ─────────────────────────────────────────────────

interface SentenceDetailProps {
  sentence: ReportSentence;
  totalCount: number;
  hasHeatmap: boolean;
  isLoading: boolean;
}

function SentenceDetail({ sentence, totalCount, hasHeatmap, isLoading }: SentenceDetailProps) {
  return (
    <div className="mx-5 mb-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div
        className="glass-card rounded-xl p-5"
        style={{ borderColor: "var(--color-accent-glow)" }}
      >
        {/* Top row */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white"
              style={{ background: "var(--gradient-brand)" }}
            >
              {sentence.index + 1}
            </div>
            <span className="text-label" style={{ color: "var(--color-text-dim)" }}>
              Finding {sentence.index + 1} of {totalCount}
            </span>
          </div>

          {isLoading ? (
            <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "var(--color-accent)" }}>
              <Loader2 size={11} className="animate-spin" />
              Fetching attention…
            </span>
          ) : hasHeatmap ? (
            <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "var(--color-ok)" }}>
              <CheckCircle2 size={11} />
              Attention map ready
            </span>
          ) : null}
        </div>

        {/* Sentence text */}
        <p className="text-[14px] leading-relaxed font-medium" style={{ color: "var(--color-text)" }}>
          &ldquo;{sentence.sentence}&rdquo;
        </p>

        {/* Explanation */}
        {hasHeatmap && !isLoading && (
          <div
            className="mt-4 flex items-start gap-2.5 rounded-lg p-3"
            style={{
              background: "var(--color-accent-soft)",
              border: "1px solid var(--color-accent-glow)",
            }}
          >
            <ArrowRight size={12} className="mt-0.5 shrink-0" style={{ color: "var(--color-accent)" }} />
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-dim)" }}>
              The heatmap highlights regions the model attended to when generating this
              finding. Correlate with clinical context before diagnostic decisions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReportView() {
  const {
    reportData,
    isUploading,
    selectedSentenceIndex,
    loadingHeatmapIndex,
    heatmapCache,
  } = useClarityStore();

  const { loadHeatmap } = useHeatmapLoader();

  const selectedSentence =
    selectedSentenceIndex !== null
      ? reportData?.sentences[selectedSentenceIndex] ?? null
      : null;

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: "var(--color-bg)" }}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 px-6 py-4"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-label" style={{ color: "var(--color-text-ghost)" }}>AI-Generated</p>
            <h2 className="mt-0.5 text-[16px] font-bold" style={{ color: "var(--color-text)" }}>
              Radiology Report
            </h2>
          </div>

          {reportData && (
            <div className="flex items-center gap-4">
              <div
                className="flex items-center gap-2 rounded-full px-3 py-1.5"
                style={{
                  background: "var(--color-accent-soft)",
                  border: "1px solid var(--color-accent-glow)",
                }}
              >
                <div className="pulse-dot" style={{ width: 5, height: 5 }} />
                <span className="text-[11px] font-semibold" style={{ color: "var(--color-accent)" }}>
                  {reportData.sentence_count} finding{reportData.sentence_count !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────── */}
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {isUploading ? (
          <ReportSkeleton />
        ) : !reportData ? (
          <EmptyState />
        ) : (
          <>
            {/* Prose paragraph */}
            <div className="px-6 pb-5 pt-7">
              <div
                className="glass-card rounded-xl p-6"
                style={{ background: "var(--color-card)" }}
              >
                <p
                  className="text-[15px] leading-[2.1] tracking-[0.005em]"
                  style={{
                    color: "var(--color-text-sub)",
                    fontFamily: "'Instrument Serif', Georgia, serif",
                  }}
                >
                  {reportData.sentences.map((s, i) => (
                    <Fragment key={s.index}>
                      <SentenceSpan
                        sentence={s}
                        isSelected={selectedSentenceIndex === s.index}
                        isLoading={loadingHeatmapIndex === s.index}
                        onClick={() => loadHeatmap(s.index)}
                      />
                      {i < reportData.sentences.length - 1 ? " " : ""}
                    </Fragment>
                  ))}
                </p>
              </div>

              {/* Hint */}
              {selectedSentenceIndex === null && loadingHeatmapIndex === null && (
                <div className="mt-4 flex items-center gap-2" style={{ color: "var(--color-text-ghost)" }}>
                  <MousePointerClick size={13} style={{ color: "var(--color-accent)" }} />
                  <p className="text-[12px]">
                    Click any sentence above to load its attention heatmap on the radiograph.
                  </p>
                </div>
              )}
            </div>

            {/* Selected sentence card */}
            {selectedSentence && (
              <SentenceDetail
                sentence={selectedSentence}
                totalCount={reportData.sentence_count}
                hasHeatmap={heatmapCache[selectedSentence.index] !== undefined}
                isLoading={loadingHeatmapIndex === selectedSentence.index}
              />
            )}
          </>
        )}
      </div>

      {/* ── Disclaimer ──────────────────────────────────────── */}
      <div
        className="px-5 py-3"
        style={{
          background: "var(--color-surface)",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-start gap-2">
          <AlertCircle size={12} className="mt-0.5 shrink-0" style={{ color: "var(--color-text-ghost)", opacity: 0.6 }} />
          <p className="text-[10px] leading-relaxed" style={{ color: "var(--color-text-ghost)" }}>
            For research and decision support only. All findings must be verified
            by a qualified radiologist prior to clinical use.
          </p>
        </div>
      </div>
    </div>
  );
}
