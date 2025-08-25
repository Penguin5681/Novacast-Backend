#!/bin/bash

# 🚀 Novacast Backend - Local CI/CD Setup Script
# This script sets up your local development environment for CI/CD testing

set -e

echo "🎬 Setting up Novacast Backend Local CI/CD Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if required tools are installed
print_step "Checking required tools..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_success "All required tools are available!"

# Install Act if not present
print_step "Checking for Act (GitHub Actions local runner)..."
if ! command -v act &> /dev/null; then
    print_warning "Act is not installed. Installing Act..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux installation
        curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS installation
        if command -v brew &> /dev/null; then
            brew install act
        else
            print_error "Please install Homebrew first or install Act manually from: https://github.com/nektos/act"
            exit 1
        fi
    else
        print_error "Please install Act manually from: https://github.com/nektos/act"
        exit 1
    fi
    
    if command -v act &> /dev/null; then
        print_success "Act installed successfully!"
    else
        print_error "Failed to install Act. Please install manually."
        exit 1
    fi
else
    print_success "Act is already installed!"
fi

# Install project dependencies
print_step "Installing project dependencies..."
npm ci
print_success "Dependencies installed!"

# Setup environment files
print_step "Setting up environment configuration..."

# Create .secrets file for Act if it doesn't exist
if [ ! -f .secrets ]; then
    cp .secrets.example .secrets
    print_success "Created .secrets file from template"
    print_warning "Please edit .secrets file with your actual values!"
else
    print_success ".secrets file already exists"
fi

# Create .env.test if it doesn't exist
if [ ! -f .env.test ]; then
    cat > .env.test << 'EOF'
# Test Environment Configuration
NODE_ENV=test
TEST_DATABASE_URL=postgres://testuser:testpass@localhost:5432/novacast_test
LOCAL_DATABASE_URL=postgres://testuser:testpass@localhost:5432/novacast_test
JWT_SECRET=test-secret-key-for-local-testing
PORT=5002
WRITE_LOGS_TO_FILE=false
EOF
    print_success "Created .env.test file"
else
    print_success ".env.test file already exists"
fi

# Make scripts executable
print_step "Making scripts executable..."
chmod +x scripts/*.sh 2>/dev/null || true
print_success "Scripts are now executable!"

# Setup Docker environment
print_step "Setting up Docker environment..."

# Build Docker images
docker build -t novacast-backend:latest .
print_success "Docker image built successfully!"

# Test Docker Compose
print_step "Testing Docker Compose configuration..."
docker-compose config > /dev/null
print_success "Docker Compose configuration is valid!"

# Create initial database setup script
print_step "Creating database initialization script..."
cat > scripts/init-dev-db.sql << 'EOF'
-- Development Database Initialization
-- This script runs when the development PostgreSQL container starts

-- Create additional users if needed
-- CREATE USER app_user WITH PASSWORD 'app_pass';
-- GRANT ALL PRIVILEGES ON DATABASE novacast_dev TO app_user;

-- Create extensions if needed
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log initialization
\echo 'Development database initialized successfully!'
EOF
print_success "Database initialization script created!"

# Provide usage instructions
echo ""
print_step "🎉 Setup Complete! Here's how to use your local CI/CD:"
echo ""
echo -e "${GREEN}📖 Quick Start Commands:${NC}"
echo -e "  ${BLUE}npm run ci:local${NC}           - Run full CI/CD pipeline locally with Act"
echo -e "  ${BLUE}npm run ci:test-only${NC}       - Run only tests locally with Act"
echo -e "  ${BLUE}npm run act:quality${NC}        - Run code quality checks with Act"
echo -e "  ${BLUE}npm run docker:dev${NC}         - Start development environment with Docker"
echo -e "  ${BLUE}npm run docker:test${NC}        - Run tests in Docker environment"
echo ""
echo -e "${GREEN}🐳 Docker Commands:${NC}"
echo -e "  ${BLUE}npm run docker:build${NC}       - Build Docker image"
echo -e "  ${BLUE}npm run docker:dev${NC}         - Start development containers"
echo -e "  ${BLUE}npm run docker:down${NC}        - Stop all containers"
echo ""
echo -e "${GREEN}🧪 Testing Commands:${NC}"
echo -e "  ${BLUE}npm run test${NC}               - Run all tests locally"
echo -e "  ${BLUE}npm run test:coverage${NC}      - Run tests with coverage"
echo -e "  ${BLUE}npm run test:unit${NC}          - Run only unit tests"
echo ""
echo -e "${YELLOW}⚠️  Important Notes:${NC}"
echo -e "  1. Edit ${BLUE}.secrets${NC} file with your actual values"
echo -e "  2. Make sure Docker is running before using Docker commands"
echo -e "  3. Act requires Docker to run GitHub Actions locally"
echo -e "  4. First Act run may take longer as it downloads Docker images"
echo ""
print_success "Local CI/CD environment is ready! 🚀"
