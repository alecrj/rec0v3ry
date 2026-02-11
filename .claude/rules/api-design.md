---
paths:
  - "app/api/**/*.ts"
  - "src/server/**/*.ts"
---

# API Design Rules

## Authentication
- Every endpoint MUST verify authentication
- Use middleware for auth checks
- Return 401 for unauthenticated, 403 for unauthorized

## Authorization (RBAC)
- Check permissions BEFORE any data access
- Use permission middleware
- Scope queries to user's accessible data
- Never trust client-provided IDs without verification

## Response Format
- Consistent error response structure
- Include request ID for debugging
- Proper HTTP status codes
- Pagination for list endpoints

## Audit Trail
- Log all data access (not just mutations)
- Include user context in logs
- Structured logging (JSON format)
