# Phase 4: Build (Full Product)

## Objective
Implement the complete product using Agent Teams for parallel development.

## Entry Criteria
- Phase 3 complete and validated
- All architecture approved by compliance-expert
- All architecture approved by payments-architect

## Method: Agent Team (5 Parallel Builders)

Spawn 5 specialized teammates:
1. **backend-lead**: Database, API, business logic, auth
2. **frontend-lead**: Operator web app (Next.js)
3. **mobile-lead**: Resident PWA
4. **integrations-lead**: Stripe, webhooks, external APIs
5. **compliance-verifier**: Continuous compliance verification

### Backend Lead Responsibilities
- Database schema implementation (Drizzle ORM)
- All tRPC API routes with auth/authz
- Business logic (billing, admissions, house ops)
- Audit logging infrastructure
- Background jobs (payment processing, notifications)
- Test coverage for all endpoints

### Frontend Lead Responsibilities
- Operator dashboard
- Property/house/bed management UI
- Resident management UI
- Billing and payments UI
- Documents and e-sign UI
- Reporting and exports UI
- Responsive design (desktop-first)

### Mobile Lead Responsibilities
- Resident PWA shell
- Payment and balance views
- Requirements checklist UI
- Request submission
- Messaging UI
- Push notifications setup

### Integrations Lead Responsibilities
- Stripe Connect setup and configuration
- Payment processing flows
- Webhook handlers
- Document storage (S3)
- Email notifications (Resend or similar)

### Compliance Verifier Responsibilities
- Continuous audit log verification
- RBAC enforcement verification
- Security testing
- Code review for compliance issues
- Run `/verify-compliance` regularly

## Coordination
- Shared task list for work items
- Teammates communicate via messaging
- Lead synthesizes progress daily
- compliance-verifier reviews all PRs

## Build Order
1. Foundation: Auth, database, core models
2. Core: Residents, houses, beds, admissions
3. Payments: Ledger, Stripe, billing
4. Operations: Tasks, meetings, requests
5. Documents: Templates, e-sign, storage
6. Messaging: Channels, notifications
7. Mobile: Resident PWA
8. Reporting: Dashboards, exports

## Exit Criteria
- All features implemented per PRD
- All acceptance criteria met
- compliance-verifier sign-off on security
- All tests passing
- No open security issues
- Performance acceptable

## Duration
Many sessions (parallel work)
