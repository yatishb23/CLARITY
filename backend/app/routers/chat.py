"""
POST /chat
Conversational follow-up after /analyze.

Supports tool-calling:
  - get_grad_cam(pathology)  → generates a new Grad-CAM on demand
  - get_report               → returns the stored report text
  - get_diagnosis            → returns pathology probabilities

Flow:
  1. LLM reads user message + diagnostic context
  2. If LLM returns a tool-call JSON → execute tool → return image
  3. Otherwise → return plain text reply
"""

import io

from fastapi import APIRouter, HTTPException, Request
from PIL import Image

from app.schemas import ChatRequest, ChatResponse, ToolCall
from app.services.session_store import get_session

router = APIRouter(tags=["Chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: Request, body: ChatRequest):
    context = get_session(body.session_id)
    if context is None:
        raise HTTPException(
            404,
            "Session not found or expired. Please run /analyze first.",
        )

    services = request.app.state.services
    llm      = services["llm"]
    densenet = services["densenet"]

    # Build history list for LLM
    history = [{"role": m.role, "content": m.content} for m in body.history]

    # LLM response (may include tool-call)
    result = llm.chat(
        user_message=body.message,
        history=history,
        context={
            "report":           context["report"],
            "top_pathology":    context["top_pathology"],
            "all_pathologies":  context["all_pathologies"],
        },
    )

    reply      = result["reply"]
    tool_call  = result.get("tool_call")
    image_b64  = None
    image_label = None
    tool_calls_out: list[ToolCall] = []

    # ── Execute tool if requested ─────────────────────────────────────────────
    if tool_call:
        tool_name = tool_call.get("tool", "")

        if tool_name == "get_grad_cam":
            pathology = tool_call.get("pathology", context["top_pathology"])
            tool_calls_out.append(ToolCall(tool_name=tool_name, arguments={"pathology": pathology}))

            try:
                image_bytes = context.get("image_bytes")
                if image_bytes is None:
                    reply = "Sorry, the original image is no longer available in this session."
                else:
                    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
                    cam   = densenet.grad_cam(image, pathology)
                    image_b64   = cam["overlay_b64"]
                    image_label = f"Grad-CAM: {pathology}"
                    reply = (
                        f"Here is the Grad-CAM heatmap for **{pathology}**. "
                        "The highlighted regions show where the model focused when "
                        "detecting this finding. Do you have any follow-up questions?"
                    )
            except ValueError as e:
                reply = str(e)
            except Exception as e:
                reply = f"Could not generate Grad-CAM: {e}"

        elif tool_name == "get_report":
            tool_calls_out.append(ToolCall(tool_name=tool_name, arguments={}))
            reply = context["report"]

        elif tool_name == "get_diagnosis":
            tool_calls_out.append(ToolCall(tool_name=tool_name, arguments={}))
            lines = [
                f"{p['name']}: {p['probability']:.1%}"
                for p in context["all_pathologies"]
            ]
            reply = "Pathology probabilities:\n" + "\n".join(lines)

    return ChatResponse(
        reply=reply,
        tool_calls=tool_calls_out,
        image_b64=image_b64,
        image_label=image_label,
    )