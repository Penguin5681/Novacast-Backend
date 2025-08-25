# Novacast Backend API

This document provides an overview of the Novacast Backend API endpoints.

## API Endpoints

### Authentication

#### `POST /api/auth/signup`

Registers a new user.

**Request Body:**

```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "handle": "testuser"
}
```

**Success Response (201):**

```json
{
  "message": "User created successfully"
}
```

**Error Response (400):**

```json
{
  "message": "All fields are required"
}
```

---

#### `POST /api/auth/login`

Logs in an existing user.

**Request Body:**

```json
{
  "identifier": "testuser",
  "password": "password123"
}
```

**Success Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "handle": "testuser",
    "created_at": "2025-08-24T10:00:00.000Z",
    "updated_at": "2025-08-24T10:00:00.000Z"
  }
}
```

**Error Response (401):**

```json
{
  "error": "Invalid credentials"
}
```

---

### Health Check

#### `GET /api/health`

Checks the health of the server and database connection.

**Success Response (200):**

```json
{
  "server": "ok",
  "database": "ok"
}
```

**Error Response (500):**

```json
{
  "server": "ok",
  "database": "error",
  "details": "Error message"
}
```

---

### User Validation

#### `POST /api/users/username-check`

Checks if a username is available.

**Request Body:**

```json
{
  "username": "testuser"
}
```

**Success Response (200):**

```json
{
  "username": "testuser",
  "exists": true,
  "available": false
}
```

**Error Response (400):**

```json
{
  "error": "Username is required and must be a non-empty string"
}
```

---

#### `POST /api/users/email-check`

Checks if an email is available.

**Request Body:**

```json
{
  "email": "test@example.com"
}
```

**Success Response (200):**

```json
{
  "email": "test@example.com",
  "exists": true,
  "available": false
}
```

**Error Response (400):**

```json
{
  "error": "Email is required and must be a non-empty string"
}
```
