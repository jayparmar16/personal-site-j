# 0002 — Model selection (benchmark-driven)

**Date:** 2026-06-09
**Status:** Accepted

## Context
Benchmarked local models on the RTX 3080 (10 GB) to pick orchestrator + coding models. Generation tok/s @ tested context:
- `deepseek-coder-v2:16b-lite` (MoE ~2.4B active): **23.7** @ 32k, max 160k context — coder-specialized.
- `Qwen3.5-9B-DeepSeek-V4-Flash` (dense 9B): **12.5** @ 256k, 256k context — reasoning distill.
- `qwen3-coder:30b` (MoE): 8.88 @ 256k — deleted (slower).
- `qwen3.6:27b` (dense): 2.4 — deleted (too slow).
- `qwen3-coder-next`: not viable (52 GB Q4 > ~42 GB total memory).

## Decision
Two-tier, each model to its strength:
- **Orchestrator** = `hf.co/Jackrong/Qwen3.5-9B-DeepSeek-V4-Flash-GGUF:Q4_K_M` — reasoning + 256k context + better tool-routing.
- **Coding/worker subagents** = `deepseek-coder-v2:16b-lite-instruct-q4_K_M` — code-specialized + ~2× faster.

Wired via Claude Code tiers: `ANTHROPIC_MODEL`/sonnet = 9B; haiku = deepseek-coder. The `implementer` agent uses `model: haiku`. `qwen3.5:4b` kept for an optional cheaper tier.

## Consequences
- Coding capped at 160k context (vs the 9B's 256k) — fine for scoped subagent tasks.
- Two ~12–15 GB models can't both sit on the 10 GB GPU at once → some GPU-layer reload on orchestrator↔coder switches (weights stay in RAM, so partial not full).
- Speed/quality not yet validated in real coding use — revisit if it disappoints.
