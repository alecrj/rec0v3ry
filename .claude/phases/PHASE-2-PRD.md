# Phase 2: PRD (Product Requirements Document)

## Objective
Create comprehensive product requirements based on research findings.

## Entry Criteria
- Phase 1 complete and validated
- Research docs complete with citations

## Method
Lead session with specialized subagent consultations:
- compliance-expert for security/audit requirements
- payments-architect for billing requirements

## Deliverables

### 1. Vision & Differentiation (docs/00_NORTH_STAR.md)
- Mission statement
- Core value propositions
- How we beat each competitor (reference gaps.md)
- Target customers (by size: 1 house -> 50+ houses)

### 2. User Personas & Roles (docs/01_REQUIREMENTS.md)
Define 9 roles with exact permissions:
1. Owner/Executive Admin
2. Operations Manager
3. House Manager
4. Billing/Finance
5. Case Manager (optional)
6. Staff
7. Resident
8. External Payer (family/sponsor)
9. Auditor (read-only)

### 3. Feature Requirements (docs/01_REQUIREMENTS.md)
For each feature area:
- User stories
- Acceptance criteria (measurable)
- Compliance requirements
- Audit logging requirements

Feature areas:
- Bed/occupancy management
- Admissions/intake pipeline
- Payments engine (complete)
- Document management + e-sign
- House operations (chores, meetings, passes, curfew)
- Messaging and announcements
- Reporting and exports
- Resident app features

### 4. Screen List & Flows (docs/01_REQUIREMENTS.md)
List every screen with:
- Screen name
- Purpose
- Key components
- Acceptance criteria
- Which roles access it

Key flows to document:
- Operator onboarding
- Resident invite + activation
- New admission -> billing setup
- Payment delinquency workflow
- Document e-sign flow
- Task/chore verification
- Meeting attendance tracking
- Request submission/approval

### 5. Reporting Suite
Define required reports:
- Occupancy rate and availability
- Length of stay distribution
- Delinquency and collections
- Payments by method
- Staff activity metrics
- Compliance packet export
- Resident engagement summary

## Subtasks
| ID | Title | Owner | Deliverable |
|----|-------|-------|-------------|
| 201 | Vision & Differentiation | planner | docs/00_NORTH_STAR.md |
| 202 | User Roles & Permissions | planner + compliance-expert | Roles section of 01_REQUIREMENTS.md |
| 203 | Payments Requirements | payments-architect | Payments section of 01_REQUIREMENTS.md |
| 204 | Compliance Requirements | compliance-expert | Compliance section of 01_REQUIREMENTS.md |
| 205 | Full Feature Specs | planner | Complete docs/01_REQUIREMENTS.md |
| 206 | Screen List & Flows | planner | Screens/flows section of 01_REQUIREMENTS.md |
| 207 | Reporting Requirements | planner | Reports section of 01_REQUIREMENTS.md |

## Exit Criteria
- All deliverables complete
- compliance-expert approved compliance requirements
- payments-architect approved payments requirements
- All features have measurable acceptance criteria
- No TODO/TBD markers

## Duration
2-3 sessions
