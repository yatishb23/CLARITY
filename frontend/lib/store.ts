import { create } from "zustand";
import type { ReportOnlyResponse, ChatMessageDisplay } from "./api-types";

// ─── State shape ──────────────────────────────────────────────────────────────

interface ClarityState {
  // Data
  reportData: ReportOnlyResponse | null;
  uploadedFile: File | null;
  sessionId: string | null;

  // UI
  isUploading: boolean;
  selectedSentenceIndex: number | null;
  loadingHeatmapIndex: number | null;

  /** index → overlay_b64; avoids redundant network calls */
  heatmapCache: Record<number, string>;

  // Chat
  chatMessages: ChatMessageDisplay[];
  isChatLoading: boolean;

  // Actions
  setReport: (file: File, data: ReportOnlyResponse, sessionId?: string) => void;
  setUploading: (uploading: boolean) => void;
  selectSentence: (index: number | null) => void;
  setLoadingHeatmap: (index: number | null) => void;
  cacheHeatmap: (index: number, overlay_b64: string) => void;
  setSessionId: (id: string | null) => void;
  addChatMessage: (msg: ChatMessageDisplay) => void;
  setChatLoading: (loading: boolean) => void;
  reset: () => void;
}

// ─── Initial state (extracted so reset() is DRY) ─────────────────────────────

const INITIAL: Pick<
  ClarityState,
  | "reportData"
  | "uploadedFile"
  | "sessionId"
  | "isUploading"
  | "selectedSentenceIndex"
  | "loadingHeatmapIndex"
  | "heatmapCache"
  | "chatMessages"
  | "isChatLoading"
> = {
  reportData: null,
  uploadedFile: null,
  sessionId: null,
  isUploading: false,
  selectedSentenceIndex: null,
  loadingHeatmapIndex: null,
  heatmapCache: {},
  chatMessages: [],
  isChatLoading: false,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useClarityStore = create<ClarityState>((set) => ({
  ...INITIAL,

  setReport: (file, data, sessionId) =>
    set({
      uploadedFile: file,
      reportData: data,
      sessionId: sessionId ?? null,
      selectedSentenceIndex: null,
      loadingHeatmapIndex: null,
      heatmapCache: {},
      chatMessages: [],
    }),

  setUploading: (uploading) => set({ isUploading: uploading }),

  selectSentence: (index) => set({ selectedSentenceIndex: index }),

  setLoadingHeatmap: (index) => set({ loadingHeatmapIndex: index }),

  cacheHeatmap: (index, overlay_b64) =>
    set((state) => ({
      heatmapCache: { ...state.heatmapCache, [index]: overlay_b64 },
    })),

  setSessionId: (id) => set({ sessionId: id }),

  addChatMessage: (msg) =>
    set((state) => ({ chatMessages: [...state.chatMessages, msg] })),

  setChatLoading: (loading) => set({ isChatLoading: loading }),

  reset: () => set({ ...INITIAL }),
}));
