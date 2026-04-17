#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# MemQ MCP Server Installer
# Adds the MemQ MCP server to your AI coding tools with one command.
#
# Usage:
#   curl -fsSL https://memq.multinex.ai/install-mcp | bash
#   # or
#   ./install-mcp.sh [--api-key <key>] [--client <name>] [--dry-run]
#
# Supported clients:
#   claude-desktop, cursor, vscode, antigravity, claude-code
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── MemQ MCP Configuration ──────────────────────────────────────────────────
MEMQ_MCP_ENDPOINT="https://memq-mcp-risrqzwoka-uc.a.run.app/mcp/v1"
MEMQ_OAUTH_DISCOVERY="https://billing.multinex.ai/.well-known/oauth-authorization-server"
MEMQ_PROTECTED_RESOURCE="https://memq-mcp-risrqzwoka-uc.a.run.app/.well-known/oauth-protected-resource/mcp/v1"
MEMQ_OAUTH_SCOPE="memq.mcp"
MEMQ_SERVER_NAME="memq"

# ── Colors & Formatting ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GOLD='\033[0;33m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

# ── State ───────────────────────────────────────────────────────────────────
API_KEY=""
TARGET_CLIENT=""
DRY_RUN=false
INSTALLED=()

print_banner() {
  echo ""
  echo -e "${GOLD}╔═══════════════════════════════════════════════════════════╗${RESET}"
  echo -e "${GOLD}║${RESET}  ${BOLD}MemQ MCP Server Installer${RESET}                               ${GOLD}║${RESET}"
  echo -e "${GOLD}║${RESET}  ${DIM}Connect your AI coding tools to MemQ intelligence${RESET}        ${GOLD}║${RESET}"
  echo -e "${GOLD}╚═══════════════════════════════════════════════════════════╝${RESET}"
  echo ""
}

log_info()    { echo -e "  ${CYAN}ℹ${RESET}  $1"; }
log_success() { echo -e "  ${GREEN}✓${RESET}  $1"; }
log_warn()    { echo -e "  ${YELLOW}⚠${RESET}  $1"; }
log_error()   { echo -e "  ${RED}✗${RESET}  $1"; }
log_skip()    { echo -e "  ${DIM}─${RESET}  ${DIM}$1${RESET}"; }

# ── Argument Parsing ────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-key)  API_KEY="$2"; shift 2 ;;
    --client)   TARGET_CLIENT="$2"; shift 2 ;;
    --dry-run)  DRY_RUN=true; shift ;;
    --help|-h)
      echo "Usage: install-mcp.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --api-key <key>    Use a static API key instead of OAuth"
      echo "  --client <name>    Only install for a specific client"
      echo "                     (claude-desktop, cursor, vscode, antigravity, claude-code)"
      echo "  --dry-run          Show what would be changed without writing"
      echo "  -h, --help         Show this help"
      exit 0
      ;;
    *) log_error "Unknown option: $1"; exit 1 ;;
  esac
done

# ── JSON Manipulation ───────────────────────────────────────────────────────
# Uses python3 (available on macOS/Linux) to safely manipulate JSON
ensure_python() {
  if ! command -v python3 &>/dev/null; then
    log_error "python3 is required but not found."
    exit 1
  fi
}

json_add_mcp_server() {
  local config_file="$1"
  local server_name="$2"
  local server_json="$3"
  local servers_key="${4:-mcpServers}"

  python3 - "$config_file" "$server_name" "$server_json" "$servers_key" <<'PYEOF'
import json, sys, os

config_file = sys.argv[1]
server_name = sys.argv[2]
server_json = json.loads(sys.argv[3])
servers_key = sys.argv[4]

# Read existing config or start fresh
config = {}
if os.path.exists(config_file):
    with open(config_file, 'r') as f:
        try:
            config = json.load(f)
        except json.JSONDecodeError:
            config = {}

# Ensure the servers key exists
if servers_key not in config:
    config[servers_key] = {}

# Check if already configured
if server_name in config[servers_key]:
    existing_url = config[servers_key][server_name].get("url", "")
    if "memq" in existing_url.lower() or "multinex" in existing_url.lower():
        print("EXISTS")
        sys.exit(0)

# Add the server
config[servers_key][server_name] = server_json

# Write back
os.makedirs(os.path.dirname(config_file) or ".", exist_ok=True)
with open(config_file, 'w') as f:
    json.dump(config, f, indent=2)
    f.write('\n')

print("ADDED")
PYEOF
}

# ── Server Config Builders ──────────────────────────────────────────────────

