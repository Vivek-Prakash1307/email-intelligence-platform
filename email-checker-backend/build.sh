#!/bin/bash

# Email Intelligence Platform Build Script
# Enhanced version with error handling and optimizations

set -e  # Exit on any error

echo "🚀 Building Email Intelligence Platform..."

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go 1.19 or higher."
    exit 1
fi

# Check Go version
GO_VERSION=$(go version | cut -d' ' -f3 | cut -d'o' -f2)
echo "✅ Using Go version: $GO_VERSION"

# Set build environment variables
export CGO_ENABLED=0
export GOOS=linux
export GOARCH=amd64

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -f main email-intelligence-platform

# Download dependencies
echo "📦 Downloading dependencies..."
go mod tidy
go mod download

# Verify dependencies
echo "🔍 Verifying dependencies..."
go mod verify

# Run tests (if any)
if [ -f "*_test.go" ]; then
    echo "🧪 Running tests..."
    go test -v ./...
fi

# Build with optimizations
echo "🔨 Building optimized binary..."
go build -ldflags="-w -s -X main.version=$(git describe --tags --always --dirty) -X main.buildTime=$(date -u +%Y%m%d.%H%M%S)" -a -o main .

# Check if build was successful
if [ -f "main" ]; then
    echo "✅ Build successful!"
    echo "📊 Binary size: $(du -h main | cut -f1)"
    echo "🏃‍♂️ You can now run: ./main"
else
    echo "❌ Build failed!"
    exit 1
fi

# Optional: Create a backup with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp main "main_backup_$TIMESTAMP" 2>/dev/null || true

echo "🎉 Email Intelligence Platform build completed successfully!"