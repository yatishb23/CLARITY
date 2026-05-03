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

export interface SentenceAttention {
  sentence_text: string;
  overlay_image_b64: string;
  heatmap_data?: number[][];
  confidence?: number;
}

export interface AnalyzeResponse {
  top_pathology: string;
  all_pathologies?: Pathology[];
  gradcam_results?: GradCAMResult[];
  report_text: string;
  sentences: SentenceAttention[];
  session_id: string;
  original_image_b64?: string;
  metadata?: {
    model_id: string;
  };
  confidence?: number;
  impression?: string;
  reasoning?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  session_id: string;
  message: string;
  history: ChatMessage[];
}

export interface ToolCall {
  tool_name: string;
  arguments: Record<string, any>;
}

export interface ChatResponse {
  reply: string;
  tool_calls: ToolCall[];
  image_b64?: string;
  image_label?: string;
}
