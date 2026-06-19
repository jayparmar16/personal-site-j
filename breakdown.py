import os
import sys
import json
import urllib.request
import urllib.error
import re

# Config
OLLAMA_BASE = "http://localhost:11434"
OLLAMA_URL = f"{OLLAMA_BASE}/api/chat"
MODEL = "qwen3.5-9b-claude-opus-fast:latest"
NEXT_FILE = "docs/tasks/next.md"

SYSTEM_PROMPT = """\
You are an expert technical planner. Your job is to take a high-level Phase from a project plan and break it down into explicit, microscopic, file-level steps.

RULES:
1. Break the phase down into explicitly numbered Steps (e.g., Step 1.1, Step 1.2).
2. Each Step must be a tiny, single-file action. This prevents the execution agent from running out of memory.
3. Keep the output incredibly concise. Output Markdown only.

FORMAT:
# [Phase Name] Detailed Breakdown

**Step 1:** [Action description]
- Target file: `path/to/file`
- Changes: [Exact lines to add/modify]

**Step 2:** [Action description]
- Target file: `path/to/file`
- Changes: [Exact lines to add/modify]
"""

def extract_phases(content):
    phases = []
    # Simple regex to find "### Phase X: [Name]" followed by its content
    pattern = re.compile(r'(### Phase \d+:.*?)(?=### Phase \d+:|\Z)', re.DOTALL)
    matches = pattern.findall(content)
    for i, match in enumerate(matches):
        phases.append((i + 1, match.strip()))
    return phases

def generate_breakdown():
    if not os.path.exists(NEXT_FILE):
        print(f"[ERROR] {NEXT_FILE} not found. Run /plan first.")
        sys.exit(1)
        
    with open(NEXT_FILE, "r", encoding="utf-8") as f:
        content = f.read()
        
    phases = extract_phases(content)
    if not phases:
        print("[ERROR] No phases found in next.md. Ensure they start with '### Phase X:'")
        sys.exit(1)
        
    print(f"\n[Breakdown - {MODEL}] Found {len(phases)} phases. Expanding them into granular steps...\n")
    
    # Read context if available
    context = ""
    try:
        if os.path.exists("index.html"):
            with open("index.html", "r", encoding="utf-8") as f:
                context += f"index.html content:\n```html\n{f.read()}\n```\n"
    except Exception:
        pass

    os.makedirs("docs/tasks", exist_ok=True)
    
    for phase_num, phase_text in phases:
        print(f"\n--- Expanding Phase {phase_num} ---\n", flush=True)
        
        prompt = f"PHASE TO EXPAND:\n{phase_text}\n\nCURRENT CONTEXT:\n{context}"
        
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
        
        full_response = ""
        try:
            with urllib.request.urlopen(req) as response:
                for line in response:
                    if line:
                        chunk = json.loads(line)
                        text = chunk.get("message", {}).get("content", "")
                        print(text, end="", flush=True)
                        full_response += text
        except urllib.error.URLError as e:
            print(f"\n[ERROR] Failed to connect to Ollama: {e}")
            sys.exit(1)
            
        filename = f"docs/tasks/phase-{phase_num}.md"
        with open(filename, "w", encoding="utf-8") as f:
            f.write(full_response)
        print(f"\n\n[Saved to {filename}]")
        
    print("\n[Breakdown] Done. All phases have been expanded into dedicated files.")

if __name__ == "__main__":
    generate_breakdown()
