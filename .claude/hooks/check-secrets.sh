#!/bin/bash
# Warns about potential secrets in code
# Exit 0 = allow with warning, Exit 2 = block

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file // empty')
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')

# Skip non-code files
if [[ "$FILE_PATH" == *.md ]] || [[ "$FILE_PATH" == *.json ]] || [[ "$FILE_PATH" == *.env.example ]]; then
  exit 0
fi

# Check for potential secrets patterns
if echo "$CONTENT" | grep -qiE '(api[_-]?key|secret|password|token|credential).*=.*["\047][a-zA-Z0-9]{16,}'; then
  echo "WARNING: Potential hardcoded secret detected in $FILE_PATH" >&2
  echo "Use environment variables instead of hardcoding secrets." >&2
  # Allow but warn (exit 0), use exit 2 to block
fi

exit 0
