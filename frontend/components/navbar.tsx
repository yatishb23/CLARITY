"use client";

import {
  Settings,
  User,
  Upload,
  Loader2,
  Activity,
} from "lucide-react";
import { useRef } from "react";
import { useClarityStore } from "@/lib/store";
import axios from "axios";

/* Simple dark toggle (no next-themes) */
import { ModeToggle } from "@/components/ModeToggle";

export function Navbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setAnalysis, setAnalyzing, isAnalyzing } = useClarityStore();

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
      alert("Failed to analyze image.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="sticky top-0 z-50 
                    bg-neutral-100 dark:bg-neutral-900 
                    border-b border-neutral-200 dark:border-neutral-800">

      <div className="flex items-center justify-between px-6 py-3">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg 
                          bg-teal-500/10 border border-teal-500/20">
            <Activity size={16} className="text-teal-500" />
          </div>

          <div>
            <h1 className="text-[15px] font-bold tracking-wider uppercase
                           text-neutral-800 dark:text-neutral-200">
              Clarity
            </h1>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
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

          {/* Upload */}
          <button
            onClick={handleUploadClick}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg 
                       bg-teal-500 hover:bg-teal-600 
                       text-white text-[13px] font-semibold
                       disabled:opacity-50"
          >
            {isAnalyzing ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Upload size={14} />
            )}
            {isAnalyzing ? "Analyzing…" : "Analyze Scan"}
          </button>

          {/* Divider */}
          <div className="w-px h-5 
                          bg-neutral-200 dark:bg-neutral-800 mx-1" />

          {/* Theme toggle */}
          <ModeToggle />

          {/* Settings */}
          <button
            className="p-2 rounded-lg border border-transparent
                       text-neutral-500 dark:text-neutral-400
                       hover:text-neutral-900 dark:hover:text-neutral-200
                       hover:bg-neutral-200 dark:hover:bg-neutral-800
                       hover:border-neutral-200 dark:hover:border-neutral-700 transition"
          >
            <Settings size={16} />
          </button>

          {/* User */}
          <button
            className="p-2 rounded-lg border border-transparent
                       text-neutral-500 dark:text-neutral-400
                       hover:text-neutral-900 dark:hover:text-neutral-200
                       hover:bg-neutral-200 dark:hover:bg-neutral-800
                       hover:border-neutral-200 dark:hover:border-neutral-700 transition"
          >
            <User size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}