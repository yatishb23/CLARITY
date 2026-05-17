// ─── Spec-aligned types for the CLARITY API ──────────────────────────────────

// ── /analyze ──────────────────────────────────────────────────────────────────

export interface Pathology {
  name: string;
  probability: number;
  auc?: number;
}

export interface GradCAMResult {
  pathology: string;
  heatmap_b64: string;
  overlay_b64: string;
}

/** Per-sentence attention heatmap from /analyze */
export interface SentenceAttention {
  index: number;
  sentence: string;
  overlay_b64: string;
  attention_map_b64: string;
}

/** Full response from POST /analyze */
export interface AnalyzeResponse {
  model: string;
  // DenseNet
  top_pathology: string;
  all_pathologies: Pathology[];

  // Grad-CAM
  gradcam_results: GradCAMResult[];

  // LLM report
  report: string;
  sentences: string[];           // plain sentence strings

  // Per-sentence attention
  sentence_results: SentenceAttention[];

  // Summary grid
  grid_image_b64: string;

  // Session for chat
  session_id: string;

  manifest: Record<string, unknown>;
}

// ── Frontend-only view models ─────────────────────────────────────────────────

/** A single sentence as used in the UI (index + text) */
export interface ReportSentence {
  index: number;
  sentence: string;
}

/** Subset of AnalyzeResponse used by the report panel */
export interface ReportOnlyResponse {
  model: string;
  report: string;
  sentence_count: number;
  sentences: ReportSentence[];
}

// ── /chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Extended message for the frontend — may carry an image from tool calls */
export interface ChatMessageDisplay extends ChatMessage {
  image_b64?: string;
  image_label?: string;
}

export interface ChatRequest {
  session_id: string;
  message: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
  tool_calls: Array<{ tool_name: string; arguments: Record<string, unknown> }>;
  image_b64?: string;
  image_label?: string;
}

// ── /health ───────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: "ok";
  model: string;
}

export interface APIError {
  detail: string;
}
