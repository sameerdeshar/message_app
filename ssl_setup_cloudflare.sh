#!/bin/bash

echo "=== Cloudflare DNS SSL Setup for graceportpro.com ==="
echo ""

# Install Certbot with Cloudflare plugin
echo "Installing Certbot with Cloudflare DNS plugin..."
sudo snap install --classic certbot
sudo snap set certbot trust-plugin-with-root=ok
sudo snap install certbot-dns-cloudflare

# Create Cloudflare credentials file
echo ""
echo "Creating Cloudflare credentials file..."
sudo mkdir -p /root/.secrets
sudo cat > /root/.secrets/cloudflare.ini << EOF
# Cloudflare API credentials
dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN_HERE
EOF

sudo chmod 600 /root/.secrets/cloudflare.ini

echo ""
echo "⚠️  IMPORTANT: Edit /root/.secrets/cloudflare.ini and add your Cloudflare API token"
echo ""
echo "To get your Cloudflare API token:"
echo "1. Go to https://dash.cloudflare.com/profile/api-tokens"
echo "2. Click 'Create Token'"
echo "3. Use 'Edit zone DNS' template"
echo "4. Select your domain (graceportpro.com)"
echo "5. Copy the token and paste it in /root/.secrets/cloudflare.ini"
echo ""
read -p "Press Enter after you've updated the API token..."

# Obtain wildcard SSL certificate
echo ""
echo "Obtaining wildcard SSL certificate..."
sudo certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials /root/.secrets/cloudflare.ini \
    -d graceportpro.com \
    -d "*.graceportpro.com" \
    --email info@graceportpro.com \
    --agree-tos \
    --non-interactive

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ SSL certificate obtained successfully!"
else
    echo ""
    echo "✗ Failed to obtain SSL certificate"
    exit 1
fi

# Test auto-renewal
echo ""
echo "Testing auto-renewal..."
sudo certbot renew --dry-run

# Setup auto-renewal cron job
echo ""
echo "Setting up auto-renewal cron job..."
(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "0 0 * * * certbot renew --quiet && systemctl reload nginx") | crontab -

echo ""
echo "=== SSL Setup Complete ==="
echo ""
echo "Certificates will auto-renew every 90 days"
