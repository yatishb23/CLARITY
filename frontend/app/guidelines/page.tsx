"use client";

import { Navbar } from "@/components/navbar";
import { BookOpen, Stethoscope, AlertCircle, CheckCircle2 } from "lucide-react";

const pathologies = [
  {
    name: "Atelectasis",
    description: "Collapse of lung tissue with loss of volume.",
    findings: ["Displacement of fissures", "Crowded bronchovascular markings", "Elevation of hemidiaphragm"],
    severity: "Variable"
  },
  {
    name: "Cardiomegaly",
    description: "Enlargement of the heart.",
    findings: ["Cardiothoracic ratio > 0.50 on PA view", "Enlarged cardiac silhouette"],
    severity: "Moderate"
  },
  {
    name: "Effusion",
    description: "Fluid accumulation in the pleural space.",
    findings: ["Blunting of costophrenic angles", "Meniscus sign", "Opacification of hemithorax"],
    severity: "Moderate to Severe"
  },
  {
    name: "Infiltration",
    description: "Substance denser than air within lung parenchyma.",
    findings: ["Poorly defined opacities", "Air bronchograms", "Loss of silhouette"],
    severity: "Moderate"
  },
  {
    name: "Mass / Nodule",
    description: "Space-occupying lesion in the lung.",
    findings: ["Well-defined rounded opacity (>3cm for mass, <3cm for nodule)", "Irregular margins (malignancy flag)"],
    severity: "Severe"
  },
  {
    name: "Pneumonia",
    description: "Infection that inflames air sacs in one or both lungs.",
    findings: ["Consolidation", "Air bronchograms", "Patchy opacities"],
    severity: "Severe"
  },
  {
    name: "Pneumothorax",
    description: "Presence of air in the pleural space causing lung collapse.",
    findings: ["Visible visceral pleural edge", "Lack of lung markings distal to pleural edge"],
    severity: "Critical"
  },
];

export default function GuidelinesPage() {
  return (
    <main className="relative flex h-screen flex-col overflow-hidden" style={{ background: "var(--color-bg)" }}>
      <Navbar />

      <div className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-thin">
        <div className="mx-auto max-w-4xl">
          <header className="mb-10 pb-6 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-[var(--color-surface-dim)] rounded-lg border border-[var(--color-border)]">
                <BookOpen size={24} style={{ color: "var(--color-text-dim)" }} />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Clinical Guidelines</h1>
            </div>
            <p className="text-[14px]" style={{ color: "var(--color-text-dim)" }}>
              Reference manual for thoracic disease classifications according to CheXpert standards. 
              These guidelines inform the CLARITY AI detection algorithms.
            </p>
          </header>

          <div className="space-y-8">
            {pathologies.map((path, idx) => (
              <div key={idx} className="glass-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Stethoscope size={18} className="text-[var(--color-text-dim)]" />
                    {path.name}
                  </h2>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${
                    path.severity === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                    path.severity === 'Severe' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                    'bg-[var(--color-surface-dim)] text-[var(--color-text-dim)] border-[var(--color-border)]'
                  }`}>
                    {path.severity}
                  </span>
                </div>
                
                <p className="text-sm mb-5 text-[var(--color-text-sub)]">
                  {path.description}
                </p>

                <div className="bg-[var(--color-surface-dim)] rounded-lg p-4 border border-[var(--color-border)]">
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[var(--color-text-ghost)] flex items-center gap-1.5">
                    <AlertCircle size={14} /> Key Radiographic Findings
                  </h4>
                  <ul className="space-y-2">
                    {path.findings.map((finding, fIdx) => (
                      <li key={fIdx} className="text-sm flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-[var(--color-text-dim)] mt-0.5 shrink-0" />
                        <span className="text-[var(--color-text)]">{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          
          <footer className="mt-12 pt-6 border-t border-[var(--color-border)] text-center text-xs text-[var(--color-text-ghost)]">
            For informational purposes only. Always correlate with clinical findings.
          </footer>
        </div>
      </div>
    </main>
  );
}
