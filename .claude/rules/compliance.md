---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
  - "app/**/*.ts"
  - "app/**/*.tsx"
---

# Compliance Rules (HIPAA + 42 CFR Part 2)

## Data Handling
- NEVER log PHI (Protected Health Information) or SUD (Substance Use Disorder) data
- NEVER expose resident names, diagnoses, or treatment info in error messages
- ALWAYS encrypt PII at rest and in transit
- ALWAYS use minimum necessary access principle

## Audit Logging Requirements
Every sensitive operation MUST log:
- Timestamp (ISO 8601 UTC)
- User ID (who performed action)
- Action type (create, read, update, delete)
- Resource type and ID
- IP address and user agent
- Success/failure status
- For reads: what data was accessed

## Authentication & Authorization
- Multi-factor authentication for staff
- Session timeout after 15 minutes of inactivity
- Device trust verification
- RBAC on every API endpoint - verify before data access

## 42 CFR Part 2 Specific
- Consent must be obtained BEFORE sharing SUD records
- Consent forms must meet regulatory requirements
- Redisclosure prohibition must be enforced
- Breach notification within 60 days
