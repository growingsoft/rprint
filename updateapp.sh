#!/bin/bash
#
# RPrint Update Script
#
# Usage: ./updateapp.sh

set -e

APP_NAME="rprint"
APP_DIR="/var/www/growingsoft.net"
BRANCH="main"
LOG_FILE="/var/log/$APP_NAME/update.log"

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
cd "$APP_DIR"

if [ ! -d ".git" ]; then
    log_error "Not a git repository"
    exit 1
fi

log_info "=== Starting $APP_NAME update ==="

OLD_VERSION=$(git rev-parse --short HEAD)
log_info "Current version: $OLD_VERSION"

log_info "Fetching latest changes..."
git fetch origin || { log_error "Failed to fetch"; exit 2; }

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH" 2>/dev/null)

if [ "$LOCAL" = "$REMOTE" ]; then
    log_success "Already up to date at $OLD_VERSION"
    exit 0
fi

CHANGED_FILES=$(git diff --name-only "$LOCAL" "$REMOTE")

log_info "Updating from $OLD_VERSION to $(echo $REMOTE | cut -c1-7)..."
git reset --hard "$REMOTE" || { log_error "Failed to reset"; exit 2; }

NEW_VERSION=$(git rev-parse --short HEAD)
log_success "Updated to $NEW_VERSION"

# Check if root dependencies changed
if echo "$CHANGED_FILES" | grep -qE "^package"; then
    log_info "Root dependencies changed, running npm install..."
    npm install
    log_success "Root dependencies updated"
fi

# Check if server dependencies changed
if echo "$CHANGED_FILES" | grep -qE "packages/server/package"; then
    log_info "Server dependencies changed, running npm install..."
    cd packages/server
    npm install
    cd ../..
    log_success "Server dependencies updated"
fi

# Build server if changed
if echo "$CHANGED_FILES" | grep -qE "packages/server/src/"; then
    log_info "Building server..."
    cd packages/server
    npm run build
    cd ../..
    log_success "Server built"
fi

log_info "Reloading service..."
pm2 reload "$APP_NAME" --update-env 2>/dev/null || pm2 restart "$APP_NAME" 2>/dev/null || true
log_success "Service reloaded"

log_success "=== Update complete: $OLD_VERSION -> $NEW_VERSION ==="
