#!/bin/bash

echo "=== SSL Setup for graceportpro.com ==="
echo ""

# Update system
echo "Updating system packages..."
sudo apt update

# Install Certbot
echo "Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Create directory for Certbot challenges
echo "Creating Certbot directory..."
sudo mkdir -p /var/www/certbot

# Obtain SSL certificate
echo ""
echo "Obtaining SSL certificate..."
echo "NOTE: Make sure ports 80 and 443 are open in your firewall!"
echo ""

sudo certbot certonly --webroot \
    -w /var/www/certbot \
    -d graceportpro.com \
    -d *.graceportpro.com \
    --email your-email@example.com \
    --agree-tos \
    --non-interactive

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ SSL certificate obtained successfully!"
else
    echo ""
    echo "✗ Failed to obtain SSL certificate"
    echo "Please check:"
    echo "  1. DNS records point to this server"
    echo "  2. Ports 80 and 443 are open"
    echo "  3. Nginx is running with the HTTP config"
    exit 1
fi

# Test auto-renewal
echo ""
echo "Testing auto-renewal..."
sudo certbot renew --dry-run

if [ $? -eq 0 ]; then
    echo "✓ Auto-renewal test passed!"
else
    echo "✗ Auto-renewal test failed"
fi

# Setup auto-renewal cron job
echo ""
echo "Setting up auto-renewal cron job..."
(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "0 0 * * * certbot renew --quiet && systemctl reload nginx") | crontab -

echo ""
echo "=== SSL Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Update Nginx config to use HTTPS (upload nginx.conf)"
echo "2. Test Nginx config: sudo nginx -t"
echo "3. Reload Nginx: sudo systemctl reload nginx"
echo "4. Deploy new client build with HTTPS"
echo "5. Restart Node.js server with production env"
echo ""
echo "Certificates will auto-renew every 90 days"
