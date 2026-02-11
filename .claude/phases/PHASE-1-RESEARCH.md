# Phase 1: Research

## Objective
Deep competitor and regulation research using Agent Teams for parallel execution.

## Entry Criteria
- Phase 0 complete and validated
- Agent Teams enabled

## Method: Agent Team (5 Parallel Researchers)

Spawn 5 teammates working in parallel:
1. **sober-living-app-researcher**: Research Sober Living App
2. **oathtrack-researcher**: Research Oathtrack
3. **sobriety-hub-researcher**: Research Sobriety Hub
4. **oasis-researcher**: Research Oasis
5. **compliance-researcher**: Research HIPAA + 42 CFR Part 2

### Research Requirements per Competitor
Each researcher must document WITH CITATIONS:
- Company overview and positioning
- Bed/occupancy model
- Admissions/intake workflow
- Billing/payments/ledger/reconciliation
- Resident portal features
- House ops: chores/meetings/passes/tasks
- Documents/e-sign/storage
- Messaging/chat/communications
- Reporting/outcomes dashboards
- Permission system (RBAC), audit logs
- HIPAA/42 CFR Part 2 compliance claims
- Pricing tiers (dated)
- Notable gaps or weaknesses

### Regulation Research Requirements
The compliance-researcher must document:
- HIPAA Business Associate requirements (cite HHS.gov)
- HIPAA Security Rule requirements
- 42 CFR Part 2 final rule requirements (cite Federal Register)
- February 16, 2026 compliance deadline implications
- Consent and redisclosure requirements
- Breach notification requirements
- NARR standards for documentation

## Subtasks
| ID | Title | Teammate | Deliverable |
|----|-------|----------|-------------|
| 101 | Sober Living App Analysis | sober-living-app-researcher | Section in competitors.md |
| 102 | Oathtrack Analysis | oathtrack-researcher | Section in competitors.md |
| 103 | Sobriety Hub Analysis | sobriety-hub-researcher | Section in competitors.md |
| 104 | Oasis Analysis | oasis-researcher | Section in competitors.md |
| 105 | HIPAA + 42 CFR Part 2 Research | compliance-researcher | docs/research/regulations.md |

## Lead Tasks (after teammates complete)
| ID | Title | Deliverable |
|----|-------|-------------|
| 106 | Synthesize competitor findings | Final competitors.md with matrix |
| 107 | Create gaps analysis | docs/research/gaps.md |
| 108 | Validate all citations | All URLs verified working |

## Exit Criteria
- All 5 teammates completed their research
- Every claim has a URL citation
- Competitor matrix has feature-level detail
- Regulation requirements cite authoritative sources
- Gaps analysis identifies specific opportunities
- compliance-expert subagent has reviewed regulations.md

## Validation Checkpoint
.claude/validation/checkpoints/CHECKPOINT-RESEARCH.md

## Duration
1-2 sessions with Agent Team
