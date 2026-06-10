# Canonical launcher for the local agentic system.
# Sets the connection vars in the shell BEFORE Claude Code starts (so the API
# client is redirected to Ollama reliably), then launches Claude Code.
# Model tiers and the rest of the env come from .claude/settings.json.
$env:ANTHROPIC_BASE_URL  = "http://localhost:11434"
$env:ANTHROPIC_AUTH_TOKEN = "ollama"
claude
