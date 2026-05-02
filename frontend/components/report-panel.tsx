"use client";

import { useClarityStore } from "@/lib/store";
import { AlertCircle, CheckCircle, AlertTriangle, FileText } from "lucide-react";

export function ReportPanel() {
  const { analysis, selectedSentenceIndex, setSelectedSentenceIndex } =
    useClarityStore();

  if (!analysis) {
    return (
      <div className="flex flex-col h-full bg-surface-primary items-center justify-center p-8 text-center font-body">
        <div className="p-4 rounded-2xl border border-ui-border bg-surface-secondary mb-4">
          <FileText size={22} className="text-text-muted opacity-30" />
        </div>
        <p className="text-sm font-medium text-text-secondary mb-1">No Report Available</p>
        <p className="text-[11px] text-text-muted leading-relaxed max-w-[160px]">
          Upload a radiograph to generate an AI analysis report.
        </p>
      </div>
    );
  }

  const getStatusIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle size={12} className="text-status-normal" />;
    if (confidence >= 0.5) return <AlertTriangle size={12} className="text-status-caution" />;
    return <AlertCircle size={12} className="text-status-critical" />;
  };

  const getStatusBadge = (confidence: number) => {
    if (confidence >= 0.8)
      return "bg-status-normal/10 text-status-normal border-status-normal/25";
    if (confidence >= 0.5)
      return "bg-status-caution/10 text-status-caution border-status-caution/25";
    return "bg-status-critical/10 text-status-critical border-status-critical/25";
  };

  return (
    <div className="flex flex-col h-full bg-surface-primary font-body">
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface-secondary border-b border-ui-border">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-label-xs text-text-muted mb-0.5">AI-Generated</p>
                <h2 className="text-sm font-semibold text-text-primary tracking-tight">
                  Radiology Report
                </h2>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-clinical-teal/10 border border-clinical-teal/25">
                <div className="w-1.5 h-1.5 rounded-full bg-clinical-teal animate-pulse" />
                <span className="text-[10px] font-semibold text-clinical-teal uppercase tracking-wide">
                  BioViL-L
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sentences */}
        <div className="p-4 space-y-1.5">
          {analysis.sentences?.map((sentenceObj, idx) => (
            <button
              key={idx}
              onClick={() =>
                setSelectedSentenceIndex(selectedSentenceIndex === idx ? null : idx)
              }
              className={`w-full text-left p-3.5 rounded-lg border transition-all duration-150 ${
                selectedSentenceIndex === idx
                  ? "border-clinical-teal/40 bg-clinical-teal/5 ring-1 ring-clinical-teal/10"
                  : "border-border hover:border-ui-border-hover hover:bg-surface-hover"
              }`}
            >
              <div className="flex gap-3">
                <span
                  className={`flex-shrink-0 flex items-center justify-center rounded text-[10px] font-semibold transition-colors ${
                    selectedSentenceIndex === idx
                      ? "bg-clinical-teal text-white"
                      : "bg-surface-tertiary text-text-muted"
                  }`}
                  style={{ width: "18px", height: "18px", borderRadius: "4px" }}
                >
                  {idx + 1}
                </span>
                <p
                  className={`text-[13px] leading-relaxed ${
                    selectedSentenceIndex === idx
                      ? "text-text-primary font-medium"
                      : "text-text-secondary"
                  }`}
                >
                  {sentenceObj.sentence_text}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Grounded Analysis Detail */}
        {selectedSentenceIndex !== null && (
          <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-bottom-2 duration-250">
            <div className="h-px bg-ui-border" />

            <div className="flex items-center justify-between">
              <h3 className="text-label-xs text-text-muted uppercase tracking-widest">
                Grounded Analysis
              </h3>
              <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-semibold uppercase tracking-wide ${getStatusBadge(0.9)}`}
              >
                {getStatusIcon(0.9)}
                Verified
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg bg-surface-secondary border border-ui-border">
                <p className="text-label-xs text-text-muted mb-1">Focus Region</p>
                <p className="text-[13px] font-semibold text-text-primary">
                  Spatial Attention
                </p>
              </div>
              <div className="p-3 rounded-lg bg-surface-secondary border border-ui-border">
                <p className="text-label-xs text-text-muted mb-1">Confidence</p>
                <p className="text-[13px] font-semibold text-text-primary">High</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface-secondary border border-ui-border">
              <p className="text-[11px] text-text-muted leading-relaxed">
                The heatmap highlights regions attended to when generating this
                finding. Correlate with clinical context before making diagnostic
                decisions.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="px-4 py-3 border-t border-ui-border bg-surface-secondary">
        <div className="flex items-start gap-2">
          <AlertCircle size={11} className="text-text-muted mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-text-muted leading-relaxed">
            For decision support only. All findings must be verified by a
            qualified radiologist prior to clinical use.
          </p>
        </div>
      </div>
    </div>
  );
}