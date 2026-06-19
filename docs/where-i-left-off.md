# Where I Left Off — Resume Card

> Orchestrator-owned, **overwritten** each checkpoint. Auto-injected at session start via the `SessionStart` hook. Keep it short and current.

**Active goal:** Personal website — scaffold exists at `index.html` (777 lines). Constellation Kite Shape implementation is ready to be executed natively.

**Architecture (Hybrid Workflow):**
- **Model** = `qwen3.5-9b-claude-opus-fast`.
- We use a hybrid workflow. Use the `/plan` skill to generate task specs via the highly optimized `plan.py` script.
- For execution, rely entirely on Claude Code's native editing tools.

**Key files:**
- `CLAUDE.md` — operating rules and workflow docs.
- `docs/tasks/next.md` — current task spec.
- `index.html` — where the site is built.

**Next step:** Read `docs/tasks/next.md` and implement the Constellation Kite shape directly in `index.html` using native edit tools.
