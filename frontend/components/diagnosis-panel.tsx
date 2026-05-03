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
    if (p >= 0.8) return "bg-green-500";
    if (p >= 0.6) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getConfidenceText = (p: number) => {
    if (p >= 0.8) return "text-green-500";
    if (p >= 0.6) return "text-yellow-500";
    return "text-red-500";
  };

  const getRiskBorder = (p: number) => {
    if (p >= 0.8) return "border-green-500/30 bg-green-500/5";
    if (p >= 0.6) return "border-yellow-500/30 bg-yellow-500/5";
    return "border-red-500/30 bg-red-500/5";
  };

  const getBadgeStyle = (p: number) => {
    if (p >= 0.8)
      return "text-green-500 bg-green-500/10 border-green-500/25";
    if (p >= 0.6)
      return "text-yellow-500 bg-yellow-500/10 border-yellow-500/25";
    return "text-red-500 bg-red-500/10 border-red-500/25";
  };

  if (isAnalyzing) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center
                      bg-neutral-50 dark:bg-neutral-950 
                      border-r border-neutral-200 dark:border-neutral-800">
        <div className="w-12 h-12 mb-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
          Analyzing Pathology
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Processing the scan…
        </p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center
                      bg-neutral-50 dark:bg-neutral-950 
                      border-r border-neutral-200 dark:border-neutral-800">
        <div className="p-4 rounded-2xl border 
                        border-neutral-200 dark:border-neutral-800 
                        bg-neutral-100 dark:bg-neutral-900 mb-4">
          <Activity size={24} className="text-neutral-400 opacity-30" />
        </div>
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          No Diagnosis Data
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-[160px]">
          Upload a scan to begin AI interpretation
        </p>
      </div>
    );
  }

  let topProb = (analysis.confidence || 0);
  topProb = (topProb - 2) / 100;

  const topPathology = analysis.impression || "Unknown";

  return (
    <div className="flex flex-col h-full overflow-auto
                    bg-neutral-50 dark:bg-neutral-950 
                    border-r border-neutral-200 dark:border-neutral-800">

      {/* Header */}
      <div className="sticky top-0 z-10 px-5 py-4
                      bg-neutral-100 dark:bg-neutral-900 
                      border-b border-neutral-200 dark:border-neutral-800">
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-0.5">
          AI Interpretation
        </p>
        <h2 className="text-sm font-semibold flex items-center gap-2
                       text-neutral-800 dark:text-neutral-200">
          <Activity size={14} className="text-teal-500" />
          Clinical Report
        </h2>
      </div>

      <div className="flex-1 p-5 space-y-6">

        {/* Warning */}
        {topProb < 0.6 && (
          <div className="flex items-start gap-3 p-3.5 rounded-lg 
                          bg-yellow-500/10 border border-yellow-500/30">
            <AlertCircle size={14} className="text-yellow-500 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-yellow-500 uppercase">
                Low Confidence
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Verification required.
              </p>
            </div>
          </div>
        )}

        {/* Primary */}
        <div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-2.5 uppercase">
            Primary Finding
          </p>

          <div className={`border rounded-xl p-5 ${getRiskBorder(topProb)}`}>
            <div className="flex justify-between mb-5">
              <h3 className="text-2xl font-bold 
                             text-neutral-800 dark:text-neutral-200">
                {topPathology}
              </h3>

              <span className={`text-[10px] px-2.5 py-1 rounded-full border ${getBadgeStyle(topProb)}`}>
                {topProb >= 0.8 ? "High" : topProb >= 0.6 ? "Moderate" : "Low"}
              </span>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1.5">
                <span className="text-neutral-500">Confidence</span>
                <span className={`${getConfidenceText(topProb)}`}>
                  {(topProb * 100).toFixed(1)}%
                </span>
              </div>

              <div className="w-full h-1 bg-neutral-200 dark:bg-neutral-800 rounded">
                <div
                  className={`h-full ${getConfidenceFill(topProb)}`}
                  style={{ width: `${topProb * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Reasoning */}
        <div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-2.5 uppercase">
            Clinical Reasoning
          </p>

          <div className="border rounded-xl p-4 
                          border-neutral-200 dark:border-neutral-800 
                          bg-neutral-100 dark:bg-neutral-900">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              {analysis.reasoning || "No reasoning available"}
            </p>
          </div>
        </div>

        {/* Findings */}
        <div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-2.5 uppercase">
            Findings Analysis
          </p>

          <div className="space-y-1.5">
            {analysis.sentences?.map((item, idx) => (
              <button
                key={idx}
                onClick={() =>
                  setSelectedSentenceIndex(
                    selectedSentenceIndex === idx ? null : idx
                  )
                }
                className={`w-full text-left p-3 rounded-lg border text-sm transition ${
                  selectedSentenceIndex === idx
                    ? "border-teal-500/40 bg-teal-500/5 text-neutral-900 dark:text-neutral-100"
                    : "border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400"
                }`}
              >
                {item.sentence_text}
              </button>
            ))}
          </div>
        </div>

        {/* Differential */}
        <div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-2.5 uppercase">
            Differential Probabilities
          </p>

          <div className="space-y-1.5">
            {(analysis.all_pathologies ?? [])
              .sort((a, b) => b.probability - a.probability)
              .slice(0, 5)
              .map((p) => (
                <div
                  key={p.name}
                  className="flex justify-between p-3 rounded-lg border
                             border-neutral-200 dark:border-neutral-800
                             bg-neutral-100 dark:bg-neutral-900"
                >
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    {p.name}
                  </span>

                  <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    {(p.probability * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}