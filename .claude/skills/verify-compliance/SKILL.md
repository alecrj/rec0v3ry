---
name: verify-compliance
description: Run comprehensive compliance verification on current codebase or specified files.
allowed-tools: Read, Grep, Glob, Bash
argument-hint: [optional: specific file or directory]
user-invocable: true
---

Run compliance verification on: $ARGUMENTS (or entire codebase if not specified)

## Verification Steps

### 1. Audit Logging Check
- Verify all sensitive operations have audit logging
- Check log structure includes required fields
- Verify no PHI/SUD data in logs

### 2. Authentication/Authorization Check
- All API routes have auth middleware
- RBAC checks before data access
- Session management properly configured

### 3. Data Protection Check
- Encryption at rest configured
- Encryption in transit (HTTPS only)
- No hardcoded secrets
- Environment variables for all secrets

### 4. Input Validation Check
- All endpoints validate input
- Zod schemas or equivalent
- SQL injection prevention

### 5. Consent Tracking (42 CFR Part 2)
- Consent model exists
- Consent checked before sharing SUD data
- Consent forms meet requirements

## Output
Generate a compliance report with:
- Overall status (PASS/FAIL/WARN)
- Detailed findings per category
- Remediation steps for any failures
- Files that need attention
