#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# package.sh — Create a deployment-ready zip of the Riskeez/AsanRisk platform
#
# Usage:
#   chmod +x package.sh
#   ./package.sh
#
# Output:
#   dist/<AppName>-deploy.zip
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
info()    { echo -e "${BOLD}[PKG]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
die()     { echo -e "${RED}[ERR]${NC}  $*" >&2; exit 1; }

# ── Determine app name ────────────────────────────────────────────────────────
APP_NAME=""

# 1. Try reading APP_NAME from backend/.env
if [[ -f "backend/.env" ]]; then
  APP_NAME=$(grep -E '^APP_NAME=' backend/.env | cut -d= -f2- | tr -d '"' | xargs 2>/dev/null || true)
fi

# 2. Try the database if psql is available
if [[ -z "$APP_NAME" ]] && command -v psql &>/dev/null && [[ -f "backend/.env" ]]; then
  DB_URL=$(grep -E '^DATABASE_URL=' backend/.env | cut -d= -f2- | xargs 2>/dev/null || true)
  if [[ -n "$DB_URL" ]]; then
    APP_NAME=$(psql "$DB_URL" -t -c "SELECT app_name FROM organizations LIMIT 1" 2>/dev/null | xargs 2>/dev/null || true)
  fi
fi

# 3. Fall back to "AsanRisk"
APP_NAME="${APP_NAME:-AsanRisk}"

# Sanitise name for use in filenames: remove spaces, special chars
SAFE_NAME=$(echo "$APP_NAME" | tr ' ' '-' | tr -cd '[:alnum:]-_')
ZIP_NAME="${SAFE_NAME}-deploy.zip"
OUT_DIR="dist"
OUT_ZIP="${OUT_DIR}/${ZIP_NAME}"

info "App name : ${BOLD}${APP_NAME}${NC}"
info "Output   : ${BOLD}${OUT_ZIP}${NC}"

# ── Preflight checks ──────────────────────────────────────────────────────────
REQUIRED_FILES=(
  "setup.sh"
  "README.md"
  "ecosystem.config.cjs"
  "nginx.riskeez.conf"
  "backend/server.ts"
  "backend/package.json"
  "package.json"
  "vite.config.ts"
  "src/App.tsx"
)

info "Checking required files…"
for f in "${REQUIRED_FILES[@]}"; do
  if [[ ! -e "$f" ]]; then
    die "Required file missing: ${f}"
  fi
done
success "All required files present."

# ── Build frontend ─────────────────────────────────────────────────────────────
info "Building frontend…"
if command -v npm &>/dev/null; then
  npm run build 2>&1 | tail -5
  success "Frontend built."
else
  warn "npm not found — skipping frontend build. Include a pre-built dist/ folder."
fi

# ── Prepare output dir ────────────────────────────────────────────────────────
mkdir -p "$OUT_DIR"
rm -f "$OUT_ZIP"

# ── Create zip ────────────────────────────────────────────────────────────────
info "Creating deployment zip…"

# Files/dirs to include — listed explicitly to avoid surprises
INCLUDE=(
  "src/"
  "public/"
  "dist/"
  "backend/src/"
  "backend/server.ts"
  "backend/package.json"
  "backend/package-lock.json"
  "backend/*.sql"
  "backend/.env.example"
  "package.json"
  "package-lock.json"
  "vite.config.ts"
  "tsconfig.json"
  "index.html"
  "ecosystem.config.cjs"
  "nginx.riskeez.conf"
  "setup.sh"
  "README.md"
)

# Build the zip — use zip -r with explicit exclusions
zip -r "$OUT_ZIP" \
  src/ \
  backend/src/ \
  backend/server.ts \
  backend/package.json \
  public/ \
  dist/ \
  package.json \
  vite.config.ts \
  index.html \
  ecosystem.config.cjs \
  nginx.riskeez.conf \
  setup.sh \
  README.md \
  -x "*/node_modules/*" \
  -x "*/.git/*" \
  -x "*/logs/*" \
  -x "*/.env" \
  -x "*/__pycache__/*" \
  -x "*/.DS_Store" \
  -x "*/dist/APP_NAME-deploy.zip" \
  2>/dev/null

# Add backend sql patches and env example if present
for f in backend/*.sql; do
  [[ -e "$f" ]] && zip -g "$OUT_ZIP" "$f" 2>/dev/null || true
done

for f in backend/.env.example backend/package-lock.json tsconfig.json; do
  [[ -e "$f" ]] && zip -g "$OUT_ZIP" "$f" 2>/dev/null || true
done

# Make sure setup.sh is marked executable inside the zip
# (zip preserves permissions, but set it explicitly)
chmod +x setup.sh

# ── Summary ───────────────────────────────────────────────────────────────────
ZIP_SIZE=$(du -sh "$OUT_ZIP" | cut -f1)
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║  Deployment zip created successfully         ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  File : ${BOLD}${OUT_ZIP}${NC}"
echo -e "  Size : ${BOLD}${ZIP_SIZE}${NC}"
echo ""
echo -e "  To deploy on another server:"
echo -e "    ${BOLD}scp ${OUT_ZIP} user@server:/tmp/${NC}"
echo -e "    ${BOLD}ssh user@server${NC}"
echo -e "    ${BOLD}cd /tmp && unzip ${ZIP_NAME} -d /var/www/riskeez${NC}"
echo -e "    ${BOLD}cd /var/www/riskeez && chmod +x setup.sh && sudo ./setup.sh${NC}"
echo ""
