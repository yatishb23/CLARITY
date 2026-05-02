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
    <div className="sticky top-0 z-50 border-b border-ui-border bg-surface-secondary font-body">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Wordmark */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-clinical-teal/10 border border-clinical-teal/20">
            <Activity size={16} className="text-clinical-teal" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold tracking-[0.12em] text-text-primary font-body leading-none uppercase">
              Clarity
            </h1>
            <p className="text-label-xs mt-0.5">
              Clinical Decision Support
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-800 dark:bg-clinical-teal hover:bg-clinical-teal-dark text-white text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isAnalyzing ? (
              <Loader2 className="animate-spin flex-shrink-0" size={14} />
            ) : (
              <Upload size={14} className="flex-shrink-0" />
            )}
            {isAnalyzing ? "Analyzing…" : "Analyze Scan"}
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-ui-border mx-1" />

          {/* Icon actions */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover border border-transparent hover:border-ui-border transition-all"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}

          <button
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover border border-transparent hover:border-ui-border transition-all"
            title="Settings"
          >
            <Settings size={16} />
          </button>

          <button
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover border border-transparent hover:border-ui-border transition-all"
            title="Account"
          >
            <User size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}