#!/bin/bash
# Build and run the Silkflow scraper with proper Docker networking

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Container name
CONTAINER_NAME="silkflow-scraper"

# Stop and remove existing container if it exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Stopping and removing existing container..."
  docker stop "$CONTAINER_NAME" 2>/dev/null || true
  docker rm "$CONTAINER_NAME" 2>/dev/null || true
fi

# Build the image
echo "Building Docker image..."
docker build -t silkflow-scraper .

# Run the container with proper network configuration
echo "Starting container..."
docker run -d \
  --name "$CONTAINER_NAME" \
  --network supabase_network_silkflow \
  -p 8000:8000 \
  --env-file ../../.env \
  silkflow-scraper

echo "✓ Scraper is running on http://localhost:8000"
echo "✓ Container name: $CONTAINER_NAME"
echo "✓ Network: supabase_network_silkflow"
echo ""
echo "Logs: docker logs -f $CONTAINER_NAME"
echo "Stop: docker stop $CONTAINER_NAME"
