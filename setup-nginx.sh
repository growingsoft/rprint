#!/bin/bash

# Setup Nginx for RPrint under growingsoft.net
# Run this script with: sudo bash setup-nginx.sh

echo "Setting up Nginx for growingsoft.net..."

# Create Nginx configuration file
cat > /etc/nginx/sites-available/growingsoft.net << 'EOF'
# HTTP server block for growingsoft.net
server {
    listen 80;
    server_name growingsoft.net www.growingsoft.net;

    # Increase client body size for file uploads (10MB)
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
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
        echo "Setup complete! Your RPrint server should now be accessible at:"
        echo "  http://growingsoft.net"
        echo "  http://www.growingsoft.net"
        echo ""
        echo "Note: Make sure your DNS is configured to point to this server."
        echo "To add SSL/HTTPS, run: sudo certbot --nginx -d growingsoft.net -d www.growingsoft.net"
    else
        echo "✗ Failed to reload Nginx"
        exit 1
    fi
else
    echo "✗ Nginx configuration test failed"
    exit 1
fi
