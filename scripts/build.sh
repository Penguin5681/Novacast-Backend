#!/bin/bash

# Build script that handles .ts extensions in imports
# This script temporarily removes .ts extensions and adds .js extensions for building

set -e

echo "🏗️  Preparing build..."

# Create a temporary build directory
rm -rf build-temp
mkdir -p build-temp

# Copy source files to temp directory
cp -r src/* build-temp/

# Convert .ts extensions to .js extensions in imports in temp files
echo "🔧 Converting import extensions (.ts -> .js)..."
find build-temp -name "*.ts" -not -path "*/node_modules/*" -exec sed -i 's/\.ts";/.js";/g' {} \;
find build-temp -name "*.ts" -not -path "*/node_modules/*" -exec sed -i "s/\.ts';/.js';/g" {} \;

# Build from temp directory
echo "🚀 Building TypeScript..."
./node_modules/.bin/tsc --project tsconfig.build.json --rootDir build-temp --outDir dist

# Clean up temp directory
rm -rf build-temp

echo "✅ Build completed successfully!"

# List the output
echo "📁 Build output:"
ls -la dist/
