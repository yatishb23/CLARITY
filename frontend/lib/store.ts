import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { get, set as idbSet, del } from "idb-keyval";
import type { ReportOnlyResponse, ChatMessageDisplay } from "./api-types";

// ─── Custom IndexedDB Storage Adapter for Zustand ─────────────────────────────
const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await idbSet(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

// ─── State shape ──────────────────────────────────────────────────────────────

interface CachedScan {
  reportData: ReportOnlyResponse;
  uploadedImageDataUrl: string;
  sessionId: string;
  heatmapCache: Record<number, string>;
  chatMessages: ChatMessageDisplay[];
  chatHistory: ChatMessageDisplay[][];
}

interface ClarityState {
  // Data
  reportData: ReportOnlyResponse | null;
  uploadedImageDataUrl: string | null;
  sessionId: string | null;

  // UI
  isUploading: boolean;
  selectedSentenceIndex: number | null;
  loadingHeatmapIndex: number | null;

  /** index → overlay_b64; avoids redundant network calls */
  heatmapCache: Record<number, string>;

  // Chat
  chatMessages: ChatMessageDisplay[];
  chatHistory: ChatMessageDisplay[][];
  isChatLoading: boolean;

  // Global Scan Cache
  scanCache: Record<string, CachedScan>;

  // Actions
  setReport: (dataUrl: string, data: ReportOnlyResponse, sessionId?: string) => void;
  setUploading: (uploading: boolean) => void;
  selectSentence: (index: number | null) => void;
  setLoadingHeatmap: (index: number | null) => void;
  cacheHeatmap: (index: number, overlay_b64: string) => void;
  setSessionId: (id: string | null) => void;
  addChatMessage: (msg: ChatMessageDisplay) => void;
  clearChatMessages: () => void;
  restorePastChat: (index: number) => void;
  setChatLoading: (loading: boolean) => void;
  saveToScanCache: (fileName: string) => void;
  restoreFromScanCache: (fileName: string) => boolean;
  reset: () => void;
}

// ─── Initial state (extracted so reset() is DRY) ─────────────────────────────

const INITIAL: Pick<
  ClarityState,
  | "reportData"
  | "uploadedImageDataUrl"
  | "sessionId"
  | "isUploading"
  | "selectedSentenceIndex"
  | "loadingHeatmapIndex"
  | "heatmapCache"
  | "chatMessages"
  | "chatHistory"
  | "isChatLoading"
  | "scanCache"
> = {
  reportData: null,
  uploadedImageDataUrl: null,
  sessionId: null,
  isUploading: false,
  selectedSentenceIndex: null,
  loadingHeatmapIndex: null,
  heatmapCache: {},
  chatMessages: [],
  chatHistory: [],
  isChatLoading: false,
  scanCache: {},
};

// ─── Store ────────────────────────────────────────────────────────────────────

// ─── Store ────────────────────────────────────────────────────────────────────

export const useClarityStore = create<ClarityState>()(
  persist(
    (set) => ({
      ...INITIAL,

      setReport: (dataUrl, data, sessionId) =>
        set({
          uploadedImageDataUrl: dataUrl,
          reportData: data,
          sessionId: sessionId ?? null,
          selectedSentenceIndex: null,
          loadingHeatmapIndex: null,
          heatmapCache: {},
          chatMessages: [],
          chatHistory: [],
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

      clearChatMessages: () =>
        set((state) => {
          if (state.chatMessages.length === 0) return state;
          return {
            chatHistory: [...state.chatHistory, state.chatMessages],
            chatMessages: [],
          };
        }),

      restorePastChat: (index: number) =>
        set((state) => {
          const history = [...state.chatHistory];
          const activeChat = [...state.chatMessages];
          const restoredChat = history.splice(index, 1)[0];
          
          if (activeChat.length > 0) {
            history.push(activeChat); // Save current chat to history
          }
          
          return {
            chatHistory: history,
            chatMessages: restoredChat,
          };
        }),

      setChatLoading: (loading) => set({ isChatLoading: loading }),

      saveToScanCache: (fileName) =>
        set((state) => {
          if (!state.reportData || !state.uploadedImageDataUrl) return state;
          const cachedScan: CachedScan = {
            reportData: state.reportData,
            uploadedImageDataUrl: state.uploadedImageDataUrl,
            sessionId: state.sessionId || "",
            heatmapCache: state.heatmapCache,
            chatMessages: state.chatMessages,
            chatHistory: state.chatHistory,
          };
          return {
            scanCache: { ...state.scanCache, [fileName]: cachedScan },
          };
        }),

      restoreFromScanCache: (fileName) => {
        let restored = false;
        set((state) => {
          const cached = state.scanCache[fileName];
          if (cached) {
            restored = true;
            return {
              reportData: cached.reportData,
              uploadedImageDataUrl: cached.uploadedImageDataUrl,
              sessionId: cached.sessionId,
              heatmapCache: cached.heatmapCache,
              chatMessages: cached.chatMessages,
              chatHistory: cached.chatHistory,
              selectedSentenceIndex: null,
              loadingHeatmapIndex: null,
            };
          }
          return state;
        });
        return restored;
      },

      reset: () => set({ ...INITIAL }),
    }),
    {
      name: "clarity-storage", // key in IndexedDB
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        reportData: state.reportData,
        uploadedImageDataUrl: state.uploadedImageDataUrl,
        sessionId: state.sessionId,
        heatmapCache: state.heatmapCache,
        chatMessages: state.chatMessages,
        chatHistory: state.chatHistory,
        scanCache: state.scanCache,
      }),
    }
  )
);
