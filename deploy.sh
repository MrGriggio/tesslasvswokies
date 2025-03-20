#!/bin/bash

# Print commands and exit on errors
set -xe

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build the project
npm run build

# Check if PM2 is installed globally, if not install it
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Stop any existing process
pm2 stop tesla-escape || true

# Start with new configuration
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Display status
pm2 status

# Display logs
pm2 logs tesla-escape --lines 50