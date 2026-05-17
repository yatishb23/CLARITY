"use client";

import { Fragment } from "react";
import {
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
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
        className="flex h-16 w-16 items-center justify-center rounded-xl"
        style={{
          background: "var(--color-surface-dim)",
          border: "1px solid var(--color-border)",
        }}
      >
        <FileText size={24} style={{ color: "var(--color-text-ghost)" }} />
      </div>

      {/* Copy */}
      <div>
        <p className="text-[14px] font-semibold" style={{ color: "var(--color-text)" }}>
          No Report Generated
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: "var(--color-text-dim)" }}>
          Upload a chest radiograph to generate<br />an AI-grounded radiology report.
        </p>
      </div>

      {/* Instruction */}
      <div
        className="flex items-center gap-2 rounded-lg px-4 py-2"
        style={{
          background: "var(--color-surface-dim)",
          border: "1px solid var(--color-border)",
        }}
      >
        <MousePointerClick size={12} style={{ color: "var(--color-text-dim)" }} />
        <span className="text-[11px]" style={{ color: "var(--color-text-dim)" }}>
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
    <div className="mx-5 mb-5 animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="glass-card p-4">
        {/* Top row */}
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold"
              style={{
                background: "var(--color-surface-dim)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-dim)",
              }}
            >
              {sentence.index + 1}
            </span>
            <span className="text-label">
              Finding {sentence.index + 1} of {totalCount}
            </span>
          </div>

          {isLoading ? (
            <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-text-dim)" }}>
              <Loader2 size={11} className="animate-spin" />
              Fetching attention…
            </span>
          ) : hasHeatmap ? (
            <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-ok)" }}>
              <CheckCircle2 size={11} />
              Map ready
            </span>
          ) : null}
        </div>

        {/* Sentence text */}
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text)" }}>
          &ldquo;{sentence.sentence}&rdquo;
        </p>

        {/* Explanation */}
        {hasHeatmap && !isLoading && (
          <div
            className="mt-3 flex items-start gap-2 rounded-md p-2.5"
            style={{
              background: "var(--color-surface-dim)",
              border: "1px solid var(--color-border)",
            }}
          >
            <ArrowRight size={11} className="mt-0.5 shrink-0" style={{ color: "var(--color-text-ghost)" }} />
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
        className="sticky top-0 z-10 px-5 py-3.5"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-label">AI-Generated</p>
            <h2 className="mt-0.5 text-[15px] font-semibold" style={{ color: "var(--color-text)" }}>
              Radiology Report
            </h2>
          </div>

          {reportData && (
            <div
              className="flex items-center gap-2 rounded-md px-2.5 py-1"
              style={{
                background: "var(--color-surface-dim)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="pulse-dot" style={{ width: 5, height: 5 }} />
              <span className="text-[11px]" style={{ color: "var(--color-text-dim)" }}>
                {reportData.sentence_count} finding{reportData.sentence_count !== 1 ? "s" : ""}
              </span>
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
            <div className="px-5 pb-5 pt-5">
              <div
                className="glass-card p-5"
                style={{ background: "var(--color-card)" }}
              >
                <p
                  className="text-[14px] leading-[2.0] tracking-[0.003em]"
                  style={{ color: "var(--color-text-sub)" }}
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
                <div className="mt-3 flex items-center gap-1.5" style={{ color: "var(--color-text-ghost)" }}>
                  <MousePointerClick size={12} />
                  <p className="text-[11px]">
                    Click any sentence to load its attention heatmap.
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
        className="px-5 py-2.5"
        style={{
          background: "var(--color-surface)",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-start gap-1.5">
          <AlertCircle size={11} className="mt-0.5 shrink-0" style={{ color: "var(--color-text-ghost)", opacity: 0.5 }} />
          <p className="text-[10px] leading-relaxed" style={{ color: "var(--color-text-ghost)" }}>
            Research &amp; decision support only. Verify all findings with a qualified radiologist.
          </p>
        </div>
      </div>
    </div>
  );
}
