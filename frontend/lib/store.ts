import { create } from "zustand";
import { AnalyzeResponse, ChatMessage } from "./api-types";

interface ClarityState {
  // Main Analysis Data
  analysis: AnalyzeResponse | null;
  isAnalyzing: boolean;

  // Chat Data
  chatHistory: ChatMessage[];
  isChatting: boolean;

  // UI State
  selectedImage: string | null; // Base64 or URL
  currentOverlay: string | null; // Base64 Grad-CAM overlay
  currentAttentionMap: string | null; // Base64 raw attention map
  currentHeatmapData: number[][] | null; // Raw 2D array data
  selectedSentenceIndex: number | null; // Index of the currently clicked sentence

  // Actions
  setAnalysis: (analysis: AnalyzeResponse) => void;
  setAnalyzing: (status: boolean) => void;
  addChatMessage: (message: ChatMessage) => void;
  setChatting: (status: boolean) => void;
  resetChat: () => void;
  setSelectedSentenceIndex: (index: number | null) => void;
}

export const useClarityStore = create<ClarityState>((set) => ({
  analysis: null,
  isAnalyzing: false,
  chatHistory: [],
  isChatting: false,
  selectedImage: null,
  currentOverlay: null,
  currentAttentionMap: null,
  currentHeatmapData: null,
  selectedSentenceIndex: null,

  setAnalysis: (analysis) =>
    set({
      analysis,
      selectedImage:
        analysis.original_image_b64 ||
        analysis.sentences?.[0]?.overlay_image_b64 ||
        analysis.gradcam_results?.[0]?.overlay_b64 ||
        null,
      currentOverlay: null, // Don't show any overlay by default
      currentAttentionMap: null,
      currentHeatmapData: null,
      selectedSentenceIndex: null,
    }),
  setAnalyzing: (status) => set({ isAnalyzing: status }),
  addChatMessage: (msg) =>
    set((state) => ({ chatHistory: [...state.chatHistory, msg] })),
  setChatting: (status) => set({ isChatting: status }),
  resetChat: () => set({ chatHistory: [] }),
  setSelectedSentenceIndex: (index) =>
    set((state) => {
      // Toggle logic: if clicking the same sentence, turn it off.
      // Otherwise set to the new index.
      const newIndex = state.selectedSentenceIndex === index ? null : index;
      const overlay =
        newIndex !== null
          ? state.analysis?.sentences[newIndex]?.overlay_image_b64 || null
          : null;
      // In the older backend format, raw attention map image might not be available
      // or might be stored differently.
      // We will cast it up to `any` and try to read attention_map_b64 or just fall back to overlay.
      const attentionMap =
        newIndex !== null
          ? (state.analysis?.sentences[newIndex] as any)?.attention_map_b64 ||
            (state.analysis?.sentences[newIndex] as any)?.heatmap_b64 ||
            null
          : null;
      const heatmapData =
        newIndex !== null
          ? state.analysis?.sentences[newIndex]?.heatmap_data || null
          : null;

      console.log(
        "Setting sentence index:",
        newIndex,
        "Overlay exists:",
        !!overlay,
        "Attention map exists:",
        !!attentionMap,
        "Heatmap data exists:",
        !!heatmapData,
      );

      return {
        selectedSentenceIndex: newIndex,
        currentOverlay: overlay,
        currentAttentionMap: attentionMap, // If null, the triple-panel might partially break, we can handle it in the UI
        currentHeatmapData: heatmapData,
      };
    }),
}));
