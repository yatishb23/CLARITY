# Clarity: Clinical Decision Support System - Project Status

This document tracks the implementation status of the core features for the **Clarity** project based on the system requirements.

## 🧠 System Overview

A system that takes an X-ray image, predicts the disease (CNN), shows why it made that prediction (heatmap), explains the reasoning in human language (LLM), and allows interactive Q&A.

---

## 🟢 Completed / In Progress

### 6. Frontend Interface (React.js / Next.js)

- [x] Basic layout and responsive 3-panel workspace setup (Image Viewer, Diagnosis, Chat).
- [x] Image upload functionality capability visually implemented.
- [x] **Image Viewer:** Feature-rich visualization with zoom controls, overlay toggles, and responsive grid for Original Image, Saliency Map, and Overlay.
- [x] **Heatmap Canvas:** Rendering logic and styling for visual overlays (XAI/Grad-CAM visualizations).
- [x] UI polish for mobile and desktop responsiveness.
- [ ] _Pending backend integration for real data populating the Chat and Diagnosis panels._

---

### 1. Radiology Image Classification (Vision Model)

- [ ] Fine-tune/Integrate **DenseNet-121** model.
- [ ] Train/Validate on **CheXpert** dataset.
- [ ] Implement detection for the 14 thoracic diseases (e.g., pneumonia, edema, effusion).
- [ ] Output generation: Predicted disease(s) and Confidence scores.

### 2. Explainable AI (XAI) using Grad-CAM

- [ ] Implement **Grad-CAM** algorithm.
- [ ] Generate heatmaps highlighting areas the model focused on.
- [ ] Ensure formatting aligns with frontend overlay requirements to help doctors validate predictions.

## 🔴 Remaining Tasks

### 3. Conversational Medical LLM Interface

- [x] Integrate an LLM (e.g., **Gemini Pro** or **LLaMA**).
- [x] Implement capabilities to explain diagnoses in natural language.
- [x] Handle conversational queries (e.g., "Why is this pneumonia?", "Show affected region").
- [x] Feed model predictions and Grad-CAM outputs into the LLM context for accurate interpretations.

### 4. Tool Calling Pipeline (LLM + Backend Integration)

- [x] Design the LLM intent detection flow.
- [x] Implement backend tool execution (e.g., triggering `get_grad_cam()` upon user request).
- [x] Structure the response pipeline so the LLM seamlessly returns the text explanation alongside the requested image/heatmap.

### 5. Backend System

- [ ] Finalize backend framework (Flask/FastAPI).
- [ ] Set up **PyTorch** and **Hugging Face Transformers** pipelines.
- [ ] Implement endpoints for CNN inference and Grad-CAM generation.
- [ ] Handle API requests and serve results predictably to the frontend components.

### 7. Deployment Setup

- [ ] Containerize services using **Docker** (`docker-compose` setup).
- [ ] Configure **Gunicorn** for the backend application server.
- [ ] Set up **NGINX** as a reverse proxy.
- [ ] Ensure the resulting system is scalable and production-ready.
