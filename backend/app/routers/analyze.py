"""
POST /analyze
Full CLARITY pipeline:
  1. DenseNet-121 → pathology classification (14 classes)
  2. Grad-CAM     → heatmap for top pathology (+ any extras requested)
  3. MedGemma LLM → structured radiology report
  4. Attention XAI → per-sentence heatmap overlays
  5. Summary grid  → multi-panel PNG
  6. Session       → create session for /chat follow-up
"""

import io
from datetime import datetime

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from PIL import Image

from app.schemas import (
    AnalyzeResponse,
    GradCAMResult,
    Pathology,
    SentenceAttention,
)
from app.services.session_store import create_session

router = APIRouter(tags=["Analyze"])

SUPPORTED_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    request: Request,
    file: UploadFile = File(..., description="Chest X-ray image (PNG/JPEG)"),
    # DenseNet options
    gradcam_pathologies: str = Form(
        "",
        description="Comma-separated extra pathologies to Grad-CAM besides the top one. "
                    "E.g. 'Pneumonia,Edema'",
    ),
    gradcam_alpha: float = Form(0.5),
    # LLM options
    max_new_tokens: int = Form(400),
    n_layers_from_end: int = Form(6),
    attn_sigma: float = Form(1.5),
    attn_alpha: float = Form(0.5),
    heatmap_cmap: str = Form("jet"),
):
    if file.content_type not in SUPPORTED_TYPES:
        raise HTTPException(415, f"Unsupported file type: {file.content_type}")

    raw = await file.read()
    try:
        image = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as e:
        raise HTTPException(400, f"Cannot read image: {e}")

    services = request.app.state.services
    densenet = services["densenet"]
    llm      = services["llm"]

    try:
        # ── Step 1: DenseNet classification ───────────────────────────────────
        predictions  = densenet.predict(image)
        top_path     = densenet.top_pathology(predictions)

        # ── Step 2: Grad-CAM ─────────────────────────────────────────────────
        cam_targets = {top_path}
        if gradcam_pathologies.strip():
            for p in gradcam_pathologies.split(","):
                p = p.strip()
                if p:
                    cam_targets.add(p)

        gradcam_results = []
        for path in cam_targets:
            try:
                cam = densenet.grad_cam(image, path, alpha=gradcam_alpha, cmap_name=heatmap_cmap)
                gradcam_results.append(
                    GradCAMResult(
                        pathology=cam["pathology"],
                        heatmap_b64=cam["heatmap_b64"],
                        overlay_b64=cam["overlay_b64"],
                    )
                )
            except Exception as e:
                # Don't fail the whole request for one bad Grad-CAM
                print(f"[Analyze] Grad-CAM failed for '{path}': {e}")

        top_gradcam_overlay = next(
            (g.overlay_b64 for g in gradcam_results if g.pathology == top_path), None
        )

        # ── Step 3: LLM report ───────────────────────────────────────────────
        report_text, prompt_text = llm.generate_report(image, max_new_tokens=max_new_tokens)
        sentences = llm.parse_sentences(report_text)

        if not sentences:
            raise HTTPException(500, "LLM produced no parseable sentences.")

        # ── Step 4: Attention heatmaps ───────────────────────────────────────
        t2i_attn, suffix_ids = llm.extract_attention(
            image, prompt_text, report_text, n_layers_from_end=n_layers_from_end
        )
        sent_results_raw = llm.compute_sentence_heatmaps(
            image, sentences, suffix_ids, t2i_attn,
            sigma=attn_sigma, alpha=attn_alpha, cmap_name=heatmap_cmap,
        )

        sentence_results = [
            SentenceAttention(
                index=s["index"],
                sentence=s["sentence"],
                overlay_b64=s["overlay_b64"],
                attention_map_b64=s["attention_map_b64"],
            )
            for s in sent_results_raw
        ]

        # ── Step 5: Summary grid ─────────────────────────────────────────────
        grid_b64 = llm.build_grid_image(
            image, sent_results_raw, top_path, top_gradcam_overlay
        )

        # ── Step 6: Session ──────────────────────────────────────────────────
        session_context = {
            "report": report_text,
            "top_pathology": top_path,
            "all_pathologies": predictions,
            "image_bytes": raw,           # kept for on-demand Grad-CAM in /chat
        }
        session_id = create_session(session_context)

        # ── Build response ───────────────────────────────────────────────────
        manifest = {
            "clarity_version": "2.0",
            "timestamp": datetime.utcnow().isoformat(),
            "densenet_top_pathology": top_path,
            "llm_model": "google/medgemma-4b-it",
            "xai_methods": ["grad_cam", "decoder_self_attention_contrastive"],
            "n_layers_from_end": n_layers_from_end,
            "attn_sigma": attn_sigma,
            "attn_alpha": attn_alpha,
            "gradcam_alpha": gradcam_alpha,
            "heatmap_cmap": heatmap_cmap,
            "report": report_text,
            "sentences": sentences,
        }

        return AnalyzeResponse(
            top_pathology=top_path,
            all_pathologies=[Pathology(**p) for p in predictions],
            gradcam_results=gradcam_results,
            report=report_text,
            sentences=sentences,
            sentence_results=sentence_results,
            grid_image_b64=grid_b64,
            session_id=session_id,
            manifest=manifest,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))