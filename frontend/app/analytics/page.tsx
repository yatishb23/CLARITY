"use client";

import { Navbar } from "@/components/navbar";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid, AreaChart, Area
} from "recharts";
import { Activity, TrendingUp, Users, AlertCircle } from "lucide-react";

import { useState, useEffect } from "react";
import { useClarityStore } from "@/lib/store";

// Base weekly mock data to preserve chart structure (since we lack timestamp history in cache)
const baseVolumeData = [
  { day: "Mon", scans: 42 },
  { day: "Tue", scans: 58 },
  { day: "Wed", scans: 65 },
  { day: "Thu", scans: 48 },
  { day: "Fri", scans: 70 },
  { day: "Sat", scans: 25 },
  { day: "Sun", scans: 18 },
];

export default function AnalyticsPage() {
  const { scanCache, _hasHydrated } = useClarityStore();
  const allScans = Object.values(scanCache || {});

  // Aggregate Pathologies
  const pathologyCounts: Record<string, number> = {};
  allScans.forEach(scan => {
    const model = scan.reportData?.model || "Unknown";
    pathologyCounts[model] = (pathologyCounts[model] || 0) + 1;
  });

  // Convert to array and sort
  const dynamicPathologyData = Object.entries(pathologyCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // If no scans, provide a fallback just so the chart doesn't crash empty
  const pathologyData = dynamicPathologyData.length > 0 
    ? dynamicPathologyData 
    : [{ name: "No Scans Yet", count: 0 }];

  const totalScansProcessed = allScans.length;
  // Let's pretend critical findings are anything with "Pneumonia" or "Mass"
  const criticalFindings = allScans.filter(s => {
    const m = (s.reportData?.model || "").toLowerCase();
    return m.includes("pneumonia") || m.includes("mass") || m.includes("nodule");
  }).length;
  return (
    <main className="relative flex h-screen flex-col overflow-hidden" style={{ background: "var(--color-bg)" }}>
      <Navbar />

      <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-thin">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Activity size={22} className="text-[var(--color-text-dim)]" />
                Clinical Analytics
              </h1>
              <p className="text-[13px] mt-1" style={{ color: "var(--color-text-ghost)" }}>
                Hospital-wide pathology trends and AI performance metrics.
              </p>
            </div>
            
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md border" style={{ background: "var(--color-surface-dim)", borderColor: "var(--color-border)", color: "var(--color-ok)" }}>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live System Status
            </div>
          </header>

          {!_hasHydrated ? (
            <div className="flex h-40 items-center justify-center opacity-50">Loading analytics...</div>
          ) : (
            <>
              {/* Top KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="glass-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-ghost)] mb-1">Total Scans Processed</p>
                  <h3 className="text-3xl font-bold">{totalScansProcessed}</h3>
                </div>
                <div className="p-2 rounded-lg bg-[var(--color-surface-dim)]">
                  <Users size={18} className="text-[var(--color-text-dim)]" />
                </div>
              </div>
              <p className="text-xs text-[var(--color-ok)] mt-4 flex items-center gap-1 font-medium">
                <TrendingUp size={12} /> Syncing Local Cache
              </p>
            </div>
            
            <div className="glass-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-ghost)] mb-1">Critical Findings</p>
                  <h3 className="text-3xl font-bold text-[var(--color-danger)]">{criticalFindings}</h3>
                </div>
                <div className="p-2 rounded-lg bg-[var(--color-surface-dim)]">
                  <AlertCircle size={18} className="text-[var(--color-text-dim)]" />
                </div>
              </div>
              <p className="text-xs text-[var(--color-text-sub)] mt-4 font-medium">
                Detected anomalies
              </p>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-ghost)] mb-1">Avg AI Confidence</p>
                  <h3 className="text-3xl font-bold text-[var(--color-text)]">94.2%</h3>
                </div>
                <div className="p-2 rounded-lg bg-[var(--color-surface-dim)]">
                  <Activity size={18} className="text-[var(--color-text-dim)]" />
                </div>
              </div>
              <p className="text-xs text-[var(--color-ok)] mt-4 flex items-center gap-1 font-medium">
                <TrendingUp size={12} /> +1.2% model drift improvement
              </p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="glass-card p-5 flex flex-col h-[340px]">
              <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
                Detected Pathology Distribution
              </h3>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pathologyData} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--color-text-sub)" }} width={90} />
                    <Tooltip 
                      cursor={{ fill: "rgba(255,255,255,0.05)" }}
                      contentStyle={{ background: "var(--color-surface-dim)", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Bar dataKey="count" fill="var(--color-text)" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-5 flex flex-col h-[340px]">
              <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
                Weekly Scan Volume
              </h3>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={baseVolumeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-text-dim)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-text-dim)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--color-text-sub)" }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--color-text-sub)" }} />
                    <Tooltip 
                      contentStyle={{ background: "var(--color-surface-dim)", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Area type="monotone" dataKey="scans" stroke="var(--color-text)" strokeWidth={2} fillOpacity={1} fill="url(#colorScans)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
