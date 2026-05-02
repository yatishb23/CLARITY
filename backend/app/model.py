"""
ClarityModel — loads pre-saved model.pkl + processor.pkl and runs the CLARITY pipeline.

Responsible for:
  - Loading model and processor from saved_models/
  - Generating radiology reports
  - Extracting text-to-image attention maps
  - Computing contrastive heatmaps
  - Overlaying heatmaps on images
"""

import gc
import os
import warnings
from pathlib import Path
from typing import Optional

import matplotlib.cm as cm
import nltk
import numpy as np
import scipy.ndimage as ndimage
import torch
from nltk.tokenize import sent_tokenize
from PIL import Image

warnings.filterwarnings("ignore")

nltk.download("punkt", quiet=True)
nltk.download("punkt_tab", quiet=True)

# Paths relative to this file
_HERE = Path(__file__).parent
SAVED_MODELS_DIR = _HERE / "models"
MODEL_PKL_PATH   = SAVED_MODELS_DIR / "model.pkl"
PROCESSOR_PKL_PATH = SAVED_MODELS_DIR / "processor.pkl"


class ClarityModel:
    MODEL_ID = "google/medgemma-4b-it"

    SYSTEM_PROMPT = (
        "You are an expert radiologist. Analyze this chest X-ray and write a report. "
        "Describe each anatomical region in its own single, standalone sentence. "
        "Do NOT use bullet points, numbered lists, or bold text. "
        "If a region is normal, explicitly state it is normal. "
        "If there is a real pathology (such as cardiomegaly, effusion, or opacity), "
        "describe only what you actually see. "
        "Cover the lung fields, cardiac silhouette, mediastinum, costophrenic angles, and bones."
    )

    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        if self.device == "cpu":
            raise RuntimeError(
                "CLARITY requires a CUDA GPU. "
                "No GPU detected — ensure you are running on a GPU-enabled machine."
            )

        self._load()

    # ── Private: Model loading ────────────────────────────────────────────────

    def _load(self):
        if not MODEL_PKL_PATH.exists():
            raise FileNotFoundError(f"model.pkl not found at {MODEL_PKL_PATH}")
        if not PROCESSOR_PKL_PATH.exists():
            raise FileNotFoundError(f"processor.pkl not found at {PROCESSOR_PKL_PATH}")

        print(f"[CLARITY] Loading processor from {PROCESSOR_PKL_PATH} ...")
        self.processor = torch.load(PROCESSOR_PKL_PATH, map_location=self.device)

        print(f"[CLARITY] Loading model from {MODEL_PKL_PATH} ...")
        self.model = torch.load(MODEL_PKL_PATH, map_location=self.device)
        self.model.eval()

        # Discover vision config (same as notebook)
        self.IMAGE_TOKEN_ID = self.model.config.image_token_index
        vision_cfg = self.model.config.vision_config
        self.PATCH_SIZE    = vision_cfg.patch_size
        self.IMAGE_SIZE    = vision_cfg.image_size
        self.PATCH_GRID    = self.IMAGE_SIZE // self.PATCH_SIZE
        self.N_IMG_PATCHES = self.PATCH_GRID * self.PATCH_GRID

        used_gb  = torch.cuda.memory_allocated() / 1e9
        total_gb = torch.cuda.get_device_properties(0).total_memory / 1e9
        print(
            f"[CLARITY] ✓ Loaded from pkl | "
            f"GPU: {used_gb:.1f}/{total_gb:.1f} GB | "
            f"Patches: {self.PATCH_GRID}×{self.PATCH_GRID}={self.N_IMG_PATCHES}"
        )

    # ── Public API ────────────────────────────────────────────────────────────

    def generate_report(
        self,
        image: Image.Image,
        system_prompt: Optional[str] = None,
        max_new_tokens: int = 400,
    ) -> tuple[str, str]:
        """
        Generate a structured radiology report.

        Returns:
            report_text : the generated report string
            prompt_text : the full formatted prompt (needed for attention extraction)
        """
        prompt_text = self._build_prompt(image, system_prompt or self.SYSTEM_PROMPT)
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
        generated_ids = output_ids[0, input_len:]
        report_text = self.processor.decode(
            generated_ids, skip_special_tokens=True
        ).strip()
        return report_text, prompt_text

    def parse_sentences(self, report_text: str, min_len: int = 15) -> list[str]:
        """Split the report into individual sentences."""
        raw = sent_tokenize(report_text)
        return [s.strip() for s in raw if len(s.strip()) >= min_len]

    def extract_attention(
        self,
        image: Image.Image,
        prompt_text: str,
        report_text: str,
        n_layers_from_end: int = 6,
    ) -> tuple[torch.Tensor, torch.Tensor]:
        """
        Run a forward pass with output_attentions=True and return the
        text-to-image attention slice.

        Returns:
            text_to_img_attn : (n_layers, n_heads, n_text_tokens, N_img)  on CPU
            suffix_input_ids : (n_text_tokens,) token IDs of the text suffix
        """
        gc.collect()
        torch.cuda.empty_cache()

        full_text = prompt_text + report_text
        inputs = self.processor(
            text=full_text, images=image, return_tensors="pt"
        ).to(self.model.device)

        input_ids = inputs["input_ids"]
        pixel_values = inputs["pixel_values"]
        attn_mask = inputs.get("attention_mask")

        # Locate image token boundaries dynamically
        placeholder_positions = (
            input_ids[0] == self.model.config.image_token_index
        ).nonzero(as_tuple=True)[0]

        if len(placeholder_positions) == 0:
            raise ValueError(
                f"IMAGE_TOKEN_ID={self.model.config.image_token_index} not found in input_ids."
            )

        img_attn_start = placeholder_positions[0].item()
        img_attn_end   = placeholder_positions[-1].item() + 1
        text_attn_start = img_attn_end
        suffix_input_ids = input_ids[0, text_attn_start:].cpu()

        with torch.no_grad():
            outputs = self.model(
                input_ids=input_ids,
                pixel_values=pixel_values,
                attention_mask=attn_mask,
                output_attentions=True,
                return_dict=True,
            )

        n_total_layers = len(outputs.attentions)
        mid = n_total_layers // 2
        selected_idxs = set(range(mid - 3, mid + 3))

        text_to_img_list = []
        for layer_idx, layer_attn in enumerate(outputs.attentions):
            if layer_idx in selected_idxs:
                t2i = layer_attn[0, :, text_attn_start:, img_attn_start:img_attn_end]
                text_to_img_list.append(t2i.float().cpu())
            del layer_attn

        del outputs
        gc.collect()
        torch.cuda.empty_cache()

        text_to_img_attn = torch.stack(text_to_img_list)
        return text_to_img_attn, suffix_input_ids

    def compute_raw_heatmap(
        self,
        sentence: str,
        suffix_input_ids: torch.Tensor,
        text_to_img_attn: torch.Tensor,
    ) -> np.ndarray:
        """Compute the unnormalized raw attention heatmap for one sentence."""
        n_img_patches = text_to_img_attn.shape[-1]
        patch_grid = int(n_img_patches ** 0.5)

        mask, _ = self._find_sentence_tokens(sentence, suffix_input_ids)
        sent_attn = text_to_img_attn[:, :, mask, :]   # (layers, heads, sent_toks, patches)

        token_max = sent_attn.max(dim=2).values        # (layers, heads, patches)
        head_max  = token_max.max(dim=1).values        # (layers, patches)
        heatmap_flat = head_max.mean(dim=0)            # (patches,)

        return heatmap_flat.reshape(patch_grid, patch_grid).numpy()

    def overlay_heatmap(
        self,
        image_pil: Image.Image,
        heatmap_2d: np.ndarray,
        alpha: float = 0.50,
        cmap_name: str = "jet",
    ) -> Image.Image:
        """Blend a [0,1] heatmap with the original image."""
        W, H = image_pil.size
        hm_pil = Image.fromarray((heatmap_2d * 255).astype(np.uint8))
        hm_up = np.array(hm_pil.resize((W, H), Image.BICUBIC)).astype(np.float32) / 255.0
        cmap = cm.get_cmap(cmap_name)
        hm_rgb = cmap(hm_up)[:, :, :3]
        img_rgb = np.array(image_pil.convert("RGB")).astype(np.float32) / 255.0
        blended = img_rgb * (1.0 - alpha) + hm_rgb * alpha
        return Image.fromarray((np.clip(blended, 0.0, 1.0) * 255).astype(np.uint8))

    # ── Private helpers ───────────────────────────────────────────────────────

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

    def _find_sentence_tokens(
        self,
        sentence: str,
        suffix_input_ids: torch.Tensor,
    ) -> tuple[torch.Tensor, Optional[int]]:
        """Find token positions for a sentence within the suffix token sequence."""
        sent_ids   = self.processor.tokenizer.encode(sentence, add_special_tokens=False)
        suffix_lst = suffix_input_ids.tolist()
        n_sent     = len(sent_ids)
        n_total    = len(suffix_lst)

        # Exact match
        for j in range(n_total - n_sent + 1):
            if suffix_lst[j : j + n_sent] == sent_ids:
                mask = torch.zeros(n_total, dtype=torch.bool)
                mask[j : j + n_sent] = True
                return mask, j

        # Partial / fuzzy match
        min_window = min(2, n_sent)
        for window_size in range(n_sent - 1, min_window - 1, -1):
            for offset in range(n_sent - window_size + 1):
                sub_seq = sent_ids[offset : offset + window_size]
                for j in range(n_total - window_size + 1):
                    if suffix_lst[j : j + window_size] == sub_seq:
                        start_idx = max(0, j - offset)
                        end_idx   = min(n_total, start_idx + n_sent)
                        mask      = torch.zeros(n_total, dtype=torch.bool)
                        mask[start_idx:end_idx] = True
                        return mask, start_idx

        # Fallback: use all tokens
        return torch.ones(n_total, dtype=torch.bool), None