"use client";

import { AlertCircle, Activity } from "lucide-react";
import { useClarityStore } from "@/lib/store";

export function DiagnosisPanel() {
  const {
    analysis,
    isAnalyzing,
    selectedSentenceIndex,
    setSelectedSentenceIndex,
  } = useClarityStore();

  const getConfidenceFill = (p: number) => {
    if (p >= 0.8) return "bg-status-normal";
    if (p >= 0.6) return "bg-status-caution";
    return "bg-status-critical";
  };

  const getConfidenceText = (p: number) => {
    if (p >= 0.8) return "text-status-normal";
    if (p >= 0.6) return "text-status-caution";
    return "text-status-critical";
  };

  const getRiskBorder = (p: number) => {
    if (p >= 0.8) return "border-status-normal/30 bg-status-normal/5";
    if (p >= 0.6) return "border-status-caution/30 bg-status-caution/5";
    return "border-status-critical/30 bg-status-critical/5";
  };

  const getBadgeStyle = (p: number) => {
    if (p >= 0.8)
      return "text-status-normal bg-status-normal/10 border-status-normal/25";
    if (p >= 0.6)
      return "text-status-caution bg-status-caution/10 border-status-caution/25";
    return "text-status-critical bg-status-critical/10 border-status-critical/25";
  };

  if (isAnalyzing) {
    return (
      <div className="flex flex-col h-full bg-surface-primary border-r border-ui-border items-center justify-center p-8 text-center">
        <div className="relative w-12 h-12 mb-5">
          <div className="absolute inset-0 rounded-full border border-clinical-teal/20" />
          <div className="absolute inset-0 rounded-full border border-t-clinical-teal border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>
        <p className="text-sm font-semibold text-text-primary mb-1">
          Analyzing Pathology
        </p>
        <p className="text-xs text-text-muted">
          MedGemma is processing the scan…
        </p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col h-full bg-surface-primary border-r border-ui-border items-center justify-center p-8 text-center">
        <div className="p-4 rounded-2xl border border-ui-border bg-surface-secondary mb-4">
          <Activity size={24} className="text-text-muted opacity-30" />
        </div>
        <p className="text-sm font-medium text-text-secondary">
          No Diagnosis Data
        </p>
        <p className="text-xs text-text-muted mt-1 max-w-[160px] leading-relaxed">
          Upload a chest radiograph to begin AI interpretation
        </p>
      </div>
    );
  }

  // ✅ NEW STRUCTURE

  let topProb = analysis.confidence || 0;
  topProb= (topProb-2)/100
  const topPathology = analysis.impression || "Unknown";

  return (
    <div className="flex flex-col h-full bg-surface-primary border-r border-ui-border overflow-auto scrollbar-thin font-body">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-ui-border px-5 py-4 bg-surface-secondary backdrop-blur">
        <p className="text-label-xs text-text-muted mb-0.5">
          AI Interpretation
        </p>
        <h2 className="text-sm font-semibold text-text-primary tracking-tight flex items-center gap-2">
          <Activity size={14} className="text-clinical-teal" />
          Clinical Report
        </h2>
      </div>

      <div className="flex-1 p-5 space-y-6">
        {/* Low Confidence Warning */}
        {topProb < 0.6 && (
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-status-caution/8 border border-status-caution/25">
            <AlertCircle
              size={14}
              className="mt-0.5 flex-shrink-0 text-status-caution"
            />
            <div>
              <p className="text-[11px] font-semibold text-status-caution uppercase tracking-wide">
                Low Confidence
              </p>
              <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                Result below clinical threshold — radiologist verification
                required.
              </p>
            </div>
          </div>
        )}

        {/* Primary Finding */}
        <div>
          <p className="text-label-xs text-text-muted mb-2.5 uppercase tracking-widest">
            Primary Finding
          </p>
          <div className={`border rounded-xl p-5 ${getRiskBorder(topProb)}`}>
            <div className="flex items-start justify-between mb-5">
              <h3 className="text-2xl font-bold text-text-primary leading-tight max-w-[68%] font-header">
                {topPathology}
              </h3>
              <span
                className={`text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border ${getBadgeStyle(
                  topProb,
                )}`}
              >
                {topProb >= 0.8
                  ? "High Confidence"
                  : topProb >= 0.6
                    ? "Moderate"
                    : "Low"}
              </span>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-medium mb-1.5">
                <span className="text-text-muted">Confidence Score</span>
                <span
                  className={`font-semibold tabular-nums ${getConfidenceText(
                    topProb,
                  )}`}
                >
                  {(topProb * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-1 bg-ui-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getConfidenceFill(
                    topProb,
                  )}`}
                  style={{ width: `${topProb * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 🔥 Reasoning */}
        <div>
          <p className="text-label-xs text-text-muted mb-2.5 uppercase tracking-widest">
            Clinical Reasoning
          </p>
          <div className="border border-ui-border rounded-xl p-4 bg-surface-secondary">
            <p className="text-sm text-text-secondary leading-relaxed">
              {analysis.reasoning || "No reasoning available"}
            </p>
          </div>
        </div>

        {/* Findings */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-label-xs text-text-muted uppercase tracking-widest">
              Findings Analysis
            </p>
          </div>

          <div className="space-y-1.5">
            {analysis.sentences?.map((item, idx) => (
              <button
                key={idx}
                onClick={() =>
                  setSelectedSentenceIndex(
                    selectedSentenceIndex === idx ? null : idx,
                  )
                }
                className={`w-full text-left flex items-start gap-2.5 p-3 rounded-lg border text-sm transition-all ${
                  selectedSentenceIndex === idx
                    ? "border-clinical-teal/40 bg-clinical-teal/5 text-text-primary"
                    : "border-transparent hover:border-ui-border hover:bg-surface-hover text-text-secondary"
                }`}
              >
                <span className="w-4.5 h-4.5 text-[10px] font-semibold flex items-center justify-center bg-surface-tertiary rounded">
                  {idx + 1}
                </span>

                <span className="flex-1">{item.sentence_text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Differential Diagnosis */}
        <div>
          <p className="text-label-xs text-text-muted uppercase tracking-widest mb-2.5">
            Differential Probabilities
          </p>

          <div className="space-y-1.5">
            {(() => {
              const pathologies = analysis.all_pathologies ?? [];

              if (pathologies.length === 0) {
                return (
                  <p className="text-xs text-text-muted italic">
                    No distribution available
                  </p>
                );
              }

              return [...pathologies] // 🔥 clone to avoid mutating original state
                .sort((a, b) => b.probability - a.probability)
                .slice(0, 5)
                .map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between py-2.5 px-3.5 rounded-lg border border-ui-border bg-surface-secondary hover:border-ui-border-hover transition-colors"
                  >
                    <span className="text-[13px] text-text-secondary font-medium">
                      {p.name}
                    </span>

                    <div className="flex items-center gap-2.5">
                      <div className="w-16 h-0.5 bg-ui-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-text-muted/40 rounded-full transition-all duration-500"
                          style={{ width: `${p.probability * 100}%` }}
                        />
                      </div>

                      <span className="text-[12px] font-semibold text-text-primary tabular-nums w-9 text-right">
                        {(p.probability * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
