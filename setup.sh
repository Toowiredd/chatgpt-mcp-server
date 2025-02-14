#!/bin/bash
set -e

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root"
  exit 1
fi

# Install required packages
echo "Installing required packages..."
apt update
apt install -y nginx

# Create NGINX config directory if it doesn't exist
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

# Copy NGINX configuration
echo "Configuring NGINX..."
cp nginx.conf /etc/nginx/sites-available/docker-api
ln -sf /etc/nginx/sites-available/docker-api /etc/nginx/sites-enabled/

# Remove default config if it exists
rm -f /etc/nginx/sites-enabled/default

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    echo "API_KEY=$(openssl rand -hex 32)" > .env
    echo "HTTP_PORT=3001" >> .env
    echo "RATE_LIMIT_REQUESTS=50" >> .env
    echo "RATE_LIMIT_WINDOW=60000" >> .env
fi

# Install Node.js dependencies and build
echo "Installing Node.js dependencies..."
npm install

echo "Building TypeScript..."
npm run build

# Install and configure PM2
echo "Setting up PM2..."
npm install -g pm2

# Stop existing instance if running
pm2 stop docker-api 2>/dev/null || true
pm2 delete docker-api 2>/dev/null || true

# Start service with PM2
echo "Starting service..."
pm2 start build/index.js --name "docker-api"
pm2 save
pm2 startup

# Test NGINX configuration
echo "Testing NGINX configuration..."
nginx -t

# Restart NGINX
echo "Restarting NGINX..."
systemctl restart nginx

echo "Setup complete!"
echo "Your Docker API is now accessible at http://$(hostname -I | awk '{print $1}')"
echo "OpenAPI spec: http://$(hostname -I | awk '{print $1}')/openapi.yaml"
echo "Plugin manifest: http://$(hostname -I | awk '{print $1}')/ai-plugin.json"
echo ""
echo "API Key: $(grep API_KEY .env | cut -d'=' -f2)"