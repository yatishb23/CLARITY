# ── CLARITY Backend — Dockerfile ─────────────────────────────────────────────
# Base image with CUDA 12.1 + Python 3.11
FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 python3.11-dev python3-pip \
    libgl1-mesa-glx libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN ln -s /usr/bin/python3.11 /usr/bin/python

WORKDIR /app

# PyTorch (CUDA 12.1 wheel)
RUN pip install --no-cache-dir \
    torch==2.3.0 --index-url https://download.pytorch.org/whl/cu121

# App dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY app/ ./app/
COPY run.py .

# HuggingFace token (pass at runtime: -e HF_TOKEN=hf_xxx)
# HuggingFace cache dir (mount a volume here to avoid re-downloading)
ENV HF_HOME=/cache/huggingface
VOLUME ["/cache"]

EXPOSE 8000

CMD ["python", "run.py"]