"""
TRACE FastAPI application entry point.

Minimal entry point for Milestone 1. Modules are added in later milestones.
"""

from fastapi import FastAPI

app = FastAPI(
    title="TRACE API",
    description="Tracking, Recovery, And Claim Engine — Lost & Found Management System",
    version="0.1.0",
)


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "trace-api"}


@app.get("/")
def root():
    """Root endpoint with API info."""
    return {
        "name": "TRACE API",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
    }
