"""
Shared Pydantic schemas for CLARITY API request/response models.
"""

from typing import Optional
from pydantic import BaseModel


# ── /analyze ──────────────────────────────────────────────────────────────────

class Pathology(BaseModel):
    name: str
    probability: float
    auc: Optional[float] = None


class GradCAMResult(BaseModel):
    pathology: str
    heatmap_b64: str        # base64 PNG — raw Grad-CAM heatmap
    overlay_b64: str        # base64 PNG — Grad-CAM blended over X-ray


class SentenceAttention(BaseModel):
    index: int
    sentence: str
    overlay_b64: str        # base64 PNG — LLM attention heatmap overlay
    attention_map_b64: str  # base64 PNG — raw attention map


class AnalyzeResponse(BaseModel):
    # DenseNet results
    top_pathology: str
    all_pathologies: list[Pathology]

    # Grad-CAM (top pathology + all requested)
    gradcam_results: list[GradCAMResult]

    # LLM report
    report: str
    sentences: list[str]

    # Per-sentence attention heatmaps
    sentence_results: list[SentenceAttention]

    # Summary grid image
    grid_image_b64: str

    # Session ID for follow-up chat
    session_id: str

    manifest: dict


# ── /chat ─────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: list[ChatMessage] = []


class ToolCall(BaseModel):
    tool_name: str
    arguments: dict


class ChatResponse(BaseModel):
    reply: str
    tool_calls: list[ToolCall] = []
    # If a tool produced a new image, it's returned here
    image_b64: Optional[str] = None
    image_label: Optional[str] = None