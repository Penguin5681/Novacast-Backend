#!/bin/bash

# 🔧 Docker Permissions Fix for Act
# This script resolves Docker permissions issues when running Act locally

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

print_step "Fixing Docker permissions for Act..."

# Check if user is already in docker group
if groups $USER | grep -q '\bdocker\b'; then
    print_success "User $USER is already in the docker group"
else
    print_step "Adding user $USER to docker group..."
    sudo usermod -aG docker $USER
    print_success "User added to docker group"
    print_warning "You need to log out and log back in for group changes to take effect"
    print_warning "OR run: newgrp docker"
fi

# Check Docker daemon status
print_step "Checking Docker daemon status..."
if systemctl is-active --quiet docker; then
    print_success "Docker daemon is running"
else
    print_warning "Docker daemon is not running. Starting it..."
    sudo systemctl start docker
    sudo systemctl enable docker
    print_success "Docker daemon started and enabled"
fi

# Test Docker access
print_step "Testing Docker access..."
if docker info > /dev/null 2>&1; then
    print_success "Docker access is working!"
else
    print_warning "Docker access still not working. Trying with newgrp..."
    
    # Create a test script to run after newgrp
    cat > /tmp/test_docker.sh << 'EOF'
#!/bin/bash
if docker info > /dev/null 2>&1; then
    echo "✅ Docker access working after newgrp!"
    exit 0
else
    echo "❌ Docker access still not working"
    exit 1
fi
EOF
    chmod +x /tmp/test_docker.sh
    
    print_step "Running docker test with newgrp..."
    if newgrp docker -c '/tmp/test_docker.sh'; then
        print_success "Docker access fixed with newgrp!"
    else
        print_error "Docker access still not working"
    fi
    
    rm -f /tmp/test_docker.sh
fi

# Check Docker socket permissions
print_step "Checking Docker socket permissions..."
ls -la /var/run/docker.sock

# Provide alternative solutions
echo ""
print_step "🔧 Alternative Solutions if Act still doesn't work:"
echo ""
echo -e "${GREEN}Option 1: Restart your session${NC}"
echo "  1. Log out and log back in (recommended)"
echo "  2. Or run: ${BLUE}newgrp docker${NC}"
echo ""
echo -e "${GREEN}Option 2: Use sudo with Act (temporary fix)${NC}"
echo "  ${BLUE}sudo act -j test${NC}"
echo ""
echo -e "${GREEN}Option 3: Fix socket permissions (if needed)${NC}"
echo "  ${BLUE}sudo chmod 666 /var/run/docker.sock${NC}"
echo "  ${YELLOW}Note: This is less secure, use only for testing${NC}"
echo ""
echo -e "${GREEN}Option 4: Run Act with different platform${NC}"
echo "  ${BLUE}act -j test --platform ubuntu-latest=node:18${NC}"
echo ""

# Create helper scripts for different scenarios
print_step "Creating helper scripts..."

# Script 1: Act with sudo
cat > scripts/act-sudo.sh << 'EOF'
#!/bin/bash
# Run Act with sudo (temporary workaround)
echo "🔧 Running Act with sudo..."
sudo act "$@"
EOF

# Script 2: Act with newgrp
cat > scripts/act-newgrp.sh << 'EOF'
#!/bin/bash
# Run Act with newgrp docker
echo "🔧 Running Act with newgrp docker..."
newgrp docker -c "act $*"
EOF

# Script 3: Act with alternative platform
cat > scripts/act-simple.sh << 'EOF'
#!/bin/bash
# Run Act with simpler platform
echo "🔧 Running Act with simplified platform..."
act --platform ubuntu-latest=node:18-alpine "$@"
EOF

chmod +x scripts/act-*.sh

print_success "Helper scripts created in scripts/ directory"

echo ""
print_step "🎯 Next Steps:"
echo ""
echo "1. ${BLUE}Log out and log back in${NC} (most reliable)"
echo "2. Or try: ${BLUE}newgrp docker${NC}"
echo "3. Then test: ${BLUE}npm run act:test${NC}"
echo ""
echo "If still having issues, try:"
echo "• ${BLUE}./scripts/act-sudo.sh -j test${NC}"
echo "• ${BLUE}./scripts/act-newgrp.sh -j test${NC}"
echo "• ${BLUE}./scripts/act-simple.sh -j test${NC}"

print_success "Docker permissions setup completed!"
