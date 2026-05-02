"""
Entry point — run with:

    python run.py

Or directly with uvicorn:

    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,     # set True during development (reloads on file save)
        log_level="info",
    )