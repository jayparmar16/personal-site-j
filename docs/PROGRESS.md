# PROGRESS — Living Ledger

Orchestrator-owned, single writer. Newest entries at the top. One entry per completed task or subagent report:
**task → status → files changed → decisions → follow-ups**.

---

## 2026-06-09 — Model selection (benchmark-driven)
- **Status:** done
- **What:** Benchmarked candidates and wired the two-tier models. Orchestrator → `Qwen3.5-9B-DeepSeek-V4-Flash` (256k, ~12.5 tok/s); coding/worker subagents → `deepseek-coder-v2:16b-lite` (~24 tok/s, 160k). Deleted `qwen3-coder:30b` (8.88 tok/s) and `qwen3.6:27b` (2.4 tok/s); `qwen3-coder-next` rejected (52 GB, too big).
- **Files changed:** `.claude/settings.json` (model env), `.claude/agents/implementer.md` (model: haiku), `CLAUDE.md` (Roles), `docs/decisions/0002-model-selection.md`, this ledger, `docs/where-i-left-off.md`.
- **Follow-ups:** first verification run; enable web-search MCP; optionally cap coder context for speed.

## 2026-06-09 — Project scaffolding
- **Status:** done
- **What:** Initialized the local agentic system — git repo, `.claude/` (settings + example agents), `CLAUDE.md` operating rules, this ledger, `docs/decisions/0001`, `.mcp.json.example`, `launch.ps1`.
- **Models:** orchestrator `qwen3-coder:30b`; subagents `qwen3.5:4b` (mid-tier `qwen3.5:9b`).
- **Follow-ups:**
  - Finish Ollama server env config (`OLLAMA_MAX_LOADED_MODELS=2`, `OLLAMA_NUM_PARALLEL=1`, `OLLAMA_CONTEXT_LENGTH=32768`).
  - Add a Brave/Tavily key to enable web search (copy `.mcp.json.example` → `.mcp.json`).
  - First end-to-end verification run (see plan's Verification section).
