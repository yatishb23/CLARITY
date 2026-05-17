// ─── Spec-aligned types for the CXR Attention Rollout API ───────────────────

/** A single sentence entry returned by /report-only */
export interface ReportSentence {
  index: number;
  sentence: string;
}

/** Response from POST /report-only */
export interface ReportOnlyResponse {
  model: string;
  report: string;
  sentence_count: number;
  sentences: ReportSentence[];
}

/** A sentence with embedded heatmap data from /analyze */
export interface SentenceWithOverlay extends ReportSentence {
  heatmap: number[][];
  overlay_b64: string;
  attention_map_b64?: string;
}

/** Actual response from POST /analyze — like ReportOnlyResponse but each sentence carries heatmap data */
export interface AnalyzeResponse {
  model: string;
  report: string;
  sentence_count: number;
  sentences: SentenceWithOverlay[];
}

/** Response from POST /heatmap/{sentence_index} */
export interface HeatmapResponse {
  index: number;
  sentence: string;
  /** 2-D float array (values 0.0–1.0), model vision-patch grid resolution */
  heatmap: number[][];
  /** Ready-to-render: use as `data:image/png;base64,{overlay_b64}` */
  overlay_b64: string;
}

/** Response from GET /health */
export interface HealthResponse {
  status: "ok";
  model: string;
}

/** Standard backend error shape */
export interface APIError {
  detail: string;
}

// ─── Chat types (mirrors backend schemas) ─────────────────────────────

/** A chat message as stored in the backend history */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Extended message for the frontend — may carry an image from tool calls */
export interface ChatMessageDisplay extends ChatMessage {
  image_b64?: string;
  image_label?: string;
}

/** Request body for POST /chat */
export interface ChatRequest {
  session_id: string;
  message: string;
  history: ChatMessage[];
}

/** Response from POST /chat */
export interface ChatResponse {
  reply: string;
  tool_calls: Array<{ tool_name: string; arguments: Record<string, unknown> }>;
  image_b64?: string;
  image_label?: string;
}

/** Parsed /analyze response includes session_id for follow-up chat */
export interface AnalyzeResponseWithSession extends AnalyzeResponse {
  session_id: string;
}
