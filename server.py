#!/usr/bin/env python3
"""
MediSync backend entrypoint for deployment (e.g. supervisor looking for server.py).
Runs the FastAPI app from api.main. Usage: python server.py
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=int(__import__("os").environ.get("PORT", 8000)),
        reload=False,
    )
