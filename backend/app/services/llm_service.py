"""
LLMService
- Loads MedGemma from saved_models/medgemma_model.pkl + processor.pkl
- Generates structured radiology reports
- Extracts decoder self-attention → per-sentence heatmaps (CLARITY XAI method)
- Handles conversational tool-calling for the /chat endpoint
"""

import gc
import io
import json
import textwrap
import warnings
from base64 import b64encode
from pathlib import Path
from typing import Optional

import matplotlib
matplotlib.use("Agg")
import matplotlib.cm as cm
import matplotlib.pyplot as plt
import nltk
import numpy as np
import scipy.ndimage as ndimage
import torch
from nltk.tokenize import sent_tokenize
from PIL import Image

warnings.filterwarnings("ignore")

nltk.download("punkt", quiet=True)
nltk.download("punkt_tab", quiet=True)

_HERE = Path(__file__).parent.parent.parent
MODEL_PKL     = _HERE / "saved_models" / "medgemma_model.pkl"
PROCESSOR_PKL = _HERE / "saved_models" / "medgemma_processor.pkl"

SYSTEM_PROMPT = (
    "You are an expert radiologist. Analyze this chest X-ray and write a structured report. "
    "Describe each anatomical region in its own single, standalone sentence. "
    "Do NOT use bullet points, numbered lists, or bold text. "
    "If a region is normal, explicitly state it is normal. "
    "Cover the lung fields, cardiac silhouette, mediastinum, costophrenic angles, and bones."
)

CHAT_SYSTEM_PROMPT = (
    "You are CLARITY, an expert AI radiology assistant. "
    "You have already analyzed a chest X-ray and generated a report. "
    "Answer the clinician's questions clearly, referencing the report and diagnostic data provided. "
    "When the clinician asks to SEE a heatmap or visualization for a specific pathology or region, "
    "respond ONLY with a JSON tool call like: "
    '{{"tool": "get_grad_cam", "pathology": "<pathology_name>"}} '
    "Valid pathologies: Atelectasis, Cardiomegaly, Consolidation, Edema, "
    "Enlarged Cardiomediastinum, Fracture, Lung Lesion, Lung Opacity, No Finding, "
    "Pleural Effusion, Pleural Other, Pneumonia, Pneumothorax, Support Devices. "
    "For all other questions, respond in plain natural language."
)


