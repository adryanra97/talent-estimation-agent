#!/usr/bin/env bash
# Write the collected check results to the job summary and fail if any failed.
set -uo pipefail

heading="$1"
{
  echo "## ${heading}"
  echo
  echo "| Check | Result | Duration |"
  echo "|---|---|---|"
  cat "$RUNNER_TEMP/checks.md" 2>/dev/null
  echo
  cat "$RUNNER_TEMP/details.md" 2>/dev/null
} >> "$GITHUB_STEP_SUMMARY"

if [ -s "$RUNNER_TEMP/failed.txt" ]; then
  echo "Failed checks:"
  cat "$RUNNER_TEMP/failed.txt"
  exit 1
fi
echo "All checks passed."
