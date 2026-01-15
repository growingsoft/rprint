#!/bin/bash
#
# RPrint Fresh Install Script
#
# Usage: ./installapp.sh

set -e

APP_NAME="rprint"
APP_DIR="/var/www/growingsoft.net"
REPO_URL="git@github.com:growingsoft/rprint.git"
BRANCH="main"
PORT=5003
LOG_FILE="/var/log/$APP_NAME/install.log"

log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "$1"; }
log_success() { log "SUCCESS" "$1"; }
log_error() { log "ERROR" "$1"; }

mkdir -p "$(dirname "$LOG_FILE")"

log_info "=== Starting $APP_NAME fresh installation ==="

# Stop existing process if running
if pm2 describe "$APP_NAME" &>/dev/null; then
    log_info "Stopping existing $APP_NAME process..."
    pm2 delete "$APP_NAME" 2>/dev/null || true
fi

# Backup existing directory if it exists
if [ -d "$APP_DIR" ] && [ -d "$APP_DIR/.git" ]; then
    BACKUP_DIR="${APP_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
    log_info "Backing up existing installation to $BACKUP_DIR..."
    mv "$APP_DIR" "$BACKUP_DIR"
fi

# Clone fresh copy
log_info "Cloning repository from $REPO_URL..."
git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR" || { log_error "Failed to clone repository"; exit 1; }

cd "$APP_DIR"

# Install dependencies
log_info "Installing dependencies..."
npm install
log_success "Dependencies installed"

# Build server
log_info "Building server..."
cd packages/server
npm run build
log_success "Server built"

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    log_info "Creating .env file..."
    cat > .env << EOF
PORT=$PORT
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
DB_PATH=./data/rprint.db
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_ORIGINS=https://growingsoft.net,https://www.growingsoft.net
EOF
    log_success ".env file created"
fi

# Ensure directories exist
mkdir -p data uploads

cd "$APP_DIR"

# Copy deployment scripts back if they were in backup
if [ -n "$BACKUP_DIR" ]; then
    [ -f "$BACKUP_DIR/installapp.sh" ] && cp "$BACKUP_DIR/installapp.sh" "$APP_DIR/"
    [ -f "$BACKUP_DIR/updateapp.sh" ] && cp "$BACKUP_DIR/updateapp.sh" "$APP_DIR/"
fi

# Start with PM2
log_info "Starting $APP_NAME with PM2 on port $PORT..."
cd packages/server
pm2 start dist/index.js --name "$APP_NAME"
cd "$APP_DIR"
pm2 save

log_success "=== $APP_NAME installation complete ==="
log_info "Application running on port $PORT"
