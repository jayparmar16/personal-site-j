# launch.ps1 — Launch the Claude Code session with Qwen.
#
# Inside the session, use slash commands:
#   /project:plan <request>   → Plans a task (calls plan.py via Ollama API)
#   /project:code             → Executes the task spec from docs/tasks/next.md

param(
    [switch]$Continue,
    [switch]$Resume
)

# Point Claude Code at the local Ollama server.
$env:ANTHROPIC_BASE_URL  = "http://localhost:11434"
$env:ANTHROPIC_AUTH_TOKEN = "ollama"
$env:OLLAMA_KEEP_ALIVE   = "-1"   # never unload the model

# Use the custom model with 96k context (built from Modelfile).
$model = "qwen3.5-9b-claude-opus-fast"

$flags = @("--model", $model)
if ($Continue) { $flags += "--continue" }
if ($Resume)   { $flags += "--resume" }

claude @flags
