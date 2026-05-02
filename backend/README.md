# CLARITY — FastAPI Backend

> **C**onversational **L**LM-**A**ssisted **R**adiology **I**nterpretation and **T**ransparenc**Y**

A production-ready FastAPI wrapper around the CLARITY notebook. Upload a chest X-ray → receive a structured radiology report + per-sentence attention heatmaps.

---

## Architecture

```
Frontend (any)
     │  POST /analyze  multipart/form-data
     ▼
FastAPI (app/main.py)
     │
     ▼
ClarityModel (app/model.py)
  ├─ AutoProcessor  (MedGemma tokenizer + image processor)
  ├─ AutoModelForImageTextToText  (google/medgemma-4b-it)
  ├─ generate_report()        → report text
  ├─ parse_sentences()        → sentence list
  ├─ extract_attention()      → text-to-image attention tensor
  ├─ compute_raw_heatmap()    → per-sentence attention map
  └─ overlay_heatmap()        → blended PIL image
```

---

## Requirements

| Requirement | Minimum |
|---|---|
| GPU VRAM | 14 GB (bf16) · 8 GB (int8) · 4 GB (int4) |
| CUDA | 12.1+ |
| Python | 3.10+ |
| HuggingFace token | Accept [MedGemma terms](https://huggingface.co/google/medgemma-4b-it) |

---

## Quick Start

### 1. Clone & install

```bash
git clone <your-repo>
cd clarity_backend

# Install PyTorch for your CUDA version first
pip install torch --index-url https://download.pytorch.org/whl/cu121

# Install all other deps
pip install -r requirements.txt
```

### 2. Set your HuggingFace token

```bash
export HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Run the server

```bash
python run.py
# Server starts at http://localhost:8000
```

---

## API Reference

### `GET /health`

Liveness probe.

```json
{ "status": "ok", "timestamp": "2025-01-01T00:00:00" }
```

---

### `POST /analyze`

**Content-Type:** `multipart/form-data`

| Field | Type | Default | Description |
|---|---|---|---|
| `file` | file | — | PNG/JPEG chest X-ray (required) |
| `max_new_tokens` | int | 400 | Max tokens for report generation |
| `n_layers_from_end` | int | 6 | Decoder layers used for attention |
| `attn_sigma` | float | 1.5 | Gaussian smoothing σ |
| `overlay_alpha` | float | 0.50 | Heatmap opacity (0=transparent, 1=opaque) |
| `heatmap_cmap` | str | "jet" | Matplotlib colormap name |

**Response (JSON):**

```json
{
  "report": "The lung fields are clear bilaterally...",
  "sentences": ["sentence 1", "sentence 2", "..."],
  "sentence_results": [
    {
      "index": 0,
      "sentence": "The lung fields are clear bilaterally.",
      "overlay_image_b64": "<base64 PNG — heatmap blended over X-ray>",
      "attention_map_b64": "<base64 PNG — raw attention map>"
    }
  ],
  "grid_image_b64": "<base64 PNG — multi-panel grid of all heatmaps>",
  "manifest": {
    "clarity_version": "1.0",
    "timestamp": "...",
    "model": "google/medgemma-4b-it",
    "report": "...",
    "sentences": ["..."],
    "..."
  }
}
```

---

## Frontend Integration

### JavaScript / fetch

```javascript
async function analyzeCXR(file) {
  const form = new FormData();
  form.append("file", file);
  // Optional overrides:
  form.append("max_new_tokens", "400");
  form.append("overlay_alpha", "0.5");

  const res = await fetch("http://localhost:8000/analyze", {
    method: "POST",
    body: form,
  });

  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();

  // Display the report
  console.log(data.report);

  // Display the grid image
  const gridImg = document.getElementById("grid");
  gridImg.src = `data:image/png;base64,${data.grid_image_b64}`;

  // Display per-sentence overlays
  data.sentence_results.forEach((s) => {
    const img = new Image();
    img.src = `data:image/png;base64,${s.overlay_image_b64}`;
    img.title = s.sentence;
    document.body.appendChild(img);
  });
}
```

### Python / requests

```python
import requests, base64
from PIL import Image
from io import BytesIO

with open("cxr.png", "rb") as f:
    resp = requests.post(
        "http://localhost:8000/analyze",
        files={"file": ("cxr.png", f, "image/png")},
        data={"max_new_tokens": 400, "overlay_alpha": 0.5},
    )

data = resp.json()
print(data["report"])

# Save the grid image
grid_bytes = base64.b64decode(data["grid_image_b64"])
Image.open(BytesIO(grid_bytes)).save("clarity_grid.png")
```

### curl

```bash
curl -X POST http://localhost:8000/analyze \
  -F "file=@/path/to/cxr.png;type=image/png" \
  -F "max_new_tokens=400" \
  | python -c "import sys,json,base64; d=json.load(sys.stdin); \
    open('grid.png','wb').write(base64.b64decode(d['grid_image_b64']))"
```

---

## Docker

```bash
# Build
docker build -t clarity-api .

# Run (with GPU + HF token + persistent model cache)
docker run --gpus all \
  -e HF_TOKEN=hf_xxxxx \
  -v $(pwd)/hf_cache:/cache \
  -p 8000:8000 \
  clarity-api
```

---

## Quantization Options

Set `QUANT_MODE` in `app/model.py` or override via environment variable:

| Mode | VRAM | Quality |
|---|---|---|
| `bf16` (default) | ~14 GB | Best |
| `int8` | ~8 GB | Good |
| `int4` | ~4 GB | Reduced |

---

## Known Limitations

- **Attention ≠ Attribution** — attention reflects where the model looked, not causal attribution.
- **GPU required** — no CPU fallback (model is too large).
- **First request is slow** — model loads on first call (~1–2 min). Subsequent requests use the cached singleton.
- **Memory** — the full attention extraction pass is tight on 16 GB GPUs. Use `int4` if OOM.