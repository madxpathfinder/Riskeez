#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# deploy.sh — Pull latest code and redeploy Riskeez
# Run this on the server after the initial setup.sh has already been completed.
#
# Usage:
#   sudo bash /var/www/riskeez/deploy.sh [--branch <branch>]
#
# Defaults to the currently checked-out branch.
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/var/www/riskeez"
BACKEND_DIR="${APP_DIR}/backend"
BRANCH=""

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info()    { echo -e "${CYAN}[DEPLOY]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}     $*"; }
die()     { echo -e "${RED}[ERROR]${NC}  $*" >&2; exit 1; }

[[ "$(id -u)" -ne 0 ]] && die "Run as root: sudo bash deploy.sh"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch) BRANCH="$2"; shift 2 ;;
    *) shift ;;
  esac
done

cd "$APP_DIR"

# ── 1. Pull latest code ───────────────────────────────────────────────────────
info "Pulling latest code…"
if [[ -n "$BRANCH" ]]; then
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
else
  git pull
fi
success "Code updated (branch: $(git rev-parse --abbrev-ref HEAD), commit: $(git rev-parse --short HEAD))"

# ── 2. Install dependencies ───────────────────────────────────────────────────
info "Installing root dependencies…"
npm ci --production=false --silent
success "Root dependencies ready."

info "Installing backend dependencies…"
(cd "$BACKEND_DIR" && npm ci --production=false --silent)
success "Backend dependencies ready."

# ── 3. Run any new DB migrations ─────────────────────────────────────────────
info "Applying database migrations…"
env_get() { grep -E "^${1}=" "${BACKEND_DIR}/.env" 2>/dev/null | head -1 | cut -d'=' -f2- || true; }
DB_URL=$(env_get "DATABASE_URL")
[[ -z "$DB_URL" ]] && die "DATABASE_URL not found in ${BACKEND_DIR}/.env"

for f in "${BACKEND_DIR}"/schema*.sql; do
  [[ -e "$f" ]] || continue
  info "  → $(basename "$f")"
  PGPASSWORD=$(echo "$DB_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p') \
    psql "$DB_URL" -f "$f" -q 2>&1 | grep -v "^$" | grep -v NOTICE || true
done
success "Migrations applied."

# ── 4. Build frontend ─────────────────────────────────────────────────────────
info "Building frontend…"
npm run build
success "Frontend built → ${APP_DIR}/dist"

# ── 5. Restart API ────────────────────────────────────────────────────────────
info "Restarting API…"
if pm2 list | grep -q "riskeez-api"; then
  pm2 restart riskeez-api --update-env
else
  pm2 start "${APP_DIR}/ecosystem.config.cjs"
fi
pm2 save --force
success "API restarted."

# ── 6. Reload nginx ───────────────────────────────────────────────────────────
info "Reloading nginx…"
nginx -t -q && systemctl reload nginx
success "Nginx reloaded."

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}Deploy complete!${NC}"
echo -e "  Branch : $(git rev-parse --abbrev-ref HEAD)"
echo -e "  Commit : $(git rev-parse --short HEAD)"
echo -e "  Time   : $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
pm2 list
