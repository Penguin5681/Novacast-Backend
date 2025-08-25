#!/bin/bash

# 🎬 Act Local CI/CD Runner
# This script helps you run GitHub Actions locally using Act

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

# Check if Act is installed
if ! command -v act &> /dev/null; then
    print_error "Act is not installed. Please run 'scripts/setup-local-ci.sh' first."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Ensure .secrets file exists
if [ ! -f .secrets ]; then
    print_warning "No .secrets file found. Creating from template..."
    cp .secrets.example .secrets
    print_warning "Please edit .secrets file with your actual values!"
fi

# Function to run specific job
run_job() {
    local job_name=$1
    print_step "Running job: $job_name"
    
    case $job_name in
        "test")
            act -j test --secret-file .secrets
            ;;
        "quality")
            act -j quality --secret-file .secrets
            ;;
        "performance")
            act -j performance --secret-file .secrets
            ;;
        "build")
            act -j build --secret-file .secrets
            ;;
        "local-deploy")
            act -j local-deploy --secret-file .secrets
            ;;
        "all")
            act --secret-file .secrets
            ;;
        *)
            print_error "Unknown job: $job_name"
            print_step "Available jobs: test, quality, performance, build, local-deploy, all"
            exit 1
            ;;
    esac
}

# Function to list available jobs
list_jobs() {
    print_step "Available GitHub Actions jobs:"
    echo -e "  ${GREEN}test${NC}         - Run test suite with PostgreSQL"
    echo -e "  ${GREEN}quality${NC}      - Run TypeScript checking, linting, and security audit"
    echo -e "  ${GREEN}performance${NC}  - Run performance tests"
    echo -e "  ${GREEN}build${NC}        - Build application and Docker image"
    echo -e "  ${GREEN}local-deploy${NC} - Test local deployment"
    echo -e "  ${GREEN}all${NC}          - Run complete CI/CD pipeline"
}

# Function to show Act events
show_events() {
    print_step "Available trigger events:"
    echo -e "  ${GREEN}push${NC}         - Simulate push event"
    echo -e "  ${GREEN}pull_request${NC} - Simulate pull request event"
    echo -e "  ${GREEN}workflow_dispatch${NC} - Manual trigger"
}

# Parse command line arguments
case "${1:-}" in
    "test"|"t")
        run_job "test"
        ;;
    "quality"|"q")
        run_job "quality"
        ;;
    "performance"|"p")
        run_job "performance"
        ;;
    "build"|"b")
        run_job "build"
        ;;
    "deploy"|"d")
        run_job "local-deploy"
        ;;
    "all"|"a"|"")
        run_job "all"
        ;;
    "list"|"l")
        list_jobs
        ;;
    "events"|"e")
        show_events
        ;;
    "help"|"h"|"--help")
        echo ""
        echo -e "${BLUE}🎬 Act Local CI/CD Runner${NC}"
        echo ""
        echo -e "${GREEN}Usage:${NC}"
        echo -e "  $0 [command]"
        echo ""
        echo -e "${GREEN}Commands:${NC}"
        echo -e "  ${BLUE}test, t${NC}         Run test job"
        echo -e "  ${BLUE}quality, q${NC}      Run quality job"
        echo -e "  ${BLUE}performance, p${NC}  Run performance job"
        echo -e "  ${BLUE}build, b${NC}        Run build job"
        echo -e "  ${BLUE}deploy, d${NC}       Run local deploy job"
        echo -e "  ${BLUE}all, a${NC}          Run complete pipeline (default)"
        echo -e "  ${BLUE}list, l${NC}         List available jobs"
        echo -e "  ${BLUE}events, e${NC}       Show available events"
        echo -e "  ${BLUE}help, h${NC}         Show this help"
        echo ""
        echo -e "${GREEN}Examples:${NC}"
        echo -e "  $0                # Run complete pipeline"
        echo -e "  $0 test           # Run only tests"
        echo -e "  $0 quality        # Run only quality checks"
        echo ""
        echo -e "${GREEN}Environment:${NC}"
        echo -e "  Configuration: ${BLUE}.actrc${NC}"
        echo -e "  Secrets: ${BLUE}.secrets${NC}"
        echo -e "  Workflow: ${BLUE}.github/workflows/ci-cd.yml${NC}"
        echo ""
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for usage information."
        exit 1
        ;;
esac

print_success "Act execution completed!"

# Show next steps
echo ""
print_step "💡 What's next?"
echo -e "  • Check logs above for any issues"
echo -e "  • Run ${BLUE}$0 list${NC} to see all available jobs"
echo -e "  • Edit ${BLUE}.secrets${NC} to customize environment variables"
echo -e "  • View workflow file: ${BLUE}.github/workflows/ci-cd.yml${NC}"
