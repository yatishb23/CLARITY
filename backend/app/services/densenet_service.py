"""
DenseNetService
- Loads DenseNet-121 from saved_models/densenet_model.pkl
- Classifies 14 CheXpert pathologies
- Generates Grad-CAM heatmaps for any pathology on demand
"""

import gc
import io
import warnings
from base64 import b64encode
from pathlib import Path
from typing import Optional

import matplotlib
matplotlib.use("Agg")
import matplotlib.cm as cm
import matplotlib.pyplot as plt
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms

warnings.filterwarnings("ignore")

_HERE = Path(__file__).parent.parent.parent
MODEL_PATH = _HERE / "saved_models" / "densenet_model.pkl"

# 14 CheXpert pathology labels (same order as model output)
PATHOLOGY_LABELS = [
    "Atelectasis",
    "Cardiomegaly",
    "Consolidation",
    "Edema",
    "Enlarged Cardiomediastinum",
    "Fracture",
    "Lung Lesion",
    "Lung Opacity",
    "No Finding",
    "Pleural Effusion",
    "Pleural Other",
    "Pneumonia",
    "Pneumothorax",
    "Support Devices",
]

# ImageNet normalisation (standard for DenseNet fine-tuning)
_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])


class DenseNetService:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._load_model()
        self._grad_cam_handles: list = []
        self._feature_maps: Optional[torch.Tensor] = None
        self._gradients: Optional[torch.Tensor] = None

    # ── Model loading ──────────────────────────────────────────────────────────

    def _load_model(self):
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"DenseNet model not found at {MODEL_PATH}")
        print(f"[DenseNet] Loading model from {MODEL_PATH} ...")
        self.model = torch.load(MODEL_PATH, map_location=self.device)
        self.model.eval()
        print(f"[DenseNet] ✓ Loaded on {self.device}")

    # ── Inference ──────────────────────────────────────────────────────────────

    def predict(self, image: Image.Image) -> list[dict]:
        """
        Run DenseNet on a PIL image.
        Returns list of {name, probability} sorted by probability desc.
        """
        tensor = _TRANSFORM(image.convert("RGB")).unsqueeze(0).to(self.device)
        with torch.no_grad():
            logits = self.model(tensor)
            probs = torch.sigmoid(logits).squeeze().cpu().numpy()

        return sorted(
            [{"name": PATHOLOGY_LABELS[i], "probability": float(probs[i])}
             for i in range(len(PATHOLOGY_LABELS))],
            key=lambda x: x["probability"],
            reverse=True,
        )

    def top_pathology(self, predictions: list[dict]) -> str:
        """Return the highest-probability non-'No Finding' pathology, or 'No Finding'."""
        for p in predictions:
            if p["name"] != "No Finding":
                return p["name"]
        return "No Finding"

    # ── Grad-CAM ───────────────────────────────────────────────────────────────

    def grad_cam(
        self,
        image: Image.Image,
        pathology: str,
        alpha: float = 0.5,
        cmap_name: str = "jet",
    ) -> dict:
        """
        Generate Grad-CAM heatmap for a given pathology.

        Returns:
          {
            "pathology": str,
            "heatmap_b64": base64 PNG of raw heatmap,
            "overlay_b64": base64 PNG of heatmap overlaid on image,
          }
        """
        if pathology not in PATHOLOGY_LABELS:
            raise ValueError(
                f"Unknown pathology '{pathology}'. "
                f"Valid options: {PATHOLOGY_LABELS}"
            )

        class_idx = PATHOLOGY_LABELS.index(pathology)
        tensor = _TRANSFORM(image.convert("RGB")).unsqueeze(0).to(self.device)

        # Hook into the last dense block (last conv layer before classifier)
        target_layer = self._get_target_layer()
        feature_maps = []
        gradients = []

        def forward_hook(_, __, output):
            feature_maps.append(output.detach())

        def backward_hook(_, __, grad_output):
            gradients.append(grad_output[0].detach())

        fh = target_layer.register_forward_hook(forward_hook)
        bh = target_layer.register_full_backward_hook(backward_hook)

        try:
            self.model.zero_grad()
            logits = self.model(tensor)
            score = torch.sigmoid(logits)[0, class_idx]
            score.backward()

            fmap = feature_maps[0].squeeze(0)   # (C, H, W)
            grad = gradients[0].squeeze(0)       # (C, H, W)

            # Global average pool gradients → weights
            weights = grad.mean(dim=(1, 2))      # (C,)
            cam = (weights[:, None, None] * fmap).sum(dim=0)   # (H, W)
            cam = F.relu(cam)

            # Normalise
            cam_min, cam_max = cam.min(), cam.max()
            if (cam_max - cam_min) > 1e-8:
                cam = (cam - cam_min) / (cam_max - cam_min)
            else:
                cam = torch.zeros_like(cam)

            cam_np = cam.cpu().numpy()

        finally:
            fh.remove()
            bh.remove()

        heatmap_b64 = self._array_to_b64(cam_np, cmap_name=cmap_name)
        overlay_b64 = self._overlay_to_b64(image, cam_np, alpha=alpha, cmap_name=cmap_name)

        return {
            "pathology": pathology,
            "heatmap_b64": heatmap_b64,
            "overlay_b64": overlay_b64,
        }

    def _get_target_layer(self):
        """Return the last convolutional layer of the DenseNet."""
        # Works for torchvision DenseNet-121 / 169 / 201
        try:
            return self.model.features.denseblock4.denselayer16.conv2
        except AttributeError:
            pass
        # Fallback: walk named modules and return last Conv2d
        last_conv = None
        for _, m in self.model.named_modules():
            if isinstance(m, torch.nn.Conv2d):
                last_conv = m
        if last_conv is None:
            raise RuntimeError("Could not find a Conv2d layer in the model.")
        return last_conv

    # ── Image helpers ──────────────────────────────────────────────────────────

    @staticmethod
    def _array_to_b64(arr: np.ndarray, cmap_name: str = "jet") -> str:
        cmap = cm.get_cmap(cmap_name)
        rgba = cmap(arr)
        img = Image.fromarray((rgba[:, :, :3] * 255).astype(np.uint8))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return b64encode(buf.getvalue()).decode()

    @staticmethod
    def _overlay_to_b64(
        image_pil: Image.Image,
        cam_np: np.ndarray,
        alpha: float = 0.5,
        cmap_name: str = "jet",
    ) -> str:
        W, H = image_pil.size
        cmap = cm.get_cmap(cmap_name)

        # Upsample CAM to image size
        cam_img = Image.fromarray((cam_np * 255).astype(np.uint8))
        cam_up = np.array(cam_img.resize((W, H), Image.BICUBIC)).astype(np.float32) / 255.0

        hm_rgb = cmap(cam_up)[:, :, :3]
        img_rgb = np.array(image_pil.convert("RGB")).astype(np.float32) / 255.0
        blended = img_rgb * (1.0 - alpha) + hm_rgb * alpha

        result = Image.fromarray((np.clip(blended, 0, 1) * 255).astype(np.uint8))
        buf = io.BytesIO()
        result.save(buf, format="PNG")
        return b64encode(buf.getvalue()).decode()