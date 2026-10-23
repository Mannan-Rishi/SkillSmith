import sys
from pathlib import Path
# Add the project root to sys.path so that backend modules can be imported
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

# Import the FastAPI app defined in backend/main.py
from backend.main import app  # noqa: F401

# Vercel expects a variable named 'app' for the Python serverless function
