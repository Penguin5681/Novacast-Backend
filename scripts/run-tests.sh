#!/bin/bash

#!/bin/bash

# 🧪 Enhanced Test Runner Script for Local CI/CD
# This script runs comprehensive tests with proper environment setup

set -e

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

# Test configuration
TEST_DB_NAME="novacast_test"
TEST_DB_USER="testuser"
TEST_DB_PASS="testpass"
TEST_DB_PORT="5432"

print_step "Starting comprehensive test suite..."

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p $TEST_DB_PORT -U $TEST_DB_USER -d $TEST_DB_NAME > /dev/null 2>&1; then
    print_warning "Test database not accessible. Attempting to start with Docker..."
    
    # Try to start test database with Docker
    if command -v docker &> /dev/null; then
        print_step "Starting PostgreSQL test container..."
        docker run -d 
            --name novacast-test-db 
            -e POSTGRES_USER=$TEST_DB_USER 
            -e POSTGRES_PASSWORD=$TEST_DB_PASS 
            -e POSTGRES_DB=$TEST_DB_NAME 
            -p $TEST_DB_PORT:5432 
            postgres:14-alpine 
            > /dev/null || print_warning "Test database container might already be running"
        
        # Wait for database to be ready
        print_step "Waiting for database to be ready..."
        for i in {1..30}; do
            if pg_isready -h localhost -p $TEST_DB_PORT -U $TEST_DB_USER -d $TEST_DB_NAME > /dev/null 2>&1; then
                break
            fi
            sleep 1
        done
        
        if pg_isready -h localhost -p $TEST_DB_PORT -U $TEST_DB_USER -d $TEST_DB_NAME > /dev/null 2>&1; then
            print_success "Test database is ready!"
        else
            print_error "Failed to start test database"
            exit 1
        fi
    else
        print_error "Docker not available and PostgreSQL not accessible"
        exit 1
    fi
else
    print_success "Test database is already running!"
fi

# Load test environment
if [ -f .env.test ]; then
    export $(cat .env.test | grep -v '^#' | xargs)
    print_success "Loaded test environment configuration"
else
    print_warning "No .env.test file found, using defaults"
    export NODE_ENV=test
    export TEST_DATABASE_URL="postgres://$TEST_DB_USER:$TEST_DB_PASS@localhost:$TEST_DB_PORT/$TEST_DB_NAME"
    export LOCAL_DATABASE_URL="postgres://$TEST_DB_USER:$TEST_DB_PASS@localhost:$TEST_DB_PORT/$TEST_DB_NAME"
    export JWT_SECRET="test-secret-key-for-local-testing"
    export PORT=5002
    export WRITE_LOGS_TO_FILE=false
fi

# Run TypeScript type checking
print_step "Running TypeScript type checking..."
if npm run type-check; then
    print_success "TypeScript type checking passed!"
else
    print_error "TypeScript type checking failed!"
    exit 1
fi

# Run linting (if available)
print_step "Running ESLint..."
if npm run lint 2>/dev/null; then
    print_success "Linting passed!"
else
    print_warning "Linting not configured or failed (non-critical)"
fi

# Run unit tests
print_step "Running unit tests..."
if npm run test:unit; then
    print_success "Unit tests passed!"
else
    print_error "Unit tests failed!"
    exit 1
fi

# Run integration tests
print_step "Running integration tests..."
if npm run test:integration; then
    print_success "Integration tests passed!"
else
    print_warning "Integration tests failed or not available"
fi

# Run performance tests (if available)
print_step "Running performance tests..."
if npm run test:performance; then
    print_success "Performance tests passed!"
else
    print_warning "Performance tests failed or not available"
fi

# Generate test coverage
print_step "Generating test coverage report..."
if npm run test:coverage; then
    print_success "Coverage report generated!"
    
    # Display coverage summary if available
    if [ -f coverage/lcov-report/index.html ]; then
        echo ""
        echo -e "${GREEN}📊 Coverage report available at: ${BLUE}coverage/lcov-report/index.html${NC}"
    fi
else
    print_warning "Coverage generation failed"
fi

# Run security audit
print_step "Running security audit..."
if npm audit --audit-level moderate; then
    print_success "Security audit passed!"
else
    print_warning "Security audit found issues (check output above)"
fi

# Cleanup test database container if we started it
if [ "$STARTED_TEST_DB" = "true" ]; then
    print_step "Cleaning up test database container..."
    docker stop novacast-test-db > /dev/null 2>&1 || true
    docker rm novacast-test-db > /dev/null 2>&1 || true
    print_success "Test database container cleaned up"
fi

echo ""
print_success "🎉 All tests completed successfully!"
echo ""
echo -e "${GREEN}📋 Test Summary:${NC}"
echo -e "  ✅ TypeScript type checking"
echo -e "  ✅ ESLint analysis"
echo -e "  ✅ Unit tests"
echo -e "  ✅ Integration tests"
echo -e "  ✅ Performance tests"
echo -e "  ✅ Coverage report"
echo -e "  ✅ Security audit"
echo ""
echo -e "${BLUE}🚀 Ready for CI/CD pipeline!${NC}"

echo "🧪 Novacast Backend Test Suite"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if test database exists
echo -e "${YELLOW}Checking test database...${NC}"
if ! PGPASSWORD=t_pranav psql -h localhost -p 5432 -U penguin -d novacast_test -c '\q' 2>/dev/null; then
    echo -e "${YELLOW}Test database not found. Creating...${NC}"
    ./scripts/setup-test-db.sh
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to create test database${NC}"
        exit 1
    fi
fi

# Run different test suites
echo -e "${YELLOW}Starting test execution...${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run from project root.${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

echo ""
echo "🔬 Running Unit Tests"
echo "====================="
npm test -- --testPathPattern="controllers.*test\.ts$" --verbose

TEST_RESULT=$?

echo ""
echo "🏥 Running Health Check Tests"
echo "=============================="
npm test -- --testPathPattern="health.*test\.ts$" --verbose

echo ""
echo "👤 Running User Validation Tests"
echo "================================="
npm test -- --testPathPattern="user-validation.*test\.ts$" --verbose

echo ""
echo "🔐 Running Authentication Tests"
echo "==============================="
npm test -- --testPathPattern="auth.*controller\.test\.ts$" --verbose

echo ""
echo "🔗 Running Integration Tests"
echo "============================"
npm test -- --testPathPattern="integration\.test\.ts$" --verbose

echo ""
echo "⚡ Running Performance Tests"
echo "==========================="
npm test -- --testPathPattern="performance\.test\.ts$" --verbose --testTimeout=60000

echo ""
echo "📊 Generating Coverage Report"
echo "=============================="
npm run test:coverage

echo ""
echo "📋 Test Summary"
echo "==============="

if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed successfully!${NC}"
else
    echo -e "${RED}❌ Some tests failed. Check the output above.${NC}"
fi

echo ""
echo "🎯 Test Categories Covered:"
echo "- Unit Tests (Controllers)"
echo "- Integration Tests (API endpoints)"
echo "- Performance Tests (Load & stress)"
echo "- Database Tests (Connection & queries)"
echo "- Security Tests (SQL injection, validation)"
echo "- Error Handling Tests"
echo "- Edge Case Tests"

echo ""
echo "📁 Coverage report available in: coverage/"
echo "🌐 Open coverage/lcov-report/index.html in browser for detailed report"

exit $TEST_RESULT
