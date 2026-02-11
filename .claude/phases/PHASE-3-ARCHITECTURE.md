# Phase 3: Architecture & Data Model

## Objective
Design complete system architecture and data model.

## Entry Criteria
- Phase 2 complete and validated
- PRD approved

## Method
Lead session with specialized subagent consultations:
- compliance-expert MUST review all designs
- payments-architect MUST review ledger design

## Deliverables

### 1. System Architecture (docs/02_ARCHITECTURE.md)
- High-level architecture diagram (describe in text)
- Tech stack decisions (with rationale)
- Service boundaries
- Authentication architecture
- Authorization (RBAC) architecture
- Audit logging architecture
- Background job architecture
- File storage architecture

### 2. Data Model (docs/03_DATA_MODEL.md)
Complete schema for:
- Organizations, Properties, Houses, Rooms, Beds
- Users, Roles, Permissions, RoleAssignments
- Residents, Admissions, Discharges, ResidentStatus
- Charges, Invoices, Payments, Refunds, LedgerEntries
- Tasks, Chores, ChoreAssignments, ChoreVerifications
- Meetings, MeetingSchedules, Attendance
- Requests (maintenance, passes, other)
- Notes, IncidentReports
- Documents, Templates, Signatures, DocumentVersions
- Messages, Channels, Participants, ModerationFlags
- AuditLogEvents (append-only, immutable)
- Files, Attachments, AccessControl
- Consents (42 CFR Part 2)
- Integrations, Webhooks, APIKeys

Include:
- Column definitions with types
- Indexes strategy
- Multi-tenant data isolation
- Soft delete patterns
- Audit columns (created_at, updated_at, created_by, updated_by)

### 3. Security Architecture (docs/04_COMPLIANCE.md)
- Authentication flow (with MFA)
- Session management
- Encryption at rest/in transit
- Key management
- RBAC enforcement patterns
- Audit logging implementation
- Data retention and deletion
- Backup/restore procedures
- Incident response outline
- BAA requirements and vetted providers

### 4. Payments Architecture (docs/05_PAYMENTS.md)
- Stripe Connect approach (platform vs direct)
- Ledger design (double-entry principles)
- Payment flows by type
- External payment handling
- Disputes and chargebacks
- Payout timing
- Reconciliation design
- PCI scope minimization

### 5. API Design
- tRPC router structure
- Endpoint naming conventions
- Error handling patterns
- Pagination approach
- Rate limiting

## Subtasks
| ID | Title | Owner | Deliverable |
|----|-------|-------|-------------|
| 301 | System Architecture | architect | docs/02_ARCHITECTURE.md |
| 302 | Data Model Design | architect | docs/03_DATA_MODEL.md |
| 303 | Security Architecture | compliance-expert | docs/04_COMPLIANCE.md |
| 304 | Payments Architecture | payments-architect | docs/05_PAYMENTS.md |
| 305 | API Design | architect | API section of 02_ARCHITECTURE.md |
| 306 | Architecture Review | compliance-expert | Sign-off on all docs |

## Exit Criteria
- All architecture docs complete
- compliance-expert approved security architecture
- payments-architect approved ledger design
- Data model supports all PRD requirements
- No TODO/TBD markers

## Duration
2-3 sessions