build_oauth_config() {
  cat <<EOF
{
  "type": "http",
  "url": "${MEMQ_MCP_ENDPOINT}",
  "transport": "streamable-http",
  "auth": {
    "type": "oauth2",
    "discoveryUrl": "${MEMQ_OAUTH_DISCOVERY}",
    "scope": "${MEMQ_OAUTH_SCOPE}"
  }
}
EOF
}

build_apikey_config() {
  cat <<EOF
{
  "type": "http",
  "url": "${MEMQ_MCP_ENDPOINT}",
  "transport": "streamable-http",
  "headers": {
    "Authorization": "Bearer ${API_KEY}"
  }
}
EOF
}

build_server_config() {
  if [[ -n "$API_KEY" ]]; then
    build_apikey_config
  else
    build_oauth_config
  fi
}

# ── Client Installers ───────────────────────────────────────────────────────

install_claude_desktop() {
  local config_file="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
  local config_dir="$HOME/Library/Application Support/Claude"

  if [[ ! -d "$config_dir" ]] && [[ "$(uname)" != "Darwin" ]]; then
    # Linux path
    config_file="$HOME/.config/Claude/claude_desktop_config.json"
    config_dir="$HOME/.config/Claude"
  fi

  if [[ ! -d "$config_dir" ]]; then
    log_skip "Claude Desktop — not installed"
    return
  fi

  local server_config
  server_config=$(build_server_config)

  if $DRY_RUN; then
    log_info "Claude Desktop — would add to ${config_file}"
    echo -e "    ${DIM}$(echo "$server_config" | head -1)${RESET}"
    return
  fi

  local result
  result=$(json_add_mcp_server "$config_file" "$MEMQ_SERVER_NAME" "$server_config" "mcpServers")

  if [[ "$result" == "EXISTS" ]]; then
    log_warn "Claude Desktop — MemQ already configured"
  else
    log_success "Claude Desktop — ${GREEN}configured${RESET}"
    INSTALLED+=("Claude Desktop")
  fi
}

install_cursor() {
  local config_file="$HOME/.cursor/mcp.json"

  if [[ ! -d "$HOME/.cursor" ]]; then
    log_skip "Cursor — not installed"
    return
  fi

  local server_config
  server_config=$(build_server_config)

  if $DRY_RUN; then
    log_info "Cursor — would add to ${config_file}"
    return
  fi

  local result
  result=$(json_add_mcp_server "$config_file" "$MEMQ_SERVER_NAME" "$server_config" "mcpServers")

  if [[ "$result" == "EXISTS" ]]; then
    log_warn "Cursor — MemQ already configured"
  else
    log_success "Cursor — ${GREEN}configured${RESET}"
    INSTALLED+=("Cursor")
  fi
}

install_vscode() {
  local config_file="$HOME/.vscode/mcp.json"
  local settings_dir

  if [[ "$(uname)" == "Darwin" ]]; then
    settings_dir="$HOME/Library/Application Support/Code/User"
  else
    settings_dir="$HOME/.config/Code/User"
  fi

  if [[ ! -d "$settings_dir" ]] && [[ ! -d "$HOME/.vscode" ]]; then
    log_skip "VS Code — not installed"
    return
  fi

  # VS Code uses "servers" inside mcp.json, not "mcpServers"
  local server_config
  server_config=$(build_server_config)

  if $DRY_RUN; then
    log_info "VS Code — would add to ${config_file}"
    return
  fi

  local result
  result=$(json_add_mcp_server "$config_file" "$MEMQ_SERVER_NAME" "$server_config" "servers")

  if [[ "$result" == "EXISTS" ]]; then
    log_warn "VS Code — MemQ already configured"
  else
    log_success "VS Code — ${GREEN}configured${RESET}"
    INSTALLED+=("VS Code")
  fi
}

install_antigravity() {
  local config_file="$HOME/.gemini/settings.json"

  if [[ ! -d "$HOME/.gemini" ]]; then
    log_skip "Antigravity — not installed"
    return
  fi

  local server_config
  server_config=$(build_server_config)

  if $DRY_RUN; then
    log_info "Antigravity — would add to ${config_file}"
    return
  fi

  local result
  result=$(json_add_mcp_server "$config_file" "$MEMQ_SERVER_NAME" "$server_config" "mcpServers")

  if [[ "$result" == "EXISTS" ]]; then
    log_warn "Antigravity — MemQ already configured"
  else
    log_success "Antigravity — ${GREEN}configured${RESET}"
    INSTALLED+=("Antigravity")
  fi
}

