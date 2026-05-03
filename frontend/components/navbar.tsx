"use client";

import {
  Settings,
  User,
  Upload,
  Moon,
  Sun,
  Loader2,
  Activity,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useClarityStore } from "@/lib/store";
import axios from "axios";
import { useTheme } from "next-themes";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setAnalysis, setAnalyzing, isAnalyzing } = useClarityStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("/api/analyze", formData);
      setAnalysis(response.data);
    } catch (error) {
      console.error("Failed to analyze image:", error);
      alert("Failed to analyze image. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="sticky top-0 z-50 border-b border-ui-border bg-surface-secondary/80 backdrop-blur-md font-body clay-shadow-sm">
      <div className="flex items-center justify-between px-6 py-3.5">
        {/* Wordmark */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-clinical-teal/20 to-clinical-teal/10 border border-clinical-teal/25 clay-shadow-sm">
            <Activity size={18} className="text-clinical-teal" />
          </div>
          <div>
            <h1 className="text-[16px] font-bold tracking-[0.1em] text-text-primary font-body leading-none uppercase">
              Clarity
            </h1>
            <p className="text-label-xs mt-0.5 text-text-muted">
              Clinical Decision Support
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />

          {/* Primary CTA */}
          <button
            onClick={handleUploadClick}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-br from-clinical-teal to-clinical-teal-dark hover:from-clinical-teal-dark hover:to-clinical-teal-dark text-white text-[13px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed clay-shadow-sm hover:clay-shadow"
          >
            {isAnalyzing ? (
              <Loader2 className="animate-spin flex-shrink-0" size={14} />
            ) : (
              <Upload size={14} className="flex-shrink-0" />
            )}
            {isAnalyzing ? "Analyzing…" : "Analyze Scan"}
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-ui-border mx-1" />

          {/* Icon actions */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2.5 rounded-2xl text-text-muted hover:text-text-primary hover:bg-surface-hover border border-transparent hover:border-ui-border transition-all clay-shadow-sm"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}

          <button
            className="p-2.5 rounded-2xl text-text-muted hover:text-text-primary hover:bg-surface-hover border border-transparent hover:border-ui-border transition-all clay-shadow-sm"
            title="Settings"
          >
            <Settings size={16} />
          </button>

          <button
            className="p-2.5 rounded-2xl text-text-muted hover:text-text-primary hover:bg-surface-hover border border-transparent hover:border-ui-border transition-all clay-shadow-sm"
            title="Account"
          >
            <User size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
