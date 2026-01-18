#!/bin/bash
set -e

# =============================================================================
# RPrint Deployment Script
# =============================================================================
# Unified script for installation, updates, and management of RPrint server
#
# Usage: ./app.sh [command]
#
# Commands:
#   install     Fresh installation (dependencies, build, nginx, PM2)
#   update      Update from git and rebuild
#   status      Show application status
#   backup      Backup nginx config and database
#   restore     Restore from backup (interactive)
#   logs        Show PM2 logs (pass -f for follow mode)
#   nginx       Regenerate and reload nginx config
#   webhook     Setup GitHub webhook endpoint
#   help        Show help message
# =============================================================================

# Configuration
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_JSON="$APP_DIR/app.json"
BACKUP_DIR="/var/backups/rprint"
LOG_FILE="/var/log/rprint-deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Logging Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1" >> "$LOG_FILE" 2>/dev/null || true
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1" >> "$LOG_FILE" 2>/dev/null || true
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN] $1" >> "$LOG_FILE" 2>/dev/null || true
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" >> "$LOG_FILE" 2>/dev/null || true
}

# =============================================================================
# Configuration Loading
# =============================================================================

load_config() {
    if [ ! -f "$APP_JSON" ]; then
        log_error "app.json not found at $APP_JSON"
        exit 1
    fi

    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed. Run: sudo apt-get install jq"
        exit 1
    fi

    # Load configuration
    APP_NAME=$(jq -r '.name' "$APP_JSON")
    APP_DISPLAY_NAME=$(jq -r '.displayName' "$APP_JSON")
    APP_PORT=$(jq -r '.port' "$APP_JSON")
    NODE_VERSION=$(jq -r '.nodeVersion' "$APP_JSON")
    PM2_NAME=$(jq -r '.pm2.name' "$APP_JSON")
    PM2_SCRIPT=$(jq -r '.pm2.script' "$APP_JSON")
    PM2_CWD=$(jq -r '.pm2.cwd' "$APP_JSON")
    PM2_MAX_MEMORY=$(jq -r '.pm2.maxMemory' "$APP_JSON")
    NGINX_SERVER_NAMES=$(jq -r '.nginx.serverNames | join(" ")' "$APP_JSON")
    NGINX_MAX_UPLOAD=$(jq -r '.nginx.maxUploadSize' "$APP_JSON")
    NGINX_PROXY_TIMEOUT=$(jq -r '.nginx.proxyTimeout' "$APP_JSON")
    NGINX_SSL=$(jq -r '.nginx.ssl' "$APP_JSON")
    WEBHOOK_ENABLED=$(jq -r '.webhook.enabled' "$APP_JSON")
    WEBHOOK_PATH=$(jq -r '.webhook.path' "$APP_JSON")
    WEBHOOK_BRANCH=$(jq -r '.webhook.branch' "$APP_JSON")
    BACKUP_PATH=$(jq -r '.backup.path' "$APP_JSON")
    BACKUP_KEEP_DAYS=$(jq -r '.backup.keepDays' "$APP_JSON")
    HEALTH_CHECK_PATH=$(jq -r '.healthCheck' "$APP_JSON")
    SERVER_DIR=$(jq -r '.directories.server' "$APP_JSON")
    CLIENT_DIR=$(jq -r '.directories.client' "$APP_JSON")
    BUILD_SERVER_CMD=$(jq -r '.build.server' "$APP_JSON")
    BUILD_CLIENT_CMD=$(jq -r '.build.client' "$APP_JSON")
    DOMAIN=$(jq -r '.domain' "$APP_JSON")

    log_info "Loaded configuration for $APP_DISPLAY_NAME"
}

# =============================================================================
# Utility Functions
# =============================================================================

check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_warn "Not running as root. Some operations may fail."
        log_warn "Consider running with: sudo ./app.sh $1"
    fi
}