install_claude_code() {
  if ! command -v claude &>/dev/null; then
    log_skip "Claude Code CLI — not installed"
    return
  fi

  if $DRY_RUN; then
    log_info "Claude Code — would run: claude mcp add ${MEMQ_SERVER_NAME} ..."
    return
  fi

  if [[ -n "$API_KEY" ]]; then
    claude mcp add "$MEMQ_SERVER_NAME" \
      --transport http \
      "${MEMQ_MCP_ENDPOINT}" \
      --header "Authorization: Bearer ${API_KEY}" 2>/dev/null && {
      log_success "Claude Code CLI — ${GREEN}configured${RESET}"
      INSTALLED+=("Claude Code")
    } || log_error "Claude Code CLI — failed to add"
  else
    claude mcp add "$MEMQ_SERVER_NAME" \
      --transport http \
      "${MEMQ_MCP_ENDPOINT}" 2>/dev/null && {
      log_success "Claude Code CLI — ${GREEN}configured (OAuth requires manual approval)${RESET}"
      INSTALLED+=("Claude Code")
    } || log_error "Claude Code CLI — failed to add"
  fi
}

# ── Project-Level Config (.mcp.json) ────────────────────────────────────────

install_project_local() {
  local config_file=".mcp.json"

  if [[ ! -f "package.json" ]] && [[ ! -f "deno.json" ]] && [[ ! -d ".git" ]]; then
    return
  fi

  local server_config
  server_config=$(build_server_config)

  if $DRY_RUN; then
    log_info "Project (.mcp.json) — would create in current directory"
    return
  fi

  local result
  result=$(json_add_mcp_server "$config_file" "$MEMQ_SERVER_NAME" "$server_config" "mcpServers")

  if [[ "$result" == "EXISTS" ]]; then
    log_warn "Project .mcp.json — MemQ already configured"
  else
    log_success "Project .mcp.json — ${GREEN}configured${RESET}"
    INSTALLED+=("Project (.mcp.json)")
  fi
}

# ── Summary ─────────────────────────────────────────────────────────────────

print_summary() {
  echo ""
  if [[ ${#INSTALLED[@]} -eq 0 ]]; then
    echo -e "  ${DIM}No new installations. MemQ MCP may already be configured.${RESET}"
  else
    echo -e "  ${GREEN}${BOLD}${#INSTALLED[@]} client(s) configured:${RESET}"
    for client in "${INSTALLED[@]}"; do
      echo -e "    ${GREEN}•${RESET} ${client}"
    done
  fi

  echo ""
  echo -e "  ${BOLD}Next steps:${RESET}"
  if [[ -z "$API_KEY" ]]; then
    echo -e "    1. Open your AI tool and start a new session"
    echo -e "    2. The OAuth browser flow will prompt you to sign in"
    echo -e "    3. Approve the ${CYAN}${MEMQ_OAUTH_SCOPE}${RESET} scope"
    echo -e "    4. Start using MemQ tools in your conversations"
  else
    echo -e "    1. Restart your AI tool to pick up the new config"
    echo -e "    2. Start using MemQ tools in your conversations"
  fi

  echo ""
  echo -e "  ${DIM}MCP Endpoint:  ${MEMQ_MCP_ENDPOINT}${RESET}"
  if [[ -n "$API_KEY" ]]; then
    echo -e "  ${DIM}Auth:          API Key (${API_KEY:0:12}...)${RESET}"
  else
    echo -e "  ${DIM}Auth:          OAuth 2.0 (${MEMQ_OAUTH_DISCOVERY})${RESET}"
  fi
  echo ""
}

# ── Main ────────────────────────────────────────────────────────────────────

main() {
  print_banner
  ensure_python

  if [[ -n "$API_KEY" ]]; then
    log_info "Auth mode: ${BOLD}API Key${RESET}"
  else
    log_info "Auth mode: ${BOLD}OAuth 2.0${RESET} (browser login required on first use)"
  fi
  echo ""

  if [[ -n "$TARGET_CLIENT" ]]; then
    case "$TARGET_CLIENT" in
      claude-desktop)  install_claude_desktop ;;
      cursor)          install_cursor ;;
      vscode)          install_vscode ;;
      antigravity)     install_antigravity ;;
      claude-code)     install_claude_code ;;
      project)         install_project_local ;;
      *)
        log_error "Unknown client: $TARGET_CLIENT"
        log_info "Available: claude-desktop, cursor, vscode, antigravity, claude-code, project"
        exit 1
        ;;
    esac
  else
    # Auto-detect and install for all available clients
    log_info "Scanning for installed AI tools..."
    echo ""
    install_claude_desktop
    install_cursor
    install_vscode
    install_antigravity
    install_claude_code
  fi

  print_summary
}

main
