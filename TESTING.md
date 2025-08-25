# Novacast Backend - Testing Documentation

## Overview

This project includes a comprehensive testing suite covering unit tests, integration tests, performance tests, and security tests for all controllers and API endpoints.

## Test Stack

- **Jest**: Testing framework with TypeScript support
- **Supertest**: HTTP integration testing
- **PostgreSQL**: Test database for integration tests
- **Custom helpers**: Performance testing and load testing utilities

## Test Structure

```
src/__tests__/
├── setup.ts                    # Test environment setup
├── helpers.ts                  # Test utilities and helpers
├── controllers/
│   ├── auth.controller.test.ts           # Authentication tests
│   ├── health.controller.test.ts         # Health check tests
│   └── user-validation.controller.test.ts # User validation tests
├── integration.test.ts         # Full API integration tests
└── performance.test.ts         # Performance and stress tests
```

## Test Categories

### 1. Unit Tests
- **Auth Controller**: Registration, login, password hashing, JWT generation
- **Health Controller**: Database connectivity, error handling
- **User Validation Controller**: Username/email availability checks

### 2. Integration Tests
- Full user registration workflow
- Authentication flows
- API endpoint interactions
- CORS handling
- Error responses

### 3. Performance Tests
- Response time benchmarks
- Concurrent load testing
- Sustained load testing
- Database performance
- Memory usage patterns

### 4. Security Tests
- SQL injection prevention
- Input validation
- Password security
- JWT token validation
- Error message security

### 5. Edge Case Tests
- Malformed requests
- Large datasets
- Unicode handling
- Special characters
- Database connection failures

## Setup and Configuration

### Prerequisites

1. **PostgreSQL** must be running on localhost:5432
2. **Node.js** and npm installed
3. Environment variables configured

### Database Setup

The test suite uses a separate database (`novacast_test`) to avoid affecting development data:

```bash
# Automatic setup
npm run test:setup

# Manual setup
./scripts/setup-test-db.sh
```

### Environment Variables

Create `.env.test` with test-specific configuration:

```env
PORT=5002
NODE_ENV=test
TEST_DATABASE_URL=postgres://penguin:t_pranav@localhost:5432/novacast_test
JWT_SECRET=test_secret_key_for_testing_only
WRITE_LOGS_TO_FILE=false
```

## Running Tests

### Quick Start

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:performance   # Performance tests only
npm run test:auth         # Auth controller tests
npm run test:health       # Health controller tests
npm run test:validation   # User validation tests

# Run comprehensive test suite
npm run test:all
```

### Watch Mode

```bash
# Run tests in watch mode for development
npm run test:watch
```

### Verbose Output

```bash
# Detailed test output
npm run test:verbose
```

## Test Features

### Performance Benchmarks

- Health checks: < 100ms average
- User validation: < 200ms average
- Registration: < 1 second
- Login: < 500ms
- Database queries: < 100ms

### Load Testing Capabilities

- Concurrent request handling (up to 50 simultaneous)
- Sustained load testing (30+ seconds)
- Burst traffic patterns
- Database connection pooling tests

### Security Validations

- SQL injection attempt prevention
- Input sanitization
- Password hashing verification
- JWT token integrity
- Sensitive data exposure prevention

## Test Utilities

### Helper Functions

```typescript
// User data generation
generateTestUser(overrides?)
generateMultipleTestUsers(count)

// Database helpers
insertTestUser(userData?)
insertMultipleTestUsers(count)

// Performance testing
measureResponseTime(requestFn)
performLoadTest(requestFn, concurrentRequests, iterations)

// Response validation
expectSuccess(response, expectedStatus)
expectValidationError(response, field?)
expectAuthError(response)
expectServerError(response)

// Database mocking
mockDatabaseError()
```

### Test Data Management

Tests automatically:
- Create isolated test data
- Clean up after each test
- Handle database transactions
- Generate unique test users
- Manage test database state

## Coverage Reports

Coverage reports are generated in the `coverage/` directory:

- **Text summary**: Console output
- **LCOV report**: `coverage/lcov-report/index.html`
- **HTML report**: Detailed line-by-line coverage

### Coverage Targets

- **Statements**: > 90%
- **Branches**: > 85%
- **Functions**: > 95%
- **Lines**: > 90%

## Continuous Integration

### GitHub Actions (recommended)

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:setup
      - run: npm run test:coverage
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check PostgreSQL is running
   pg_isready -h localhost -p 5432
   
   # Recreate test database
   npm run test:setup
   ```

2. **Port Conflicts**
   ```bash
   # Check if test port is available
   lsof -i :5002
   ```

3. **Memory Issues with Large Tests**
   ```bash
   # Increase Node.js memory limit
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm test
   ```

4. **Jest Timeout Errors**
   ```bash
   # Run with increased timeout
   npm test -- --testTimeout=30000
   ```

### Debug Mode

```bash
# Run with debug logging
DEBUG=* npm test

# Run specific test file
npm test -- auth.controller.test.ts

# Run with Node.js inspector
node --inspect-brk node_modules/.bin/jest auth.controller.test.ts
```

## Performance Monitoring

### Key Metrics Tracked

- Response times (average, min, max)
- Success rates under load
- Database query performance
- Memory usage patterns
- Concurrent request handling

### Performance Thresholds

Tests will fail if performance degrades beyond:
- 50% increase in response time
- Success rate below 95%
- Memory leaks detected
- Database connection issues

## Best Practices

### Writing New Tests

1. **Use descriptive test names**
   ```typescript
   test('should register user with valid data and return 201', async () => {
   ```

2. **Follow AAA pattern** (Arrange, Act, Assert)
   ```typescript
   // Arrange
   const userData = generateTestUser();
   
   // Act
   const response = await request(app).post('/register').send(userData);
   
   // Assert
   expectSuccess(response, 201);
   ```

3. **Clean up test data**
   ```typescript
   afterEach(async () => {
     await testPool.query('DELETE FROM users');
   });
   ```

4. **Use helper functions**
   ```typescript
   // Instead of manual setup
   const user = await insertTestUser();
   ```

5. **Test error conditions**
   ```typescript
   test('should handle database connection failure', async () => {
     const restoreMock = mockDatabaseError();
     // ... test code
     restoreMock();
   });
   ```

### Performance Testing Guidelines

1. **Set realistic thresholds**
2. **Test with representative data**
3. **Monitor resource usage**
4. **Test concurrent scenarios**
5. **Validate under sustained load**

## Contributing

When adding new controllers or endpoints:

1. Create corresponding test files
2. Follow existing test patterns
3. Include performance benchmarks
4. Add security validations
5. Update this documentation
6. Ensure coverage targets are met

## Resources

- [Jest Documentation](https://jestjs.io/docs/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [PostgreSQL Testing Best Practices](https://www.postgresql.org/docs/current/regress.html)
- [Node.js Performance Testing](https://nodejs.org/en/docs/guides/simple-profiling/)
