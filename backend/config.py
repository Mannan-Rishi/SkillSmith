import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)

OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "").strip()
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "https://ollama.com/v1").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:31b").strip()
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))

def get_masked_key() -> str:
    if not OLLAMA_API_KEY:
        return "NOT_CONFIGURED"
    if len(OLLAMA_API_KEY) <= 8:
        return "****"
    return f"{OLLAMA_API_KEY[:4]}...{OLLAMA_API_KEY[-4:]}"

def is_key_configured() -> bool:
    return bool(OLLAMA_API_KEY and OLLAMA_API_KEY != "your_ollama_api_key_here")
