import json
import re
import httpx
from typing import Dict, Any, Optional
from backend.config import OLLAMA_API_KEY, OLLAMA_BASE_URL, OLLAMA_MODEL, is_key_configured, get_masked_key

class GemmaClientError(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None, details: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details

async def verify_gemma_connection() -> Dict[str, Any]:
    """Test Ollama Cloud Gemma connectivity and return status without revealing the API key."""
    if not is_key_configured():
        return {
            "status": "unconfigured",
            "provider": "Ollama Cloud",
            "model": OLLAMA_MODEL,
            "base_url": OLLAMA_BASE_URL,
            "key_masked": get_masked_key(),
            "message": "OLLAMA_API_KEY is not configured in backend .env file. Please add your key."
        }
    
    url = f"{OLLAMA_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {OLLAMA_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "user", "content": "Respond with single word: OK"}
        ],
        "temperature": 0.1,
        "max_tokens": 10
    }
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"].strip()
                return {
                    "status": "connected",
                    "provider": "Ollama Cloud",
                    "model": OLLAMA_MODEL,
                    "base_url": OLLAMA_BASE_URL,
                    "key_masked": get_masked_key(),
                    "response": content,
                    "message": f"Successfully connected to Gemma ({OLLAMA_MODEL}) via Ollama Cloud ({OLLAMA_BASE_URL})"
                }
            elif resp.status_code == 401:
                return {
                    "status": "auth_error",
                    "provider": "Ollama Cloud",
                    "model": OLLAMA_MODEL,
                    "base_url": OLLAMA_BASE_URL,
                    "key_masked": get_masked_key(),
                    "status_code": 401,
                    "message": "Authentication failed (401 Unauthorized) with Ollama Cloud. Check OLLAMA_API_KEY in .env."
                }
            else:
                return {
                    "status": "error",
                    "provider": "Ollama Cloud",
                    "model": OLLAMA_MODEL,
                    "base_url": OLLAMA_BASE_URL,
                    "key_masked": get_masked_key(),
                    "status_code": resp.status_code,
                    "message": f"Ollama Cloud returned HTTP {resp.status_code}: {resp.text[:200]}"
                }
    except Exception as e:
        return {
            "status": "connection_failed",
            "provider": "Ollama Cloud",
            "model": OLLAMA_MODEL,
            "base_url": OLLAMA_BASE_URL,
            "key_masked": get_masked_key(),
            "message": f"Failed to connect to Ollama Cloud: {str(e)}"
        }

async def call_gemma(prompt: str, system_prompt: Optional[str] = None, json_mode: bool = False, temperature: float = 0.2) -> str:
    """Invoke Gemma model via Ollama Cloud OpenAI-compatible endpoint."""
    if not is_key_configured():
        raise GemmaClientError("OLLAMA_API_KEY is not set in backend .env. Please configure it to execute AI tasks.")

    url = f"{OLLAMA_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {OLLAMA_API_KEY}",
        "Content-Type": "application/json"
    }
    
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 3000
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code != 200:
                err_text = resp.text[:300]
                raise GemmaClientError(
                    f"Ollama Cloud request failed with status {resp.status_code}: {err_text}",
                    status_code=resp.status_code,
                    details=err_text
                )
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    except httpx.RequestError as e:
        raise GemmaClientError(f"Network error connecting to Ollama Cloud: {str(e)}")

def repair_json_escapes(s: str) -> str:
    """
    Scans a JSON string and ensures all backslashes inside JSON string literals
    are either valid JSON escapes (", \, /, b, f, n, r, t, uXXXX) or escaped as \\.
    """
    out = []
    in_string = False
    i = 0
    n = len(s)
    
    while i < n:
        c = s[i]
        if c == '"':
            # Check if quote is escaped by odd number of backslashes
            bs_count = 0
            k = i - 1
            while k >= 0 and s[k] == '\\':
                bs_count += 1
                k -= 1
            if bs_count % 2 == 0:
                in_string = not in_string
            out.append(c)
            i += 1
            continue
            
        if in_string and c == '\\':
            if i + 1 < n:
                nxt = s[i+1]
                if nxt in ('"', '\\', '/', 'b', 'f', 'n', 'r', 't'):
                    out.append(c)
                    out.append(nxt)
                    i += 2
                    continue
                elif nxt == 'u' and i + 5 < n and all(s[j] in '0123456789abcdefABCDEF' for j in range(i+2, i+6)):
                    out.append(s[i:i+6])
                    i += 6
                    continue
                else:
                    # Invalid escape like \d, \s, \+, \., \w -> escape as \\
                    out.append('\\\\')
                    i += 1
                    continue
            else:
                out.append('\\\\')
                i += 1
                continue
                
        out.append(c)
        i += 1
        
    return ''.join(out)

def extract_json_from_response(text: str) -> Dict[str, Any]:
    """Parse JSON from Gemma output, extracting code blocks and repairing invalid escapes if present."""
    text = text.strip()
    
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1:
        text = text[first_brace:last_brace + 1]

    # 1. Direct standard load
    try:
        return json.loads(text, strict=False)
    except Exception:
        pass

    # 2. Stateful character scanner repair for invalid regex backslashes
    try:
        repaired = repair_json_escapes(text)
        return json.loads(repaired, strict=False)
    except Exception as e:
        raise ValueError(f"Failed to parse JSON from model output: {e}\nRaw output: {text[:400]}")