check_system_deps() {
    log_info "Checking system dependencies..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed."
        log_info "Install Node.js 18+ using:"
        log_info "  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
        log_info "  sudo apt-get install -y nodejs"
        exit 1
    fi

    # Check Node.js version
    NODE_CURRENT=$(node -v | sed 's/v//')
    NODE_MAJOR=$(echo "$NODE_CURRENT" | cut -d. -f1)
    if [ "$NODE_MAJOR" -lt 18 ]; then
        log_error "Node.js version $NODE_CURRENT is too old. Requires >= 18.0.0"
        exit 1
    fi
    log_success "Node.js $NODE_CURRENT installed"

    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed."
        exit 1
    fi
    log_success "npm $(npm -v) installed"

    # Check jq
    if ! command -v jq &> /dev/null; then
        log_info "Installing jq..."
        sudo apt-get update && sudo apt-get install -y jq
    fi
    log_success "jq installed"

    # Check poppler-utils (for PDF processing)
    if ! command -v pdftoppm &> /dev/null; then
        log_info "Installing poppler-utils..."
        sudo apt-get update && sudo apt-get install -y poppler-utils
    fi
    log_success "poppler-utils installed"

    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        log_info "Installing PM2 globally..."
        sudo npm install -g pm2
    fi
    log_success "PM2 $(pm2 -v) installed"

    # Check nginx
    if ! command -v nginx &> /dev/null; then
        log_error "nginx is not installed."
        log_info "Install nginx using: sudo apt-get install nginx"
        exit 1
    fi
    log_success "nginx installed"
}

install_npm_deps() {
    log_info "Installing npm dependencies..."
    cd "$APP_DIR"
    npm install
    log_success "npm dependencies installed"
}

build_server() {
    log_info "Building server..."
    cd "$APP_DIR/$SERVER_DIR"
    $BUILD_SERVER_CMD
    log_success "Server built successfully"
}

build_client() {
    log_info "Building client..."
    cd "$APP_DIR/$CLIENT_DIR"
    $BUILD_CLIENT_CMD

    # Copy built files to server public directory
    log_info "Copying client build to server public directory..."
    rm -rf "$APP_DIR/$SERVER_DIR/public/assets"
    cp -r "$APP_DIR/$CLIENT_DIR/dist/"* "$APP_DIR/$SERVER_DIR/public/"
    log_success "Client built and deployed"
}

setup_env() {
    log_info "Setting up environment..."
    ENV_FILE="$APP_DIR/$SERVER_DIR/.env"
    ENV_EXAMPLE="$APP_DIR/$SERVER_DIR/.env.example"

    if [ ! -f "$ENV_FILE" ]; then
        if [ -f "$ENV_EXAMPLE" ]; then
            cp "$ENV_EXAMPLE" "$ENV_FILE"
            log_info "Created .env from .env.example"
        else
            log_error ".env.example not found"
            exit 1
        fi
    fi

    # Generate JWT_SECRET if placeholder
    if grep -q "change-this-to-a-random-secure-string" "$ENV_FILE"; then
        JWT_SECRET=$(openssl rand -hex 32)
        sed -i "s/change-this-to-a-random-secure-string/$JWT_SECRET/" "$ENV_FILE"
        log_info "Generated new JWT_SECRET"
    fi

    # Generate DEPLOY_WEBHOOK_SECRET if not set
    if ! grep -q "DEPLOY_WEBHOOK_SECRET" "$ENV_FILE"; then
        WEBHOOK_SECRET=$(openssl rand -hex 32)
        echo "" >> "$ENV_FILE"
        echo "# Deployment webhook secret (for GitHub)" >> "$ENV_FILE"
        echo "DEPLOY_WEBHOOK_SECRET=$WEBHOOK_SECRET" >> "$ENV_FILE"
        log_info "Generated new DEPLOY_WEBHOOK_SECRET"
    elif grep -q "DEPLOY_WEBHOOK_SECRET=$" "$ENV_FILE" || grep -q "DEPLOY_WEBHOOK_SECRET=your-webhook-secret" "$ENV_FILE"; then
        WEBHOOK_SECRET=$(openssl rand -hex 32)
        sed -i "s/DEPLOY_WEBHOOK_SECRET=.*/DEPLOY_WEBHOOK_SECRET=$WEBHOOK_SECRET/" "$ENV_FILE"
        log_info "Generated new DEPLOY_WEBHOOK_SECRET"
    fi

    # Set PORT
    if ! grep -q "^PORT=" "$ENV_FILE"; then
        echo "PORT=$APP_PORT" >> "$ENV_FILE"
    else
        sed -i "s/^PORT=.*/PORT=$APP_PORT/" "$ENV_FILE"
    fi

    log_success "Environment configured"
}

