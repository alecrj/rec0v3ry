---
name: research
description: Deep research using NotebookLM and web search. Returns citation-backed findings.
allowed-tools: Read, WebFetch, WebSearch
argument-hint: [topic]
user-invocable: true
---

Research the topic: $ARGUMENTS

## Research Protocol
1. Use NotebookLM if available for source-grounded research
2. Use WebSearch for current information
3. Use WebFetch to extract specific page content
4. For regulatory topics, prioritize:
   - HHS.gov for HIPAA
   - Federal Register for 42 CFR Part 2
   - SAMHSA for substance use regulations

## Output Requirements
- Every claim must have a citation (URL)
- Include date accessed for time-sensitive info
- Structured findings, not prose
- Highlight actionable insights
- Note any conflicting information found

## Save Findings
After research, offer to save findings to:
- docs/research/ for competitor/market research
- Agent memory for regulatory learnings
