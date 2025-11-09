#!/bin/bash

# Setup Nginx for RPrint with Vite dev server support
# Run this script with: sudo bash setup-nginx-with-vite.sh

echo "Setting up Nginx for growingsoft.net with Vite dev server..."

# Create Nginx configuration file
cat > /etc/nginx/sites-available/growingsoft.net << 'EOF'
# HTTP server block for growingsoft.net
server {
    listen 80;
    server_name growingsoft.net www.growingsoft.net;

    # Increase client body size for file uploads (10MB)
    client_max_body_size 10M;

    # Vite dev server (frontend)
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;

        # WebSocket support for HMR
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Additional headers
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API server
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;

        # Proxy headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;

        # Timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

echo "✓ Configuration file created at /etc/nginx/sites-available/growingsoft.net"

# Create symbolic link to enable the site
ln -sf /etc/nginx/sites-available/growingsoft.net /etc/nginx/sites-enabled/growingsoft.net

echo "✓ Site enabled"

# Test Nginx configuration
echo "Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✓ Nginx configuration is valid"

    # Reload Nginx
    echo "Reloading Nginx..."
    systemctl reload nginx

    if [ $? -eq 0 ]; then
        echo "✓ Nginx reloaded successfully"
        echo ""
        echo "Setup complete! Your RPrint application should now be accessible at:"
        echo "  http://growingsoft.net (Vite dev server)"
        echo "  http://growingsoft.net/api (API server)"
        echo ""
        echo "Make sure both servers are running:"
        echo "  - API: cd /var/www/rprint && npm run server:dev"
        echo "  - Vite: cd /var/www/rprint/packages/client && npm run dev:vite"
        echo ""
        echo "Note: To add SSL/HTTPS, run: sudo certbot --nginx -d growingsoft.net -d www.growingsoft.net"
    else
        echo "✗ Failed to reload Nginx"
        exit 1
    fi
else
    echo "✗ Nginx configuration test failed"
    exit 1
fi