generate_nginx_config() {
    log_info "Generating nginx configuration..."

    NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"

    # Determine SSL cert paths
    SSL_CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    SSL_KEY="/etc/letsencrypt/live/$DOMAIN/privkey.pem"

    # Check if SSL certs exist
    if [ "$NGINX_SSL" = "true" ] && [ -f "$SSL_CERT" ] && [ -f "$SSL_KEY" ]; then
        HAS_SSL=true
    else
        HAS_SSL=false
        if [ "$NGINX_SSL" = "true" ]; then
            log_warn "SSL certificates not found. Generating HTTP-only config."
            log_warn "Run 'sudo certbot --nginx -d $DOMAIN' to enable SSL."
        fi
    fi

    # Generate nginx config
    cat > "/tmp/$APP_NAME.nginx" << EOF
# RPrint nginx configuration
# Generated by app.sh on $(date)

EOF

    if [ "$HAS_SSL" = "true" ]; then
        cat >> "/tmp/$APP_NAME.nginx" << EOF
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $NGINX_SERVER_NAMES;
    return 301 https://\$host\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $NGINX_SERVER_NAMES;

    ssl_certificate $SSL_CERT;
    ssl_certificate_key $SSL_KEY;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    client_max_body_size $NGINX_MAX_UPLOAD;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout ${NGINX_PROXY_TIMEOUT}s;
        proxy_connect_timeout ${NGINX_PROXY_TIMEOUT}s;
        proxy_send_timeout ${NGINX_PROXY_TIMEOUT}s;
    }
}
EOF
    else
        cat >> "/tmp/$APP_NAME.nginx" << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $NGINX_SERVER_NAMES;

    client_max_body_size $NGINX_MAX_UPLOAD;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout ${NGINX_PROXY_TIMEOUT}s;
        proxy_connect_timeout ${NGINX_PROXY_TIMEOUT}s;
        proxy_send_timeout ${NGINX_PROXY_TIMEOUT}s;
    }
}
EOF
    fi

    log_success "nginx configuration generated"
}

install_nginx_config() {
    log_info "Installing nginx configuration..."

    NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"
    NGINX_ENABLED="/etc/nginx/sites-enabled/$APP_NAME"

    sudo cp "/tmp/$APP_NAME.nginx" "$NGINX_CONF"

    # Enable site if not already enabled
    if [ ! -L "$NGINX_ENABLED" ]; then
        sudo ln -s "$NGINX_CONF" "$NGINX_ENABLED"
    fi

    # Test nginx configuration
    if sudo nginx -t; then
        sudo systemctl reload nginx
        log_success "nginx configuration installed and reloaded"
    else
        log_error "nginx configuration test failed"
        exit 1
    fi
}

setup_ssl() {
    if [ "$NGINX_SSL" != "true" ]; then
        return
    fi

    SSL_CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"

    if [ -f "$SSL_CERT" ]; then
        log_info "SSL certificate already exists"
        return
    fi

    log_info "Setting up SSL with Certbot..."

    if ! command -v certbot &> /dev/null; then
        log_info "Installing Certbot..."
        sudo apt-get update
        sudo apt-get install -y certbot python3-certbot-nginx
    fi

    log_info "Requesting SSL certificate for $DOMAIN..."
    sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email admin@$DOMAIN

    log_success "SSL certificate installed"
}

setup_pm2() {
    log_info "Setting up PM2 process..."

    cd "$APP_DIR/$SERVER_DIR"

    # Check if process already exists
    if pm2 describe "$PM2_NAME" &> /dev/null; then
        log_info "Reloading existing PM2 process..."
        pm2 reload "$PM2_NAME"
    else
        log_info "Starting new PM2 process..."
        pm2 start "$PM2_SCRIPT" \
            --name "$PM2_NAME" \
            --max-memory-restart "$PM2_MAX_MEMORY" \
            --time
    fi

    # Save PM2 configuration
    pm2 save

    log_success "PM2 process configured"
}

