"use client";

import { useCallback } from "react";
import { useClarityStore } from "@/lib/store";

/**
 * Manages sentence selection.
 *
 * Attention heatmaps are pre-populated from the /analyze response,
 * so this hook just handles toggle-off and instant cache-hit selection.
 */
export function useHeatmapLoader() {
  const { heatmapCache, selectedSentenceIndex, selectSentence } =
    useClarityStore();

  const loadHeatmap = useCallback(
    (index: number) => {
      // Toggle off when clicking the already-selected sentence
      if (selectedSentenceIndex === index) {
        selectSentence(null);
        return;
      }

      // Select the sentence (heatmap data already cached from /analyze)
      if (heatmapCache[index] !== undefined) {
        selectSentence(index);
      }
    },
    [heatmapCache, selectedSentenceIndex, selectSentence],
  );

  return { loadHeatmap };
}
