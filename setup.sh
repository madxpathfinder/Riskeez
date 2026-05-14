#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# GRC Platform — Automated Setup Script
# Supports Debian / Ubuntu / Kali Linux
# Safe to rerun — all operations are idempotent.
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
die()     { error "$*"; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}═══ $* ═══${NC}\n"; }

# ── Defaults ──────────────────────────────────────────────────────────────────
APP_DIR="/var/www/riskeez"
BACKEND_DIR="${APP_DIR}/backend"
ENV_FILE="${BACKEND_DIR}/.env"
NGINX_AVAIL="/etc/nginx/sites-available/riskeez"
NGINX_ENABLED="/etc/nginx/sites-enabled/riskeez"
ECOSYSTEM_FILE="${APP_DIR}/ecosystem.config.cjs"
LOGS_DIR="${APP_DIR}/logs"

ADMIN_NAME=""
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
ORG_NAME=""
APP_NAME=""
SETUP_MODE="single"
SERVER_IP=""
BACKEND_PORT="3001"
FRONTEND_PORT="80"
FORCE_CREATE_ADMIN="false"

# ── App name generation ───────────────────────────────────────────────────────
# Takes the first word of the company name, capitalises it, appends " Risk".
# e.g. "Asan Xidmət" → "Asan Risk", "Azərenerji" → "Azərenerji Risk"
generate_app_name() {
  local company="$1"
  local first_word
  first_word=$(echo "$company" | awk '{print $1}')
  # Capitalise first letter (portable approach)
  local cap
  cap="$(echo "${first_word:0:1}" | tr '[:lower:]' '[:upper:]')${first_word:1}"
  echo "${cap} Risk"
}

# ── CLI argument parsing ──────────────────────────────────────────────────────
parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --admin-name)         ADMIN_NAME="$2";       shift 2 ;;
      --admin-email)        ADMIN_EMAIL="$2";      shift 2 ;;
      --admin-password)     ADMIN_PASSWORD="$2";   shift 2 ;;
      --org-name)           ORG_NAME="$2";         shift 2 ;;
      --app-name)           APP_NAME="$2";         shift 2 ;;
      --setup-mode)         SETUP_MODE="$2";       shift 2 ;;
      --server-ip)          SERVER_IP="$2";        shift 2 ;;
      --backend-port)       BACKEND_PORT="$2";     shift 2 ;;
      --frontend-port)      FRONTEND_PORT="$2";    shift 2 ;;
      --force-create-admin) FORCE_CREATE_ADMIN="true"; shift ;;
      -h|--help)            usage; exit 0 ;;
      *) warn "Unknown argument: $1"; shift ;;
    esac
  done
}

usage() {
  cat <<EOF
${BOLD}GRC Platform — Setup Script${NC}

Usage: sudo bash setup.sh [OPTIONS]

Options:
  --admin-name        <name>          Full name of the initial admin user
  --admin-email       <email>         Email address for the initial admin user
  --admin-password    <password>      Password for the initial admin user
  --org-name          <name>          Name of the initial organisation
  --app-name          <name>          Application name (must include "Risk")
                                      Auto-generated from org name if omitted.
                                      e.g. "Asan Xidmət" → "AsanRisk"
  --setup-mode        single|enterprise  Deployment mode (default: single)
  --server-ip         <ip/hostname>   Server IP or hostname (for CORS & URLs)
  --backend-port      <port>          API port (default: 3001)
  --frontend-port     <port>          Nginx listen port (default: 80)
  --force-create-admin                Recreate admin user even if already exists

If options are omitted the interactive wizard runs instead.
EOF
}

