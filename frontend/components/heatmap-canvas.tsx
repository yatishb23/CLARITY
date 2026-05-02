"use client";

import { useEffect, useRef } from "react";

interface HeatmapCanvasProps {
  data: number[][]; // 2D array of heatmap values (0 to 1)
}

function getJetColor(value: number): [number, number, number, number] {
  const fourValue = 4 * value;
  const r = Math.min(
    Math.max(Math.min(fourValue - 1.5, -fourValue + 4.5), 0),
    1,
  );
  const g = Math.min(
    Math.max(Math.min(fourValue - 0.5, -fourValue + 3.5), 0),
    1,
  );
  const b = Math.min(
    Math.max(Math.min(fourValue + 0.5, -fourValue + 2.5), 0),
    1,
  );
  return [r * 255, g * 255, b * 255, 255];
}

export function HeatmapCanvas({ data }: HeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0 || data[0].length === 0) return;

    const rows = data.length;
    const cols = data[0].length;

    // Set actual canvas size to the data grid size
    canvas.width = cols;
    canvas.height = rows;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imgData = ctx.createImageData(cols, rows);

    // Flatten 2d array and apply colormap
    let i = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        // Assume data is roughly 0 to 1. Handle normal bounds.
        // We'll just pass it linearly to the jet colormap.
        const val = data[y][x];
        const [r, g, b, a] = getJetColor(val);
        imgData.data[i++] = r;
        imgData.data[i++] = g;
        imgData.data[i++] = b;
        imgData.data[i++] = a;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full object-contain"
    />
  );
}