run_health_check() {
    log_info "Running health check..."

    # Wait for server to start
    sleep 3

    # Try health check endpoint
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$APP_PORT$HEALTH_CHECK_PATH" || echo "000")

    if [ "$HTTP_CODE" = "200" ]; then
        log_success "Health check passed"
        return 0
    else
        log_error "Health check failed (HTTP $HTTP_CODE)"
        log_info "Check logs with: pm2 logs $PM2_NAME"
        return 1
    fi
}

# =============================================================================
# Backup Functions
# =============================================================================

do_backup() {
    log_info "Creating backup..."

    TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
    BACKUP_DEST="$BACKUP_PATH/$TIMESTAMP"

    mkdir -p "$BACKUP_DEST"

    # Backup nginx config
    NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"
    if [ -f "$NGINX_CONF" ]; then
        cp "$NGINX_CONF" "$BACKUP_DEST/nginx.conf"
        log_info "Backed up nginx configuration"
    fi

    # Backup database
    DB_FILE="$APP_DIR/$SERVER_DIR/data/rprint.db"
    if [ -f "$DB_FILE" ]; then
        cp "$DB_FILE" "$BACKUP_DEST/rprint.db"
        log_info "Backed up database"
    fi

    # Backup .env
    ENV_FILE="$APP_DIR/$SERVER_DIR/.env"
    if [ -f "$ENV_FILE" ]; then
        cp "$ENV_FILE" "$BACKUP_DEST/.env"
        log_info "Backed up environment file"
    fi

    # Create manifest
    cat > "$BACKUP_DEST/manifest.json" << EOF
{
    "timestamp": "$TIMESTAMP",
    "date": "$(date -Iseconds)",
    "app": "$APP_NAME",
    "version": "$(jq -r '.version' "$APP_JSON")",
    "git_commit": "$(git -C "$APP_DIR" rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "files": [
        "nginx.conf",
        "rprint.db",
        ".env"
    ]
}
EOF

    # Update latest symlink
    rm -f "$BACKUP_PATH/latest"
    ln -s "$BACKUP_DEST" "$BACKUP_PATH/latest"

    # Cleanup old backups
    find "$BACKUP_PATH" -maxdepth 1 -type d -mtime +$BACKUP_KEEP_DAYS -exec rm -rf {} \; 2>/dev/null || true

    log_success "Backup created at $BACKUP_DEST"
}

