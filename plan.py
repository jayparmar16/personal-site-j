import os
import sys
import json
import urllib.request
import urllib.error

# Config
OLLAMA_BASE = "http://localhost:11434"
OLLAMA_URL = f"{OLLAMA_BASE}/api/chat"
MODEL = "qwen3.5-9b-claude-opus-fast:latest"
TASK_FILE = "docs/tasks/next.md"

SYSTEM_PROMPT = """\
You are an expert technical planner. Your job is to take a user's request and break it down into a simple, high-level task spec.

RULES:
1. Keep it simple and sweet. Do not overwhelm the coder with unnecessary context or boilerplate.
2. Break the task down into clear phases of development.
3. Keep the steps within each phase high-level. A separate script will break them down into microscopic steps later.
4. Output Markdown only.

FORMAT:
# Task: [Short Title]

## Goal
[1-2 sentences]

## Phases of Development
### Phase 1: [Phase Name]
- [High-level step 1]
- [High-level step 2]

### Phase 2: [Phase Name]
- [High-level step 1]

## Success Criteria
- [Check 1]
"""

def generate_plan(request):
    # Quick context gathering - keep it simple
    context = ""
    try:
        with open("index.html", "r", encoding="utf-8") as f:
            context += f"index.html content:\n```html\n{f.read()}\n```\n"
    except Exception:
        pass

    prompt = f"USER REQUEST: {request}\n\nCURRENT CONTEXT:\n{context}"

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt}
    ]

    payload = {
        "model": MODEL,
        "messages": messages,
        "stream": True,
        "options": {"temperature": 0.3}
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(OLLAMA_URL, data=data, headers={"Content-Type": "application/json"})
    
    print(f"\n[Planner - {MODEL}] Generating granular plan...\n")
    
    full_response = ""
    try:
        with urllib.request.urlopen(req) as response:
            for line in response:
                if line:
                    chunk = json.loads(line)
                    content = chunk.get("message", {}).get("content", "")
                    # Stream the output directly to the terminal!
                    print(content, end="", flush=True)
                    full_response += content
    except urllib.error.URLError as e:
        print(f"\n[ERROR] Failed to connect to Ollama: {e}")
        sys.exit(1)
        
    print("\n\n[Planner] Saving spec to docs/tasks/next.md...")
    os.makedirs("docs/tasks", exist_ok=True)
    with open(TASK_FILE, "w", encoding="utf-8") as f:
        f.write(full_response)
    print("[Planner] Done. Please review the plan.")

if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] != "--auto":
        print("Usage: python plan.py --auto <request>")
        sys.exit(1)
    
    request = " ".join(sys.argv[2:])
    generate_plan(request)
