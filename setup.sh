#!/usr/bin/env bash
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
DIM='\033[2m'
RESET='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="$HOME/.local/bin"
BIN_FILE="$BIN_DIR/arc"

echo -e "${BOLD}Arc CLI Setup${RESET}"
echo ""

# 1. Install dependencies
echo -e "${DIM}Installing dependencies...${RESET}"
npm install --prefix "$PROJECT_DIR" > /dev/null 2>&1
echo -e "${GREEN}Dependencies installed${RESET}"

# 2. Build
echo -e "${DIM}Building project...${RESET}"
npm run build --prefix "$PROJECT_DIR" > /dev/null 2>&1
echo -e "${GREEN}Build complete${RESET}"

# 3. Create ~/.local/bin if needed
mkdir -p "$BIN_DIR"

# 4. Create wrapper script
cat > "$BIN_FILE" << EOF
#!/usr/bin/env bash
exec node --no-warnings "$PROJECT_DIR/dist/bin/arc-cli.js" "\$@"
EOF
chmod +x "$BIN_FILE"
echo -e "${GREEN}Installed 'arc' command to $BIN_FILE${RESET}"

# 5. Check PATH and add if needed
add_to_path() {
  local shell_rc="$1"
  local export_line='export PATH="$HOME/.local/bin:$PATH"'

  if [ -f "$shell_rc" ] && grep -qF '.local/bin' "$shell_rc"; then
    return 1
  fi

  echo "" >> "$shell_rc"
  echo "# Arc CLI" >> "$shell_rc"
  echo "$export_line" >> "$shell_rc"
  return 0
}

if [[ ":$PATH:" == *":$HOME/.local/bin:"* ]]; then
  echo -e "${GREEN}PATH already includes ~/.local/bin${RESET}"
else
  ADDED=false
  SHELL_RC=""

  if [ -n "$ZSH_VERSION" ] || [ "$SHELL" = "$(which zsh)" ]; then
    SHELL_RC="$HOME/.zshrc"
  elif [ -n "$BASH_VERSION" ] || [ "$SHELL" = "$(which bash)" ]; then
    SHELL_RC="$HOME/.bashrc"
  fi

  if [ -n "$SHELL_RC" ]; then
    if add_to_path "$SHELL_RC"; then
      ADDED=true
      echo -e "${YELLOW}Added ~/.local/bin to PATH in $(basename "$SHELL_RC")${RESET}"
    else
      ADDED=true
      echo -e "${DIM}~/.local/bin already configured in $(basename "$SHELL_RC")${RESET}"
    fi
  fi

  if [ "$ADDED" = false ]; then
    echo -e "${YELLOW}Could not detect shell config. Add this manually:${RESET}"
    echo -e '  export PATH="$HOME/.local/bin:$PATH"'
  fi
fi

# Done
echo ""
echo -e "${BOLD}${GREEN}Setup complete!${RESET}"
echo ""

if [[ ":$PATH:" == *":$HOME/.local/bin:"* ]]; then
  echo -e "  Run: ${BOLD}arc --help${RESET}"
else
  echo -e "  Run: ${BOLD}source ~/${SHELL_RC##*/}${RESET}  (one time only)"
  echo -e "  Then: ${BOLD}arc --help${RESET}"
fi
echo ""
