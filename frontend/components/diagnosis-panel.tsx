"use client";

import { AlertCircle, Zap, Activity, Info } from "lucide-react";
import { useClarityStore } from "@/lib/store";

export function DiagnosisPanel() {
  const {
    analysis,
    isAnalyzing,
    selectedSentenceIndex,
    setSelectedSentenceIndex,
  } = useClarityStore();

  const getConfidenceColor = (probability: number) => {
    if (probability >= 0.8) return "bg-accent";
    if (probability >= 0.6) return "bg-warning";
    return "bg-destructive";
  };

  const getConfidenceLabel = (probability: number) => {
    if (probability >= 0.8) return "High Confidence";
    if (probability >= 0.6) return "Medium Confidence";
    return "Low Confidence";
  };

  const getRiskColor = (probability: number) => {
    if (probability >= 0.8) return "border-destructive/20 bg-destructive/5";
    if (probability >= 0.6) return "border-warning/20 bg-warning/5";
    return "border-accent/20 bg-accent/5";
  };

  const getRiskBadge = (probability: number) => {
    if (probability >= 0.8) return "text-destructive";
    if (probability >= 0.6) return "text-warning";
    return "text-accent";
  };

  if (isAnalyzing) {
    return (
      <div className="flex flex-col h-full bg-card border-r border-border items-center justify-center p-6 text-center">
        <Zap size={48} className="text-primary animate-pulse mb-4" />
        <h3 className="text-lg font-bold">Processing Diagnosis</h3>
        <p className="text-sm text-muted-foreground mt-2">
          MedGemma is analyzing the pathology patterns...
        </p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col h-full bg-card border-r border-border items-center justify-center p-6 text-center">
        <Activity size={48} className="text-muted-foreground opacity-20 mb-4" />
        <h3 className="text-lg font-bold text-muted-foreground">
          No Diagnosis Data
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          Upload a chest X-ray to see AI interpretation
        </p>
      </div>
    );
  }

  const topProb =
    analysis.all_pathologies?.find((p) => p.name === analysis.top_pathology)
      ?.probability || 0;

  return (
    <div className="flex flex-col h-full bg-card border-r border-border overflow-auto scrollbar-thin">
      {/* Header */}
      <div className="border-b border-border px-6 py-5 sticky top-0 bg-card/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2 mb-1">
          <Activity size={18} className="text-accent" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Clinical Report
          </h2>
        </div>
        <h3 className="text-xl font-header font-black text-foreground">
          AI Interpretation
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-8">
        {topProb < 0.6 && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 text-orange-600 dark:text-orange-400">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">
                Low Confidence Warning
              </p>
              <p className="text-xs opacity-80 mt-1">
                AI probability is below clinical threshold. Verification
                required.
              </p>
            </div>
          </div>
        )}

        {/* Main Diagnosis Card */}
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">
            Primary Finding
          </p>
          <div
            className={`relative overflow-hidden border rounded-2xl p-6 transition-all shadow-sm cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99] ${getRiskColor(topProb)}`}
          >
            <div className="relative z-10 flex justify-between items-start mb-6">
              <h3 className="text-3xl font-header font-black text-foreground leading-tight max-w-[70%]">
                {analysis.top_pathology}
              </h3>
              <div
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${getRiskBadge(topProb)}`}
              >
                {topProb >= 0.8 ? "Critical" : "Review"}
              </div>
            </div>

            <div className="relative z-10 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-muted-foreground">
                    Confidence Score
                  </span>
                  <span className="text-foreground">
                    {(topProb * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ease-out ${getConfidenceColor(topProb)}`}
                    style={{ width: `${topProb * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actionable Report Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              Findings Analysis
            </h4>
            <span className="text-[10px] font-medium text-accent bg-accent/5 px-2 py-0.5 rounded-full border border-accent/10">
              Interactive
            </span>
          </div>
          <div className="bg-secondary/30 p-5 rounded-2xl border border-border/50 shadow-inner">
            <div className="space-y-3">
              {analysis.sentences?.map((item, idx) => (
                <p
                  key={idx}
                  className={`group text-sm leading-relaxed cursor-pointer transition-all p-2.5 rounded-xl border ${
                    selectedSentenceIndex === idx
                      ? "bg-white dark:bg-primary/20 text-accent shadow-sm border-accent/20"
                      : "text-foreground/80 border-transparent hover:bg-white dark:hover:bg-primary/10 hover:text-accent hover:border-accent/10"
                  }`}
                  onClick={() => {
                    if (selectedSentenceIndex === idx) {
                      setSelectedSentenceIndex(null);
                    } else {
                      setSelectedSentenceIndex(idx);
                    }
                  }}
                >
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold mr-2 transition-colors ${
                      selectedSentenceIndex === idx
                        ? "bg-accent text-white"
                        : "bg-muted text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  {item.sentence_text}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Other Pathologies */}
        <div className="space-y-4 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
            Other Probabilities
          </h4>
          <div className="grid gap-2">
            {analysis.all_pathologies && analysis.all_pathologies.length > 0 ? (
              analysis.all_pathologies
                .filter((p) => p.name !== analysis.top_pathology)
                .sort((a, b) => b.probability - a.probability)
                .slice(0, 5)
                .map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border/50 hover:border-accent/20 transition-colors"
                  >
                    <span className="text-sm font-bold text-foreground/80">
                      {p.name}
                    </span>
                    <span className="text-sm font-black text-foreground">
                      {(p.probability * 100).toFixed(1)}%
                    </span>
                  </div>
                ))
            ) : (
              <p className="text-xs text-muted-foreground px-1 italic">
                No pathology distribution available
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
