"""
CLARITY — FastAPI Backend
Conversational LLM-Assisted Radiology Interpretation & Transparency

Endpoints:
  POST /analyze   — upload X-ray → DenseNet diagnosis + Grad-CAM + LLM report + attention heatmaps
  POST /chat      — conversational follow-up with tool-calling
  GET  /health    — liveness probe
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from app.routers import analyze, chat
from app.services.densenet_service import DenseNetService
from app.services.llm_service import LLMService

services: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[CLARITY] Loading DenseNet service ...")
    services["densenet"] = DenseNetService()
    print("[CLARITY] Loading LLM service ...")
    services["llm"] = LLMService()
    print("[CLARITY] ✓ All services ready.")
    yield
    services.clear()


app = FastAPI(
    title="CLARITY API",
    description="Explainable, conversational chest X-ray radiology AI",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.services = services

app.include_router(analyze.router)
app.include_router(chat.router)


@app.get("/health", tags=["Health"])
async def health():
    return {
        "status": "ok",
        "densenet_loaded": "densenet" in services,
        "llm_loaded": "llm" in services,
    }