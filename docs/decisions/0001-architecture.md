# 0001 — Architecture: Claude Code on Ollama, two-tier models

**Date:** 2026-06-09
**Status:** Accepted

## Context
Local/offline agentic coding + research on an RTX 3080 (10 GB VRAM, ~30 GB combined) using Claude Code as the harness over local Ollama models.

## Decision
- Run Claude Code natively against Ollama's Anthropic-compatible endpoint (`http://localhost:11434`) using manual model env-vars — **no proxy**.
- **Two tiers:** orchestrator = `qwen3-coder:30b` (`ANTHROPIC_MODEL`); subagents = `qwen3.5:4b` (`ANTHROPIC_DEFAULT_HAIKU_MODEL`); optional `qwen3.5:9b` (`ANTHROPIC_DEFAULT_OPUS_MODEL`).
- Keep both models resident (`OLLAMA_MAX_LOADED_MODELS=2`) to avoid 19 GB reload thrash on tier switches.
- Enforce one-writer-per-file via orchestrator ownership + `isolation: worktree` subagents.
- Durable state in `docs/PROGRESS.md` (orchestrator single-writer).

## Consequences
- 4B subagents are cheap but weaker → narrow, validated jobs only.
- Single GPU serializes inference → subagents reduce per-task cost, not wall-clock.
- Web search requires an MCP server; built-in `WebSearch`/`WebFetch` won't work locally.
- `ollama launch` is not used (it hard-codes one model); we set env-vars manually instead.
