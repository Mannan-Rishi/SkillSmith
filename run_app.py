import uvicorn
import os
import sys
from pathlib import Path
from backend.config import HOST, PORT, OLLAMA_MODEL, OLLAMA_BASE_URL, get_masked_key, is_key_configured

def main():
    print("=" * 70)
    print("          SKILLSMITH AI — AUTONOMOUS SKILL STUDIO")
    print("      Gemma-Powered Universal Skill Creation (Ollama Cloud)")
    print("=" * 70)
    print(f"[*] Provider:          Ollama Cloud ({OLLAMA_BASE_URL})")
    print(f"[*] Gemma Model:       {OLLAMA_MODEL}")
    print(f"[*] API Key Status:    {'CONFIGURED (' + get_masked_key() + ')' if is_key_configured() else 'NOT CONFIGURED'}")
    print(f"[*] Server Starting:   http://{HOST}:{PORT}")
    print("=" * 70)
    print("\n[!] Open your browser at: http://localhost:8000\n")

    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=True)

if __name__ == "__main__":
    main()
