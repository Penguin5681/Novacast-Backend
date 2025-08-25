# 🚀 Novacast Backend - Local CI/CD Pipeline

This document describes the complete CI/CD pipeline setup for local development and testing using GitHub Actions and Act.

## 📋 Overview

The CI/CD pipeline includes:
- **Test Suite**: Unit, integration, and performance tests
- **Code Quality**: TypeScript checking, ESLint, security audit
- **Build Process**: Docker image creation and artifact generation
- **Local Testing**: Act for running GitHub Actions locally
- **Environment Management**: Docker Compose for database and services

## 🎯 Quick Start

### 1. Initial Setup
```bash
# Run the setup script to configure everything
./scripts/setup-local-ci.sh

# Or manually install Act
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

### 2. Local CI/CD Testing
```bash
# Run complete pipeline locally
npm run ci:local

# Run specific jobs
npm run act:test        # Tests only
npm run act:quality     # Code quality only
npm run act:build       # Build only
```

### 3. Docker Development
```bash
# Start development environment
npm run docker:dev

# Run tests in Docker
npm run docker:test

# Stop all containers
npm run docker:down
```

## 🧪 Testing Commands

### Local Testing (without Docker)
```bash
npm test                # Run all tests
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only
npm run test:coverage   # With coverage report
npm run test:performance # Performance tests
```

### CI/CD Testing with Act
```bash
./scripts/run-act.sh test       # Run test job
./scripts/run-act.sh quality    # Run quality job
./scripts/run-act.sh all        # Run complete pipeline
./scripts/run-act.sh help       # Show all options
```

## 🏗️ Pipeline Jobs

### 1. Test Job (`test`)
- Sets up PostgreSQL test database
- Runs unit and integration tests
- Generates coverage reports
- Uploads coverage to Codecov (on push)

### 2. Quality Job (`quality`)
- TypeScript type checking
- ESLint analysis
- Security audit with npm audit

### 3. Performance Job (`performance`)
- Runs performance tests
- Only executes on main branches
- Tests with realistic data loads

### 4. Build Job (`build`)
- Compiles TypeScript
- Creates build artifacts
- Builds Docker image
- Uploads artifacts for deployment testing

### 5. Local Deploy Job (`local-deploy`)
- Tests Docker image deployment
- Runs health checks
- Simulates production environment

## 🐳 Docker Configuration

### Development Setup
```bash
# Start PostgreSQL + backend in development mode
docker-compose up -d postgres-dev
docker-compose up backend-dev

# Check logs
docker-compose logs -f backend-dev
```

### Testing Setup
```bash
# Run tests in isolated environment
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### Production Simulation
```bash
# Build and run production-like environment
docker-compose --profile production up -d
```

## 🔧 Configuration Files

### GitHub Actions
- `.github/workflows/ci-cd.yml` - Main CI/CD pipeline
- Triggers on push to main branches and pull requests
- Uses PostgreSQL service for database tests

### Act Configuration
- `.actrc` - Act runner configuration
- `.secrets.example` - Template for local secrets
- `.secrets` - Your local environment variables (not in git)

### Docker
- `Dockerfile` - Multi-stage build (development/production)
- `docker-compose.yml` - Full development environment
- `docker-compose.test.yml` - Testing environment

### Environment
- `.env.test` - Test environment variables
- `.env.example` - Template for development environment

## 🔍 Debugging

### View Act Logs
```bash
# Run with verbose output
act --verbose

# Check specific job
act -j test --verbose

# List available jobs
act -l
```

### Check Docker
```bash
# View running containers
docker ps

# Check container logs
docker logs novacast-backend-dev

# Access container shell
docker exec -it novacast-backend-dev bash
```

### Database Connection
```bash
# Test database connection
pg_isready -h localhost -p 5432 -U testuser -d novacast_test

# Connect to database
psql postgres://testuser:testpass@localhost:5432/novacast_test
```

## 🛠️ Customization

### Adding New Tests
1. Create test files in `src/__tests__/`
2. Update `package.json` scripts if needed
3. Tests will automatically run in CI/CD pipeline

### Modifying Pipeline
1. Edit `.github/workflows/ci-cd.yml`
2. Test locally with Act: `act`
3. Commit changes to trigger remote pipeline

### Environment Variables
1. Update `.secrets` for Act testing
2. Update `.env.test` for local testing
3. Add new variables to GitHub Actions workflow

## 📊 Reports and Artifacts

### Coverage Reports
- Generated in `coverage/` directory
- Available as HTML: `coverage/lcov-report/index.html`
- Uploaded to Codecov on main branch pushes

### Build Artifacts
- TypeScript compiled to `dist/`
- Docker images tagged with commit SHA
- Artifacts stored for 7 days in GitHub Actions

### Logs
- Application logs in `logs/` directory
- CI/CD logs in GitHub Actions interface
- Act logs in terminal output

## 🚀 Production Considerations

### Security
- Secrets are never committed to repository
- Database credentials use environment variables
- JWT secrets are configurable per environment

### Performance
- Tests run in parallel where possible
- Docker images use multi-stage builds
- Database connections are pooled

### Monitoring
- Health check endpoints available
- Application metrics can be added
- Log aggregation ready for ELK stack

## 🔗 Integration Options

### Code Quality Tools
- SonarQube integration ready
- CodeClimate compatibility
- Snyk security scanning

### Deployment Targets
- Docker registry publishing
- Kubernetes deployment manifests
- Cloud provider integrations

### Monitoring & Observability
- Prometheus metrics endpoints
- OpenTelemetry tracing
- Structured logging with Pino

## 📚 Additional Resources

- [Act Documentation](https://github.com/nektos/act)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Jest Testing Framework](https://jestjs.io/)
- [TypeScript Configuration](https://www.typescriptlang.org/tsconfig)

## 🆘 Troubleshooting

### Common Issues

1. **Act fails to start**
   - Ensure Docker is running
   - Check `.secrets` file exists
   - Verify Act installation: `act --version`

2. **Database connection fails**
   - Check PostgreSQL is running: `pg_isready`
   - Verify connection string in `.env.test`
   - Restart database container

3. **Tests fail in CI but pass locally**
   - Check environment variables match
   - Verify database state is clean
   - Review Act vs GitHub Actions differences

4. **Docker build fails**
   - Check Dockerfile syntax
   - Verify all dependencies are listed
   - Clear Docker cache: `docker system prune`

### Getting Help

1. Check the logs first: `docker-compose logs`
2. Run tests verbosely: `npm run test:verbose`
3. Test specific components: `npm run test:health`
4. Review configuration files for syntax errors
