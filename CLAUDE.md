# Agentic Coding + Research System — Operating Rules

Local multi-agent system: **Claude Code harness on local Ollama models**. The main agent (orchestrator) runs on `qwen3-coder:30b`; subagents run on `qwen3.5:4b` (optional mid-tier `qwen3.5:9b`). Read this file fully — it is the shared contract every agent follows.

## Roles
- **Orchestrator = `Qwen3.5-9B-DeepSeek-V4-Flash` (256k context):** plans, decomposes work, integrates results, routes subagents, and makes ALL writes to shared files. Does the judgment-heavy thinking.
- **Coding/worker subagents = `deepseek-coder-v2:16b-lite` (haiku tier):** the fast, code-specialized model that implements scoped tasks and does search/summarize/test grunt work. **Validate their output** before relying on it. (`qwen3.5:4b` remains available for an optional cheaper tier.)

## Hard rules
1. **One writer per file.** No two agents may write the same file. Every task owns a disjoint set of writable files. **Shared files** (configs, `__init__.py`, route/registry tables, anything under `docs/`) are **orchestrator-only**.
2. **Writing subagents use worktree isolation** (`isolation: worktree`) so edits can't collide. Spawn them one at a time — parallel worktree creation can hit a `.git/config` lock.
3. **Write files with the Write/Edit tools only.** Never create/modify files via PowerShell `echo`/`>`/`Set-Content` (UTF-16 BOM + long-path failures).
4. **Keep ≤ 2–3 subagents.** Inference is serial on one GPU, so more agents = queue, not speed. Sequence write tasks; parallelize only read/research.

## Task decomposition (orchestrator)
1. **Read `docs/PROGRESS.md` first** to load current state.
2. Break work into small tasks; each task = one coherent unit with: **owned files**, read-only context, and an **acceptance check** (compiles / test passes / file exists).
3. Hand a subagent only its narrow spec + minimal tools. Prefer giving subagents read/analyze jobs and doing the actual code writes yourself, unless a task is cleanly isolated (then use the `implementer` agent).

## Shared state & alignment
- **`docs/PROGRESS.md`** = living ledger (orchestrator-owned, single writer). After each subagent returns, append a short entry: task, status, files changed, decisions, follow-ups.
- **`docs/decisions/NNNN-*.md`** = record significant architectural decisions.
- Inject the relevant slice of `PROGRESS.md` into each subagent prompt so it starts aligned. **State lives on disk** — it must survive context compaction.
- **`docs/where-i-left-off.md`** = your **resume card**. You (the orchestrator) are the ONLY one who can write it — subagents can't see your context. Keep it current: active goal, what's done, the exact next step, owned/open files, key decisions. **Overwrite** it at each milestone and before any `/clear` or when the session grows long. A `SessionStart` hook auto-injects it after compaction/clear/resume, but read it first thing regardless.

## Tools
- Built-in tools (Read/Write/Edit/Glob/Grep/Bash) run client-side and work on the Ollama backend.
- Web research needs the MCP search server — copy `.mcp.json.example` to `.mcp.json`, add an API key, then add the tool to the `researcher` agent's `tools:`. The built-in `WebSearch`/`WebFetch` do NOT work on local models.
- Tools are chosen by the model from their name+description. Keep subagent toolsets minimal and descriptions unambiguous (Ollama can't force a tool).

## Coding principles
- Think before coding; state assumptions; ask when unclear.
- Simplest code that solves the problem; no speculative abstractions.
- Surgical changes; match existing style; every changed line traces to the request.
- Define a success check and loop until it passes.
