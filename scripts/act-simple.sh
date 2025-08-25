#!/bin/bash
# Run Act with simpler platform
echo "🔧 Running Act with simplified platform..."
act --platform ubuntu-latest=node:18-alpine "$@"
