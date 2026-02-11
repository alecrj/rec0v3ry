---
paths:
  - "src/**/*.ts"
  - "app/api/**/*.ts"
---

# Security Rules

## Input Validation
- Validate ALL user input at API boundaries
- Use Zod schemas for type-safe validation
- Sanitize data before database queries
- Never trust client-side validation alone

## OWASP Top 10 Prevention
- SQL Injection: Use parameterized queries (Drizzle ORM)
- XSS: Sanitize output, use CSP headers
- CSRF: Use tokens on state-changing operations
- Broken Auth: Implement proper session management
- Sensitive Data: Encrypt, don't log

## Secrets Management
- NEVER hardcode secrets, API keys, or credentials
- Use environment variables
- Document required secrets in .env.example (without values)

## Error Handling
- Never expose stack traces to users
- Log detailed errors server-side
- Return generic error messages to clients
- Include correlation IDs for debugging
