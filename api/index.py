"""Vercel Python Serverless Function entrypoint for EduSmart FastAPI backend."""

import os
import sys
from pathlib import Path

# Ensure backend/ is importable when deployed to Vercel serverless runtime
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("VERCEL", "1")

from app.main import app  # noqa: E402, F401
