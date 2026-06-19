# Hybrid Claude Code Operating Rules

This project runs a hybrid environment. We use a custom Python script to plan tasks (`plan.py`) via the `/plan` skill, and native Claude Code tools for execution.

## Architecture

- **Model:** `qwen3.5-9b-claude-opus-fast`
- **Planning:** Handled via `/plan` which delegates to a specialized Python script to keep the 9B model focused and granular.
- **Execution:** Fully relies on Claude Code's native file reading, bash execution, and search/replace tools.

## The Three-Stage Workflow (CRITICAL)

You must ALWAYS operate in a strict three-stage workflow to prevent unapproved code execution.

### Stage 1: Planning Mode
When given a new task by the user, you must trigger the `/plan` skill.
1. The `/plan` skill will run `python plan.py` which generates a high-level spec in `docs/tasks/next.md`.
2. Wait for it to finish and read the plan.
3. **STOP.** Do not edit code. Tell the user to run `/breakdown`.

### Stage 2: Breakdown Mode
When the user asks to breakdown the plan, you must trigger the `/breakdown` skill.
1. The `/breakdown` skill will run `python breakdown.py` which expands `next.md` into `phase-1.md`, `phase-2.md`, etc.
2. Wait for it to finish and list the generated files.
3. **STOP.** Do not edit code. Ask the user which phase to execute.

### Stage 3: Execution Mode
You are only in **Execution Mode** if the user explicitly asks you to execute a specific phase file (e.g., "Execute phase-1.md").
1. Read the specific `phase-X.md` file.
2. ONLY execute the specific steps in that file.
3. Use your native search/replace tools to execute the steps surgically.
4. Verify the work.
5. Update `docs/PROGRESS.md` with the completed task once all phases are done.

## State management

- **`docs/PROGRESS.md`** — Living ledger. One entry per completed task. Update this after Phase 2 finishes.
- **`docs/where-i-left-off.md`** — Resume card. Overwrite at each milestone. This injects context into the start of new sessions.
- **`docs/tasks/next.md`** — The living task spec you write during Phase 1.

## Coding principles
- Simplest code that solves the problem; no speculative abstractions.
- Surgical changes using native edit tools.
- Define a success check and loop until it passes.
