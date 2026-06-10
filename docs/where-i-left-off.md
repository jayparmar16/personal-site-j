# Where I Left Off — Resume Card

> Orchestrator-owned, **overwritten** each checkpoint. Auto-injected at session start via the `SessionStart` hook. Keep it short and current.

**Active goal:** Config complete with benchmark-chosen models; first end-to-end verification pending.

**Models (two-tier):**
- **Orchestrator (main)** = `hf.co/Jackrong/Qwen3.5-9B-DeepSeek-V4-Flash-GGUF:Q4_K_M` — reasoning + 256k context (~12.5 tok/s).
- **Coding/worker subagents (haiku tier)** = `deepseek-coder-v2:16b-lite-instruct-q4_K_M` — fast coder (~24 tok/s, 160k max).
- `qwen3.5:4b` remains downloaded if a cheaper third tier is wanted.

**Ollama env:** `FLASH_ATTENTION=1`, `KV_CACHE_TYPE=q8_0`, `CONTEXT_LENGTH=262144`, `MAX_LOADED_MODELS=2`, `NUM_PARALLEL=1`.

**Next step (exact):** Launch `cd C:\dev\agentic; .\launch.ps1`, run `/model` (expect the 9B), then trigger the `implementer` subagent and confirm `ollama ps` shows `deepseek-coder-v2` loaded alongside the 9B (proves per-request tier routing).

**Owned/open files:** none in progress.

**Decisions:** `docs/decisions/0001-architecture.md`, `0002-model-selection.md`. Full history in `docs/PROGRESS.md`.

**Follow-ups:** enable web search (Brave/Tavily key → `.mcp.json`); optionally cap the coder's context lower than 160k for speed.
