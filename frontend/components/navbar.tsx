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
    <div className="border-b border-border bg-card shadow-sm sticky top-0 z-50">
      <div className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-4">
          <div className="bg-accent/10 p-2 rounded-lg">
            <Activity size={24} className="text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-header font-black tracking-tight text-primary leading-none">
              CLARITY
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">
              Clinical Decision Support
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />
          <button
            onClick={handleUploadClick}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98] text-sm font-semibold disabled:opacity-50"
          >
            {isAnalyzing ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Upload size={18} />
            )}
            {isAnalyzing ? "Analyzing Scan..." : "Analyze New Scan"}
          </button>

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full p-2 hover:bg-secondary transition-colors"
            title="Toggle Dark Mode"
          >
            {mounted && theme === "dark" ? (
              <Sun size={20} className="text-foreground" />
            ) : (
              <Moon size={20} className="text-foreground" />
            )}
          </button>

          <button className="rounded-full p-2 hover:bg-secondary transition-colors">
            <Settings size={20} className="text-foreground" />
          </button>
          <button className="rounded-full p-2 hover:bg-secondary transition-colors">
            <User size={20} className="text-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
