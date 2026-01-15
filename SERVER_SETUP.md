# RPrint Server Setup Guide

This document contains all the configuration needed to set up the RPrint service on a new server.

## Prerequisites

- Ubuntu Server (tested on kernel 5.15.0)
- Node.js v22.17.1
- npm v11.6.2
- nginx
- pm2
- certbot (for SSL)

## 1. Install Node.js

```bash
# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node -v   # Should show v22.17.1 or higher
npm -v    # Should show 11.x
```

## 2. Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

## 3. Install Nginx

```bash
sudo apt update
sudo apt install nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

## 4. Clone and Setup RPrint

```bash
# Create directory
sudo mkdir -p /var/www/rprint
sudo chown $USER:$USER /var/www/rprint

# Clone your repository (or copy files)
cd /var/www/rprint
# git clone <your-repo> .

# Install dependencies
npm install

# Build the server
cd packages/server
npm run build

# Build the client
cd ../client
npm run build
```

## 5. Server Environment Configuration

Create `/var/www/rprint/packages/server/.env`:

```env
PORT=3002
NODE_ENV=production
JWT_SECRET=change-this-to-a-random-secure-string
DB_PATH=./data/rprint.db
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3002,https://yourdomain.com
```

**Important:** Change `JWT_SECRET` to a strong random string and update `ALLOWED_ORIGINS` with your actual domain.

## 6. Nginx Configuration

Create `/etc/nginx/sites-available/rprint`:

```nginx
server {
    server_name yourdomain.com www.yourdomain.com;

    # Allow file uploads up to 10MB
    client_max_body_size 10M;

    # Serve static client files
    root /var/www/rprint/packages/client/dist/renderer;
    index index.html;

    # Proxy API requests to Node.js server
    location /api {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Serve React SPA - fallback to index.html for client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SSL will be added by certbot
    listen 80;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/rprint /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 7. SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot will automatically modify the nginx config to add SSL
```

After certbot runs, your nginx config will look like this:

```nginx
server {
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 10M;

    root /var/www/rprint/packages/client/dist/renderer;
    index index.html;

    location /api {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = www.yourdomain.com) {
        return 301 https://$host$request_uri;
    }
    if ($host = yourdomain.com) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 404;
}
```

## 8. SSL Options Configuration

The file `/etc/letsencrypt/options-ssl-nginx.conf` contains:

```nginx
ssl_session_cache shared:le_nginx_SSL:10m;
ssl_session_timeout 1440m;
ssl_session_tickets off;

ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;

ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384";
```

## 9. Start Services with PM2

```bash
# Start the API server
cd /var/www/rprint/packages/server
pm2 start dist/index.js --name rprint-server

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u $USER --hp $HOME
# Run the command that pm2 outputs
```

## 10. PM2 Process Details

The server runs with these settings:
- **Name:** rprint-server
- **Script:** /var/www/rprint/packages/server/dist/index.js
- **Working directory:** /var/www/rprint/packages/server
- **Interpreter:** node
- **Mode:** fork

## 11. Directory Structure

Ensure these directories exist and have proper permissions:

```bash
# Create data and uploads directories
mkdir -p /var/www/rprint/packages/server/data
mkdir -p /var/www/rprint/packages/server/uploads

# Set ownership
chown -R $USER:$USER /var/www/rprint
```

## 12. Firewall Configuration (Optional)

If using UFW:

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

## 13. Useful PM2 Commands

```bash
pm2 status              # Check process status
pm2 logs rprint-server  # View logs
pm2 restart rprint-server  # Restart the server
pm2 stop rprint-server  # Stop the server
pm2 delete rprint-server  # Remove from PM2
```

## 14. Troubleshooting

### Check nginx logs
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Check PM2 logs
```bash
pm2 logs rprint-server --lines 100
```

### Test nginx config
```bash
sudo nginx -t
```

### Restart services
```bash
sudo systemctl restart nginx
pm2 restart rprint-server
```

## Summary of Key Ports

| Service | Port | Access |
|---------|------|--------|
| Nginx HTTP | 80 | Public (redirects to HTTPS) |
| Nginx HTTPS | 443 | Public |
| Node.js API | 3002 | Internal only (proxied via nginx) |

## Current Domain Configuration

The service is currently running at `growingsoft.net` with:
- SSL enabled via Let's Encrypt
- API served at `https://growingsoft.net/api/*`
- Static files served from `/var/www/rprint/packages/client/dist/renderer`