class LLMService:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._load()

    # ── Loading ────────────────────────────────────────────────────────────────

    def _load(self):
        for path in (MODEL_PKL, PROCESSOR_PKL):
            if not path.exists():
                raise FileNotFoundError(f"Required file not found: {path}")

        print(f"[LLM] Loading processor from {PROCESSOR_PKL} ...")
        self.processor = torch.load(PROCESSOR_PKL, map_location=self.device)

        print(f"[LLM] Loading model from {MODEL_PKL} ...")
        self.model = torch.load(MODEL_PKL, map_location=self.device)
        self.model.eval()

        self.IMAGE_TOKEN_ID = self.model.config.image_token_index
        vision_cfg = self.model.config.vision_config
        self.PATCH_GRID = vision_cfg.image_size // vision_cfg.patch_size
        self.N_IMG_PATCHES = self.PATCH_GRID ** 2

        used_gb  = torch.cuda.memory_allocated() / 1e9 if self.device == "cuda" else 0
        print(f"[LLM] ✓ Loaded | patches: {self.PATCH_GRID}×{self.PATCH_GRID} | GPU: {used_gb:.1f} GB")

    # ── Report generation ──────────────────────────────────────────────────────

    def generate_report(
        self,
        image: Image.Image,
        max_new_tokens: int = 400,
    ) -> tuple[str, str]:
        """Generate report. Returns (report_text, prompt_text)."""
        prompt_text = self._build_prompt(image, SYSTEM_PROMPT)
        inputs = self.processor(
            text=prompt_text, images=image, return_tensors="pt"
        ).to(self.model.device)

        with torch.no_grad():
            output_ids = self.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                do_sample=True,
                temperature=0.2,
                top_p=0.9,
                pad_token_id=self.processor.tokenizer.eos_token_id,
            )

        input_len = inputs["input_ids"].shape[1]
        report_text = self.processor.decode(
            output_ids[0, input_len:], skip_special_tokens=True
        ).strip()
        return report_text, prompt_text

    def parse_sentences(self, report_text: str, min_len: int = 15) -> list[str]:
        return [s.strip() for s in sent_tokenize(report_text) if len(s.strip()) >= min_len]

    # ── Attention heatmaps ─────────────────────────────────────────────────────

    def extract_attention(
        self,
        image: Image.Image,
        prompt_text: str,
        report_text: str,
        n_layers_from_end: int = 6,
    ) -> tuple[torch.Tensor, torch.Tensor]:
        """Forward pass with output_attentions. Returns (text_to_img_attn, suffix_input_ids)."""
        gc.collect()
        if self.device == "cuda":
            torch.cuda.empty_cache()

        full_text = prompt_text + report_text
        inputs = self.processor(
            text=full_text, images=image, return_tensors="pt"
        ).to(self.model.device)

        input_ids = inputs["input_ids"]
        placeholder_positions = (
            input_ids[0] == self.model.config.image_token_index
        ).nonzero(as_tuple=True)[0]

        img_start = placeholder_positions[0].item()
        img_end   = placeholder_positions[-1].item() + 1
        text_start = img_end
        suffix_input_ids = input_ids[0, text_start:].cpu()

        with torch.no_grad():
            outputs = self.model(
                input_ids=input_ids,
                pixel_values=inputs["pixel_values"],
                attention_mask=inputs.get("attention_mask"),
                output_attentions=True,
                return_dict=True,
            )

        n_total = len(outputs.attentions)
        mid = n_total // 2
        selected = set(range(mid - n_layers_from_end // 2, mid + n_layers_from_end // 2))

        t2i_list = []
        for idx, layer_attn in enumerate(outputs.attentions):
            if idx in selected:
                t2i = layer_attn[0, :, text_start:, img_start:img_end]
                t2i_list.append(t2i.float().cpu())
            del layer_attn

        del outputs
        gc.collect()
        if self.device == "cuda":
            torch.cuda.empty_cache()

        return torch.stack(t2i_list), suffix_input_ids

    def compute_sentence_heatmaps(
        self,
        image: Image.Image,
        sentences: list[str],
        suffix_input_ids: torch.Tensor,
        text_to_img_attn: torch.Tensor,
        sigma: float = 1.5,
        alpha: float = 0.5,
        cmap_name: str = "jet",
    ) -> list[dict]:
        """Compute contrastive attention heatmaps for each sentence."""
        patch_count = text_to_img_attn.shape[-1]
        patch_grid  = int(patch_count ** 0.5)

        raw_maps = [
            self._raw_heatmap(s, suffix_input_ids, text_to_img_attn, patch_grid)
            for s in sentences
        ]
        global_avg = np.mean(raw_maps, axis=0)

        results = []
        for i, sentence in enumerate(sentences):
            c_map = np.clip(raw_maps[i] - global_avg, 0, None)
            if sigma > 0:
                c_map = ndimage.gaussian_filter(c_map, sigma=sigma)
            h_min, h_max = c_map.min(), c_map.max()
            final = (
                (c_map - h_min) / (h_max - h_min)
                if (h_max - h_min) > 1e-8
                else np.zeros_like(c_map)
            )
            overlay = self._overlay_heatmap(image, final, alpha=alpha, cmap_name=cmap_name)
            results.append({
                "index": i,
                "sentence": sentence,
                "heatmap_np": final,
                "overlay_b64": self._pil_to_b64(overlay),
                "attention_map_b64": self._array_to_b64(final, cmap_name),
            })

        return results

    # ── Chat / tool-calling ────────────────────────────────────────────────────

    def chat(
        self,
        user_message: str,
        history: list[dict],
        context: dict,
    ) -> dict:
        """
        Single-turn conversational response with tool-call detection.

        context = {
          "report": str,
          "top_pathology": str,
          "all_pathologies": list[dict],
        }

        Returns:
          {
            "reply": str,
            "tool_call": dict | None,   e.g. {"tool": "get_grad_cam", "pathology": "Pneumonia"}
          }
        """
        context_block = (
            f"[DIAGNOSTIC CONTEXT]\n"
            f"Top pathology: {context.get('top_pathology', 'Unknown')}\n"
            f"Report:\n{context.get('report', '')}\n\n"
            f"All pathology probabilities:\n"
            + "\n".join(
                f"  {p['name']}: {p['probability']:.3f}"
                for p in context.get("all_pathologies", [])
            )
        )

        messages = [
            {"role": "system", "content": CHAT_SYSTEM_PROMPT + "\n\n" + context_block}
        ]
        for h in history:
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": user_message})

        prompt = self.processor.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        inputs = self.processor(text=prompt, return_tensors="pt").to(self.model.device)

        with torch.no_grad():
            output_ids = self.model.generate(
                **inputs,
                max_new_tokens=300,
                do_sample=True,
                temperature=0.3,
                top_p=0.9,
                pad_token_id=self.processor.tokenizer.eos_token_id,
            )

        input_len = inputs["input_ids"].shape[1]
        reply = self.processor.decode(
            output_ids[0, input_len:], skip_special_tokens=True
        ).strip()

        # Detect tool call in response
        tool_call = None
        if reply.strip().startswith("{") and '"tool"' in reply:
            try:
                tool_call = json.loads(reply.strip())
                reply = f"Sure, generating the {tool_call.get('pathology', '')} Grad-CAM heatmap..."
            except json.JSONDecodeError:
                pass

        return {"reply": reply, "tool_call": tool_call}

    # ── Grid image ─────────────────────────────────────────────────────────────

    def build_grid_image(
        self,
        image: Image.Image,
        sentence_results: list[dict],
        top_pathology: str,
        gradcam_overlay_b64: Optional[str],
        cols: int = 3,
    ) -> str:
        """Build a multi-panel summary grid. Returns base64 PNG."""
        n_sent  = min(len(sentence_results), 8)
        n_total = 2 + n_sent   # original + gradcam + sentence panels
        rows    = (n_total + cols - 1) // cols

        fig = plt.figure(figsize=(5.5 * cols, 5.0 * rows))
        fig.suptitle("CLARITY — Analysis Summary", fontsize=13, y=1.01)

        # Panel 1: original
        ax = fig.add_subplot(rows, cols, 1)
        ax.imshow(image, cmap="gray")
        ax.set_title("Original X-Ray", fontsize=10, fontweight="bold")
        ax.axis("off")

        # Panel 2: Grad-CAM
        ax2 = fig.add_subplot(rows, cols, 2)
        if gradcam_overlay_b64:
            import base64, PIL.Image
            raw = base64.b64decode(gradcam_overlay_b64)
            grad_img = PIL.Image.open(io.BytesIO(raw))
            ax2.imshow(grad_img)
        else:
            ax2.imshow(image, cmap="gray")
        ax2.set_title(f"Grad-CAM: {top_pathology}", fontsize=9, fontweight="bold", color="#b00020")
        ax2.axis("off")

        # Panels 3+: sentence attention
        for i in range(n_sent):
            import base64, PIL.Image
            raw = base64.b64decode(sentence_results[i]["overlay_b64"])
            ov  = PIL.Image.open(io.BytesIO(raw))
            ax  = fig.add_subplot(rows, cols, i + 3)
            ax.imshow(ov)
            title = textwrap.fill(f"[{i:02d}] {sentence_results[i]['sentence']}", 38)
            ax.set_title(title, fontsize=7)
            ax.axis("off")

        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format="PNG", dpi=110, bbox_inches="tight")
        plt.close(fig)
        buf.seek(0)
        return b64encode(buf.read()).decode()

    # ── Private helpers ────────────────────────────────────────────────────────

    def _build_prompt(self, image: Image.Image, system_prompt: str) -> str:
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": image},
                    {"type": "text",  "text": system_prompt},
                ],
            }
        ]
        return self.processor.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )

    def _raw_heatmap(
        self,
        sentence: str,
        suffix_ids: torch.Tensor,
        t2i_attn: torch.Tensor,
        patch_grid: int,
    ) -> np.ndarray:
        mask, _ = self._find_sentence_tokens(sentence, suffix_ids)
        sent_attn = t2i_attn[:, :, mask, :]
        token_max = sent_attn.max(dim=2).values
        head_max  = token_max.max(dim=1).values
        flat      = head_max.mean(dim=0)
        return flat.reshape(patch_grid, patch_grid).numpy()

    def _find_sentence_tokens(
        self, sentence: str, suffix_ids: torch.Tensor
    ) -> tuple[torch.Tensor, Optional[int]]:
        sent_ids   = self.processor.tokenizer.encode(sentence, add_special_tokens=False)
        suffix_lst = suffix_ids.tolist()
        n_sent, n_total = len(sent_ids), len(suffix_lst)

        for j in range(n_total - n_sent + 1):
            if suffix_lst[j: j + n_sent] == sent_ids:
                mask = torch.zeros(n_total, dtype=torch.bool)
                mask[j: j + n_sent] = True
                return mask, j

        for ws in range(n_sent - 1, 1, -1):
            for off in range(n_sent - ws + 1):
                sub = sent_ids[off: off + ws]
                for j in range(n_total - ws + 1):
                    if suffix_lst[j: j + ws] == sub:
                        start = max(0, j - off)
                        end   = min(n_total, start + n_sent)
                        mask  = torch.zeros(n_total, dtype=torch.bool)
                        mask[start:end] = True
                        return mask, start

        return torch.ones(n_total, dtype=torch.bool), None

    @staticmethod
    def _overlay_heatmap(
        image_pil: Image.Image, hm: np.ndarray, alpha: float, cmap_name: str
    ) -> Image.Image:
        W, H = image_pil.size
        cmap   = cm.get_cmap(cmap_name)
        hm_up  = np.array(
            Image.fromarray((hm * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
        ).astype(np.float32) / 255.0
        hm_rgb = cmap(hm_up)[:, :, :3]
        img_rgb = np.array(image_pil.convert("RGB")).astype(np.float32) / 255.0
        blended = img_rgb * (1 - alpha) + hm_rgb * alpha
        return Image.fromarray((np.clip(blended, 0, 1) * 255).astype(np.uint8))

    @staticmethod
    def _pil_to_b64(img: Image.Image) -> str:
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return b64encode(buf.getvalue()).decode()

    @staticmethod
    def _array_to_b64(arr: np.ndarray, cmap_name: str = "jet") -> str:
        cmap = cm.get_cmap(cmap_name)
        rgba = cmap(arr)
        img  = Image.fromarray((rgba[:, :, :3] * 255).astype(np.uint8))
        buf  = io.BytesIO()
        img.save(buf, format="PNG")
        return b64encode(buf.getvalue()).decode()