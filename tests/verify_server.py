import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import urllib.request
import json
import threading
import time
import uvicorn
from backend.main import app

def run():
    t = threading.Thread(target=uvicorn.run, args=(app,), kwargs={"host": "127.0.0.1", "port": 8000, "log_level": "error"}, daemon=True)
    t.start()
    time.sleep(2)

    with urllib.request.urlopen("http://127.0.0.1:8000/api/health") as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print("[+] Health Status:", resp.status)
        print("[+] Provider:", data.get("provider"))
        print("[+] Configured Model:", data.get("model"))
        print("[+] Masked Key:", data.get("key_masked"))
        print("[+] Provider Endpoint:", data.get("provider_endpoint"))

    with urllib.request.urlopen("http://127.0.0.1:8000/api/model/verify") as resp:
        verify = json.loads(resp.read().decode("utf-8"))
        print("[+] Live Model Verification Status:", verify.get("status"))
        print("[+] Live Verification Message:", verify.get("message"))
        print("[+] Live Verification Result:", "PASS" if verify.get("status") == "connected" else "FAIL")

    with urllib.request.urlopen("http://127.0.0.1:8000/api/skills") as resp:
        skills = json.loads(resp.read().decode("utf-8"))
        print("[+] Loaded Skills Count:", len(skills))
        for s in skills:
            print(f"    - {s['name']} (v{s['current_version']}, {len(s['test_cases'])} tests)")

    with urllib.request.urlopen("http://127.0.0.1:8000/") as resp:
        html = resp.read().decode("utf-8")
        print("[+] Production Frontend HTML Status: 200 OK, root div present:", 'id="root"' in html)

if __name__ == "__main__":
    run()
