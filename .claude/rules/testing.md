---
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "tests/**/*"
---

# Testing Rules

## Required Coverage
- Unit tests for all business logic
- Integration tests for API endpoints
- Security tests for auth/authz
- Audit log verification tests

## Security Testing
- Test authentication bypass attempts
- Test authorization (access control) at every endpoint
- Test input validation edge cases
- Test for information leakage

## Compliance Testing
- Verify audit logs are created for sensitive operations
- Verify encryption at rest
- Verify session management
- Verify consent workflows
