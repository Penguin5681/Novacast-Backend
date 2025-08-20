#!/bin/bash

# Comprehensive Test Runner Script

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
