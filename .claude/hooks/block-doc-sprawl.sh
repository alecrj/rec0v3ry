#!/bin/bash
# Blocks unauthorized markdown file creation
# Exit 0 = allow, Exit 2 = block

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

if [[ "$FILE_PATH" != *.md ]]; then
  exit 0
fi

ALLOWED=(
  "CLAUDE.md"
  "CLAUDE.local.md"
  "SOURCE_OF_TRUTH.md"
  "README.md"
  "CHANGELOG.md"
  "docs/"
  ".claude/phases/"
  ".claude/subtasks/"
  ".claude/progress/"
  ".claude/validation/"
  ".claude/agents/"
  ".claude/skills/"
  ".claude/rules/"
  ".claude/adrs/"
)

for pattern in "${ALLOWED[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    exit 0
  fi
done

echo "BLOCKED: Unauthorized markdown file: $FILE_PATH" >&2
echo "Use docs/, .claude/phases/, .claude/subtasks/, or other allowed directories." >&2
exit 2
