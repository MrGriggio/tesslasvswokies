#!/bin/bash

# Print commands and exit on errors
set -xe

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    echo "curl is not installed. Installing..."
    apt-get update && apt-get install -y curl
fi

# Check server health
echo "Checking server health..."
curl -f http://localhost:3000/health

# Check PM2 status
echo -e "\nChecking PM2 status..."
pm2 status tesla-escape

# Check server logs
echo -e "\nLast 20 lines of server logs:"
pm2 logs tesla-escape --lines 20 --nostream