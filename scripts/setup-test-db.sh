#!/bin/bash

# Test Database Setup Script

DB_NAME="novacast_test"
DB_USER="penguin"
DB_PASSWORD="t_pranav"
DB_HOST="localhost"
DB_PORT="5432"

echo "Setting up test database: $DB_NAME"

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT; then
    echo "Error: PostgreSQL is not running on $DB_HOST:$DB_PORT"
    echo "Please start PostgreSQL service and try again"
    exit 1
fi

# Drop test database if it exists
echo "Dropping existing test database if it exists..."
PGPASSWORD=$DB_PASSWORD dropdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null || true

# Create test database
echo "Creating test database: $DB_NAME"
PGPASSWORD=$DB_PASSWORD createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME

if [ $? -eq 0 ]; then
    echo "Test database created successfully"
else
    echo "Error: Failed to create test database"
    exit 1
fi

# Create tables in test database
echo "Creating tables in test database..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    handle VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_handle ON users(handle);

-- Insert a test user for verification
INSERT INTO users (username, email, password_hash, handle) 
VALUES ('test_setup_user', 'test@setup.com', 'hashed_password', '@test_setup') 
ON CONFLICT DO NOTHING;

EOF

if [ $? -eq 0 ]; then
    echo "Tables created successfully"
    echo "Test database setup complete!"
    
    # Verify setup
    echo "Verifying database setup..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\dt"
    
    echo ""
    echo "Test database is ready for testing!"
    echo "Database: $DB_NAME"
    echo "Connection string: postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
else
    echo "Error: Failed to create tables"
    exit 1
fi