do_restore() {
    log_info "Available backups:"

    if [ ! -d "$BACKUP_PATH" ]; then
        log_error "No backups found at $BACKUP_PATH"
        exit 1
    fi

    # List available backups
    BACKUPS=($(ls -1d "$BACKUP_PATH"/2* 2>/dev/null | sort -r))

    if [ ${#BACKUPS[@]} -eq 0 ]; then
        log_error "No backups found"
        exit 1
    fi

    echo ""
    for i in "${!BACKUPS[@]}"; do
        BACKUP_NAME=$(basename "${BACKUPS[$i]}")
        echo "  [$i] $BACKUP_NAME"
    done
    echo ""

    read -p "Enter backup number to restore (or 'q' to quit): " CHOICE

    if [ "$CHOICE" = "q" ]; then
        log_info "Restore cancelled"
        exit 0
    fi

    if ! [[ "$CHOICE" =~ ^[0-9]+$ ]] || [ "$CHOICE" -ge ${#BACKUPS[@]} ]; then
        log_error "Invalid selection"
        exit 1
    fi

    RESTORE_FROM="${BACKUPS[$CHOICE]}"
    log_info "Restoring from $RESTORE_FROM..."

    # Create a backup before restoring
    do_backup

    # Restore nginx config
    if [ -f "$RESTORE_FROM/nginx.conf" ]; then
        sudo cp "$RESTORE_FROM/nginx.conf" "/etc/nginx/sites-available/$APP_NAME"
        sudo nginx -t && sudo systemctl reload nginx
        log_info "Restored nginx configuration"
    fi

    # Restore database
    if [ -f "$RESTORE_FROM/rprint.db" ]; then
        pm2 stop "$PM2_NAME" 2>/dev/null || true
        cp "$RESTORE_FROM/rprint.db" "$APP_DIR/$SERVER_DIR/data/rprint.db"
        pm2 start "$PM2_NAME" 2>/dev/null || true
        log_info "Restored database"
    fi

    # Restore .env
    if [ -f "$RESTORE_FROM/.env" ]; then
        cp "$RESTORE_FROM/.env" "$APP_DIR/$SERVER_DIR/.env"
        pm2 reload "$PM2_NAME" 2>/dev/null || true
        log_info "Restored environment file"
    fi

    log_success "Restore completed from $(basename "$RESTORE_FROM")"
}

# =============================================================================
# Status Function
# =============================================================================

show_status() {
    echo ""
    echo "=========================================="
    echo " $APP_DISPLAY_NAME - Status"
    echo "=========================================="
    echo ""

    # Node.js version
    echo -e "${BLUE}Node.js:${NC} $(node -v)"
    echo -e "${BLUE}npm:${NC} $(npm -v)"
    echo ""

    # PM2 status
    echo -e "${BLUE}PM2 Process:${NC}"
    pm2 describe "$PM2_NAME" 2>/dev/null | grep -E "(status|memory|uptime|restarts)" || echo "  Not running"
    echo ""

    # nginx status
    echo -e "${BLUE}nginx:${NC}"
    if systemctl is-active --quiet nginx; then
        echo -e "  Status: ${GREEN}running${NC}"
    else
        echo -e "  Status: ${RED}stopped${NC}"
    fi
    echo ""

    # Health check
    echo -e "${BLUE}Health Check:${NC}"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$APP_PORT$HEALTH_CHECK_PATH" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "  Status: ${GREEN}healthy${NC}"
    else
        echo -e "  Status: ${RED}unhealthy (HTTP $HTTP_CODE)${NC}"
    fi
    echo ""

    # Disk usage
    echo -e "${BLUE}Disk Usage:${NC}"
    echo "  App directory: $(du -sh "$APP_DIR" 2>/dev/null | cut -f1)"
    echo "  Uploads: $(du -sh "$APP_DIR/$SERVER_DIR/uploads" 2>/dev/null | cut -f1)"
    echo "  Database: $(du -sh "$APP_DIR/$SERVER_DIR/data" 2>/dev/null | cut -f1)"
    echo "  Backups: $(du -sh "$BACKUP_PATH" 2>/dev/null | cut -f1)"
    echo ""

    # Git status
    echo -e "${BLUE}Git:${NC}"
    echo "  Branch: $(git -C "$APP_DIR" branch --show-current 2>/dev/null || echo 'unknown')"
    echo "  Commit: $(git -C "$APP_DIR" rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
    echo "  Status: $(git -C "$APP_DIR" status --porcelain 2>/dev/null | wc -l) uncommitted changes"
    echo ""

    # Webhook info
    if [ "$WEBHOOK_ENABLED" = "true" ]; then
        echo -e "${BLUE}Webhook:${NC}"
        echo "  URL: https://$DOMAIN$WEBHOOK_PATH"
        echo "  Branch: $WEBHOOK_BRANCH"
        echo ""
    fi
}

# =============================================================================
# Webhook Setup
# =============================================================================

setup_webhook() {
    log_info "GitHub Webhook Setup"
    echo ""

    # Get webhook secret
    ENV_FILE="$APP_DIR/$SERVER_DIR/.env"
    if [ -f "$ENV_FILE" ]; then
        WEBHOOK_SECRET=$(grep "^DEPLOY_WEBHOOK_SECRET=" "$ENV_FILE" | cut -d= -f2)
    fi

    if [ -z "$WEBHOOK_SECRET" ]; then
        log_warn "DEPLOY_WEBHOOK_SECRET not found in .env"
        log_info "Run './app.sh install' to generate it"
        exit 1
    fi

    echo "Configure your GitHub webhook with these settings:"
    echo ""
    echo "  Payload URL: https://$DOMAIN$WEBHOOK_PATH"
    echo "  Content type: application/json"
    echo "  Secret: $WEBHOOK_SECRET"
    echo "  SSL verification: Enable"
    echo "  Events: Just the push event"
    echo ""
    echo "The webhook will automatically deploy when you push to the '$WEBHOOK_BRANCH' branch."
    echo ""
}

# =============================================================================
# Command Handlers
# =============================================================================

cmd_install() {
    check_root "install"
    load_config

    echo ""
    echo "=========================================="
    echo " Installing $APP_DISPLAY_NAME"
    echo "=========================================="
    echo ""

    check_system_deps
    install_npm_deps
    setup_env
    build_server
    build_client
    generate_nginx_config
    install_nginx_config
    setup_pm2

    # Wait a bit for PM2 to start
    sleep 2

    run_health_check

    # Save PM2 startup configuration
    pm2 save
    pm2 startup 2>/dev/null || true

    echo ""
    log_success "Installation complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Configure SSL: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
    echo "  2. Setup webhook: ./app.sh webhook"
    echo "  3. View logs: ./app.sh logs -f"
    echo ""
}

cmd_update() {
    load_config

    echo ""
    echo "=========================================="
    echo " Updating $APP_DISPLAY_NAME"
    echo "=========================================="
    echo ""

    cd "$APP_DIR"

    # Create backup first
    do_backup

    # Fetch latest changes
    log_info "Fetching updates from git..."
    git fetch origin

    # Check if there are updates
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/$WEBHOOK_BRANCH)

    if [ "$LOCAL" = "$REMOTE" ]; then
        log_info "Already up to date"
        return 0
    fi

    # Check for local changes
    if [ -n "$(git status --porcelain)" ]; then
        log_warn "Local changes detected. Stashing..."
        git stash
    fi

    # Pull updates
    log_info "Pulling updates..."
    git pull origin "$WEBHOOK_BRANCH"

    # Check if package.json changed
    PACKAGE_CHANGED=$(git diff "$LOCAL" "$REMOTE" --name-only | grep -c "package.json" || true)
    if [ "$PACKAGE_CHANGED" -gt 0 ]; then
        log_info "package.json changed, reinstalling dependencies..."
        install_npm_deps
    fi

    # Rebuild
    build_server
    build_client

    # Reload PM2 (graceful, zero-downtime)
    log_info "Reloading PM2 process..."
    pm2 reload "$PM2_NAME"

    # Health check
    sleep 2
    run_health_check

    echo ""
    log_success "Update complete!"
    echo "  Previous: ${LOCAL:0:7}"
    echo "  Current:  ${REMOTE:0:7}"
    echo ""
}

cmd_logs() {
    load_config

    if [ "$2" = "-f" ] || [ "$2" = "--follow" ]; then
        pm2 logs "$PM2_NAME"
    else
        pm2 logs "$PM2_NAME" --lines 50 --nostream
    fi
}

cmd_nginx() {
    check_root "nginx"
    load_config

    generate_nginx_config
    install_nginx_config

    log_success "nginx configuration updated"
}

cmd_help() {
    echo ""
    echo "RPrint Deployment Script"
    echo ""
    echo "Usage: ./app.sh [command]"
    echo ""
    echo "Commands:"
    echo "  install     Fresh installation (dependencies, build, nginx, PM2)"
    echo "  update      Update from git and rebuild"
    echo "  status      Show application status"
    echo "  backup      Backup nginx config and database"
    echo "  restore     Restore from backup (interactive)"
    echo "  logs        Show PM2 logs (pass -f for follow mode)"
    echo "  nginx       Regenerate and reload nginx config"
    echo "  webhook     Setup GitHub webhook endpoint"
    echo "  help        Show this help message"
    echo ""
}

# =============================================================================
# Main
# =============================================================================

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
mkdir -p "$BACKUP_DIR" 2>/dev/null || true

case "${1:-help}" in
    install)
        cmd_install
        ;;
    update)
        cmd_update
        ;;
    status)
        load_config
        show_status
        ;;
    backup)
        load_config
        do_backup
        ;;
    restore)
        load_config
        do_restore
        ;;
    logs)
        cmd_logs "$@"
        ;;
    nginx)
        cmd_nginx
        ;;
    webhook)
        load_config
        setup_webhook
        ;;
    help|--help|-h)
        cmd_help
        ;;
    *)
        log_error "Unknown command: $1"
        cmd_help
        exit 1
        ;;
esac