# ── Interactive wizard ────────────────────────────────────────────────────────
interactive_wizard() {
  header "GRC Platform — Setup Wizard"
  echo "Press Enter to accept defaults where shown."
  echo ""

  if [[ -z "$ADMIN_NAME" ]]; then
    read -rp "  Admin full name: " ADMIN_NAME
  fi

  if [[ -z "$ADMIN_EMAIL" ]]; then
    while true; do
      read -rp "  Admin email address: " ADMIN_EMAIL
      if [[ "$ADMIN_EMAIL" =~ ^[^@]+@[^@]+\.[^@]+$ ]]; then break; fi
      warn "Please enter a valid email address (e.g. admin@example.com)."
    done
  fi

  if [[ -z "$ADMIN_PASSWORD" ]]; then
    while true; do
      read -rsp "  Admin password (min 8 chars): " ADMIN_PASSWORD; echo
      if [[ ${#ADMIN_PASSWORD} -ge 8 ]]; then break; fi
      warn "Password must be at least 8 characters."
    done
  fi

  if [[ -z "$ORG_NAME" ]]; then
    read -rp "  Organisation name [My Organisation]: " ORG_NAME
    ORG_NAME="${ORG_NAME:-My Organisation}"
  fi

  if [[ -z "$APP_NAME" ]]; then
    local suggested
    suggested=$(generate_app_name "$ORG_NAME")
    echo ""
    echo -e "  ${CYAN}App name suggestion:${NC} ${BOLD}${suggested}${NC}"
    echo -e "  (First word of company name + \"Risk\". Must contain \"Risk\".)"
    read -rp "  Application name [${suggested}]: " APP_NAME
    APP_NAME="${APP_NAME:-${suggested}}"
    while [[ "$APP_NAME" != *"Risk"* && "$APP_NAME" != *"risk"* ]]; do
      warn "Application name must contain 'Risk' (e.g. AsanRisk, AzərenerjiRisk)."
      read -rp "  Application name [${suggested}]: " APP_NAME
      APP_NAME="${APP_NAME:-${suggested}}"
    done
  fi

  if [[ -z "$SERVER_IP" ]]; then
    local detected_ip
    detected_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
    read -rp "  Server IP or hostname [${detected_ip:-127.0.0.1}]: " SERVER_IP
    SERVER_IP="${SERVER_IP:-${detected_ip:-127.0.0.1}}"
  fi

  read -rp "  Setup mode — single or enterprise [single]: " SETUP_MODE
  SETUP_MODE="${SETUP_MODE:-single}"

  read -rp "  Backend API port [3001]: " BACKEND_PORT
  BACKEND_PORT="${BACKEND_PORT:-3001}"

  read -rp "  Frontend (Nginx) port [80]: " FRONTEND_PORT
  FRONTEND_PORT="${FRONTEND_PORT:-80}"
}

# ── Validate required inputs ──────────────────────────────────────────────────
validate_inputs() {
  [[ -z "$ADMIN_NAME" ]]     && die "Admin name is required."
  [[ -z "$ADMIN_EMAIL" ]]    && die "Admin email is required."
  [[ "$ADMIN_EMAIL" =~ ^[^@]+@[^@]+\.[^@]+$ ]] || die "Invalid admin email: '${ADMIN_EMAIL}'. Must be a valid email address (e.g. admin@example.com)."
  [[ -z "$ADMIN_PASSWORD" ]] && die "Admin password is required."
  [[ -z "$ORG_NAME" ]]       && die "Organisation name is required."
  [[ -z "$SERVER_IP" ]]      && die "Server IP / hostname is required."
  # Auto-generate APP_NAME if not provided via --app-name flag
  if [[ -z "$APP_NAME" ]]; then
    APP_NAME=$(generate_app_name "$ORG_NAME")
    info "App name auto-generated: ${APP_NAME}"
  fi
  if [[ "$APP_NAME" != *"Risk"* && "$APP_NAME" != *"risk"* ]]; then
    die "Application name '${APP_NAME}' must contain 'Risk'."
  fi

  if [[ "$SETUP_MODE" != "single" && "$SETUP_MODE" != "enterprise" ]]; then
    die "Invalid setup mode '${SETUP_MODE}'. Must be 'single' or 'enterprise'."
  fi

  if ! [[ "$BACKEND_PORT"  =~ ^[0-9]+$ ]] || (( BACKEND_PORT  < 1 || BACKEND_PORT  > 65535 )); then
    die "Invalid backend port: ${BACKEND_PORT}"
  fi

  if ! [[ "$FRONTEND_PORT" =~ ^[0-9]+$ ]] || (( FRONTEND_PORT < 1 || FRONTEND_PORT > 65535 )); then
    die "Invalid frontend port: ${FRONTEND_PORT}"
  fi
}

# ── Detect OS ─────────────────────────────────────────────────────────────────
check_os() {
  if [[ ! -f /etc/debian_version ]]; then
    die "This script requires a Debian/Ubuntu/Kali Linux system."
  fi
  if [[ "$(id -u)" -ne 0 ]]; then
    die "This script must be run as root (use sudo)."
  fi
  success "Running on Debian-based Linux as root."
}

# ── Package installation helpers ──────────────────────────────────────────────
apt_install_if_missing() {
  local pkg="$1"
  if dpkg -s "$pkg" &>/dev/null; then
    success "${pkg} already installed."
  else
    info "Installing ${pkg}…"
    apt-get install -y "$pkg" -qq
    success "${pkg} installed."
  fi
}

install_node() {
  header "Node.js 20 LTS"
  if command -v node &>/dev/null && node -e "process.exit(parseInt(process.version.slice(1)) >= 20 ? 0 : 1)" 2>/dev/null; then
    success "Node.js $(node --version) already installed and meets version requirement."
    return
  fi

  info "Installing Node.js 20 LTS via NodeSource…"
  apt_install_if_missing curl
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs -qq
  success "Node.js $(node --version) installed."
}

install_postgresql() {
  header "PostgreSQL"
  apt_install_if_missing postgresql
  apt_install_if_missing postgresql-client

  info "Starting and enabling PostgreSQL service…"
  systemctl enable postgresql --quiet
  systemctl start  postgresql
  success "PostgreSQL service is running."
}

install_nginx() {
  header "Nginx"
  apt_install_if_missing nginx
  systemctl enable nginx --quiet
  systemctl start  nginx
  success "Nginx is running."
}

install_pm2() {
  header "PM2"
  if command -v pm2 &>/dev/null; then
    success "PM2 $(pm2 --version) already installed."
    return
  fi
  info "Installing PM2 globally…"
  npm install -g pm2 --quiet
  success "PM2 $(pm2 --version) installed."
}

# ── Random string generators ──────────────────────────────────────────────────
gen_password()   { openssl rand -base64 20 | tr -dc 'A-Za-z0-9@#%^&*' | head -c 20; }
gen_jwt_secret() { openssl rand -hex 64; }

# ── Read existing .env value (return empty string if key absent) ──────────────
env_get() {
  local key="$1"
  if [[ -f "$ENV_FILE" ]]; then
    grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d'=' -f2- || true
  fi
}

# ── Write/update backend .env ─────────────────────────────────────────────────
write_env() {
  header "Backend .env"
  mkdir -p "$BACKEND_DIR"

  # Preserve existing values; only generate what is missing.
  local existing_db_pass existing_jwt

  existing_db_pass=$(env_get "DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p' || true)
  existing_jwt=$(env_get "JWT_SECRET" || true)

  DB_PASS="${existing_db_pass:-$(gen_password)}"
  JWT_SECRET="${existing_jwt:-$(gen_jwt_secret)}"

  cat > "$ENV_FILE" <<ENVEOF
PORT=${BACKEND_PORT}
NODE_ENV=production
DATABASE_URL=postgresql://riskeez_user:${DB_PASS}@localhost:5432/riskeez
DB_SSL=false
JWT_SECRET=${JWT_SECRET}
ALLOWED_ORIGIN=http://${SERVER_IP}
APP_NAME=${APP_NAME}
ENVEOF

  chmod 600 "$ENV_FILE"
  success "Written ${ENV_FILE}"
}

# ── PostgreSQL DB + user setup ────────────────────────────────────────────────
setup_database() {
  header "PostgreSQL Database"

  # Re-read DB password from the env file we just wrote.
  DB_PASS=$(env_get "DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')

  # Create user if not exists
  if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='riskeez_user'" | grep -q 1; then
    info "PostgreSQL user 'riskeez_user' already exists. Updating password…"
    sudo -u postgres psql -c "ALTER USER riskeez_user WITH PASSWORD '${DB_PASS}';" -q
  else
    info "Creating PostgreSQL user 'riskeez_user'…"
    sudo -u postgres psql -c "CREATE USER riskeez_user WITH PASSWORD '${DB_PASS}';" -q
    success "User 'riskeez_user' created."
  fi

  # Create DB if not exists
  if sudo -u postgres psql -lqt | cut -d'|' -f1 | grep -qw riskeez; then
    success "Database 'riskeez' already exists."
  else
    info "Creating database 'riskeez'…"
    sudo -u postgres psql -c "CREATE DATABASE riskeez OWNER riskeez_user;" -q
    success "Database 'riskeez' created."
  fi

  # Grant privileges
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE riskeez TO riskeez_user;" -q
  sudo -u postgres psql -d riskeez -c "GRANT ALL ON SCHEMA public TO riskeez_user;" -q 2>/dev/null || true
  success "Privileges granted to 'riskeez_user'."
}

# ── Run schema migrations ─────────────────────────────────────────────────────
run_migrations() {
  header "Database Migrations"

  DB_PASS=$(env_get "DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')

  local schema_files=(
    "${BACKEND_DIR}/schema.sql"
    "${BACKEND_DIR}/schema-v2-patch.sql"
    "${BACKEND_DIR}/schema-v3-patch.sql"
    "${BACKEND_DIR}/schema-v4-patch.sql"
    "${BACKEND_DIR}/schema-v5-patch.sql"
    "${BACKEND_DIR}/schema-v6-patch.sql"
    "${BACKEND_DIR}/schema-v7-patch.sql"
  )

  for f in "${schema_files[@]}"; do
    if [[ -f "$f" ]]; then
      info "Running migration: $(basename "$f")…"
      PGPASSWORD="$DB_PASS" psql -h localhost -U riskeez_user -d riskeez -f "$f" -q \
        2>&1 | grep -v "^$" | grep -v "NOTICE" || true
      success "$(basename "$f") applied."
    fi
  done
}

# ── npm install + frontend build ──────────────────────────────────────────────
install_and_build() {
  header "npm Dependencies & Frontend Build"
  mkdir -p "$LOGS_DIR"

  info "Installing root dependencies…"
  (cd "$APP_DIR" && npm ci --production=false --silent)
  success "Root dependencies installed."

  info "Installing backend dependencies…"
  (cd "$BACKEND_DIR" && npm ci --production=false --silent)
  success "Backend dependencies installed."

  info "Building frontend…"
  (cd "$APP_DIR" && npm run build)
  success "Frontend build complete → ${APP_DIR}/dist"
}

# ── Create admin user ─────────────────────────────────────────────────────────
create_admin_user() {
  header "Admin User"

  DB_PASS=$(env_get "DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')

  # Check if admin already exists
  local exists
  exists=$(PGPASSWORD="$DB_PASS" psql -h localhost -U riskeez_user -d riskeez -tAc \
    "SELECT COUNT(*) FROM users WHERE email='${ADMIN_EMAIL}';" 2>/dev/null || echo "0")

  if [[ "$exists" -gt 0 && "$FORCE_CREATE_ADMIN" != "true" ]]; then
    warn "Admin user '${ADMIN_EMAIL}' already exists. Use --force-create-admin to recreate."
    return
  fi

  info "Hashing admin password…"
  local hashed_pw
  hashed_pw=$(cd "$BACKEND_DIR" && node -e "
    const b = require('bcryptjs');
    b.hash(process.argv[1], 10, (e, h) => { if(e) { process.stderr.write(e.message); process.exit(1); } process.stdout.write(h); });
  " "$ADMIN_PASSWORD") || die "Failed to hash password — is bcryptjs installed in ${BACKEND_DIR}/node_modules?"
  [[ -n "$hashed_pw" ]] || die "Password hashing returned empty result."

  local org_id="org-$(date +%s)"
  local user_id="usr-$(date +%s)-admin"
  local admin_role="Admin"

  # Create organisation (skip if already present and not forcing)
  if [[ "$exists" -gt 0 && "$FORCE_CREATE_ADMIN" == "true" ]]; then
    info "Force-recreating admin user…"
    PGPASSWORD="$DB_PASS" psql -h localhost -U riskeez_user -d riskeez -q -c \
      "DELETE FROM users WHERE email='${ADMIN_EMAIL}';"
  fi

  # Ensure at least one organisation exists; reuse existing org if present.
  local existing_org_id
  existing_org_id=$(PGPASSWORD="$DB_PASS" psql -h localhost -U riskeez_user -d riskeez -tAc \
    "SELECT id FROM organizations LIMIT 1;" 2>/dev/null | tr -d '[:space:]' || true)

  if [[ -n "$existing_org_id" ]]; then
    org_id="$existing_org_id"
    info "Reusing existing organisation id: ${org_id}"
  else
    info "Creating organisation '${ORG_NAME}' (app: ${APP_NAME})…"
    PGPASSWORD="$DB_PASS" psql -h localhost -U riskeez_user -d riskeez -q -c \
      "INSERT INTO organizations (id, name, app_name, created_at)
       VALUES ('${org_id}', '${ORG_NAME//\'/\'\'}', '${APP_NAME//\'/\'\'}', NOW())
       ON CONFLICT (id) DO NOTHING;"
    success "Organisation created (id: ${org_id})."
  fi

  info "Inserting admin user '${ADMIN_EMAIL}'…"
  PGPASSWORD="$DB_PASS" psql -h localhost -U riskeez_user -d riskeez -q -c \
    "INSERT INTO users (id, organization_id, name, email, password_hash, role, status, created_at)
     VALUES ('${user_id}', '${org_id}',
             '${ADMIN_NAME//\'/\'\'}',
             '${ADMIN_EMAIL//\'/\'\'}',
             '${hashed_pw}',
             '${admin_role}', 'Active', NOW())
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           status = 'Active';"
  success "Admin user created/updated: ${ADMIN_EMAIL} (role: ${admin_role})"
}

# ── Write ecosystem.config.js ─────────────────────────────────────────────────
write_ecosystem() {
  header "PM2 Ecosystem Config"
  if [[ -f "$ECOSYSTEM_FILE" ]]; then
    success "${ECOSYSTEM_FILE} already exists — keeping it."
    return
  fi

  cat > "$ECOSYSTEM_FILE" <<'ECOEOF'
module.exports = {
  apps: [
    {
      name: 'riskeez-api',
      cwd: '/var/www/riskeez/backend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production'
      },
      watch: false,
      max_memory_restart: '500M',
      restart_delay: 3000,
      max_restarts: 10,
      autorestart: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/www/riskeez/logs/api-error.log',
      out_file: '/var/www/riskeez/logs/api-out.log',
      merge_logs: true
    }
  ]
}
ECOEOF

  success "Written ${ECOSYSTEM_FILE}"
}

# ── Configure Nginx ───────────────────────────────────────────────────────────
configure_nginx() {
  header "Nginx Configuration"

  # Write the site config from the template in the repo
  local template="${APP_DIR}/nginx.riskeez.conf"

  if [[ ! -f "$template" ]]; then
    die "Nginx template not found at ${template}"
  fi

  sed "s/__PORT__/${FRONTEND_PORT}/g" "$template" > "$NGINX_AVAIL"
  success "Nginx config written to ${NGINX_AVAIL}"

  # Enable site
  if [[ ! -L "$NGINX_ENABLED" ]]; then
    ln -sf "$NGINX_AVAIL" "$NGINX_ENABLED"
    success "Symlinked to sites-enabled."
  else
    success "Symlink ${NGINX_ENABLED} already exists."
  fi

  # Remove default site if it exists
  if [[ -L /etc/nginx/sites-enabled/default ]]; then
    rm -f /etc/nginx/sites-enabled/default
    warn "Removed default Nginx site."
  fi

  # Test config
  nginx -t 2>&1 | while IFS= read -r line; do info "nginx: $line"; done
  # nginx -t exits non-zero on failure; set -e will catch it.

  # Reload
  systemctl reload nginx
  success "Nginx reloaded."
}

# ── Start/restart with PM2 ────────────────────────────────────────────────────
start_pm2() {
  header "PM2 Process Manager"
  mkdir -p "$LOGS_DIR"

  if pm2 list | grep -q "riskeez-api"; then
    info "Restarting existing PM2 process 'riskeez-api'…"
    pm2 restart riskeez-api --update-env
  else
    info "Starting riskeez-api with PM2…"
    pm2 start "$ECOSYSTEM_FILE"
  fi

  pm2 save --force

  # Register PM2 startup script
  info "Configuring PM2 startup on boot…"
  local startup_cmd
  startup_cmd=$(pm2 startup systemd -u root --hp /root 2>&1 | grep "^sudo" || true)
  if [[ -n "$startup_cmd" ]]; then
    eval "$startup_cmd" 2>/dev/null || true
  fi
  pm2 save --force

  success "PM2 process started and saved."
}

# ── Health check ──────────────────────────────────────────────────────────────
health_check() {
  local url="http://localhost:${BACKEND_PORT}/api/health"
  local retries=10
  local delay=3

  info "Waiting for API to respond at ${url}…"
  for ((i=1; i<=retries; i++)); do
    if curl -sf "$url" -o /dev/null 2>/dev/null; then
      success "API is healthy."
      return
    fi
    sleep "$delay"
  done
  warn "API health check timed out after $((retries * delay))s. Check: pm2 logs riskeez-api"
}

# ── Print summary ─────────────────────────────────────────────────────────────
print_summary() {
  local port_suffix=""
  [[ "$FRONTEND_PORT" != "80" ]] && port_suffix=":${FRONTEND_PORT}"

  echo ""
  echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${GREEN}║            GRC Platform — Setup Complete!                    ║${NC}"
  echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  ${BOLD}Application URL:${NC}   http://${SERVER_IP}${port_suffix}"
  echo -e "  ${BOLD}API Base URL:${NC}      http://${SERVER_IP}${port_suffix}/api"
  echo -e "  ${BOLD}App Name:${NC}          ${APP_NAME}"
  echo -e "  ${BOLD}Setup Mode:${NC}        ${SETUP_MODE}"
  echo -e "  ${BOLD}Admin Email:${NC}       ${ADMIN_EMAIL}"
  echo -e "  ${BOLD}Organisation:${NC}      ${ORG_NAME}"
  echo ""
  echo -e "  ${CYAN}── Useful Commands ────────────────────────────────────────${NC}"
  echo -e "  View API logs:        ${BOLD}pm2 logs riskeez-api${NC}"
  echo -e "  Restart API:          ${BOLD}pm2 restart riskeez-api${NC}"
  echo -e "  Stop API:             ${BOLD}pm2 stop riskeez-api${NC}"
  echo -e "  PM2 status:           ${BOLD}pm2 status${NC}"
  echo -e "  Nginx reload:         ${BOLD}systemctl reload nginx${NC}"
  echo -e "  Reset admin password: ${BOLD}cd ${BACKEND_DIR} && npm run admin:reset-password${NC}"
  echo -e "  Re-run setup:         ${BOLD}sudo bash ${APP_DIR}/setup.sh${NC}"
  echo ""
  echo -e "  ${CYAN}── PM2 Status ──────────────────────────────────────────────${NC}"
  pm2 list 2>/dev/null || true
  echo ""
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  parse_args "$@"
  check_os

  # If any required interactive field is missing, run the wizard.
  if [[ -z "$ADMIN_NAME" || -z "$ADMIN_EMAIL" || -z "$ADMIN_PASSWORD" || \
        -z "$ORG_NAME"   || -z "$SERVER_IP" ]]; then
    interactive_wizard
  fi

  validate_inputs

  header "GRC Platform Setup — ${SETUP_MODE} mode"
  info "App Name:     ${APP_NAME}"
  info "Server IP:    ${SERVER_IP}"
  info "Admin email:  ${ADMIN_EMAIL}"
  info "Organisation: ${ORG_NAME}"
  echo ""

  # ── System packages ──
  apt-get update -qq
  install_node
  install_postgresql
  install_nginx
  install_pm2

  # ── Application ──
  write_env
  setup_database
  run_migrations
  install_and_build
  create_admin_user

  # ── Runtime config ──
  write_ecosystem
  configure_nginx
  start_pm2
  health_check
  print_summary
}

main "$@"
