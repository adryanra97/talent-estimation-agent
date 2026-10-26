#!/usr/bin/env bash
# Run one quality check, keep going on failure, and record the result.
#
# Usage: run-check.sh "<title>" <command> [args...]
#
# The output is shown in the job log and collected into the job summary.
# Failures are written to $RUNNER_TEMP/failed.txt; the final summary step
# fails the job if that file exists.
set -uo pipefail

title="$1"
shift
log="$(mktemp)"
start=$(date +%s)

echo "::group::${title}"
"$@" 2>&1 | tee "$log"
status=${PIPESTATUS[0]}
echo "::endgroup::"

duration=$(( $(date +%s) - start ))
if [ "$status" -eq 0 ]; then result="pass"; else result="fail"; fi

echo "| ${title} | ${result} | ${duration}s |" >> "$RUNNER_TEMP/checks.md"
{
  echo "<details><summary><b>${title}</b>: ${result}</summary>"
  echo
  echo '```text'
  tail -n 150 "$log" | sed 's/\x1b\[[0-9;]*m//g'
  echo '```'
  echo "</details>"
  echo
} >> "$RUNNER_TEMP/details.md"

if [ "$status" -ne 0 ]; then
  echo "::error title=${title}::${title} failed"
  echo "${title}" >> "$RUNNER_TEMP/failed.txt"
fi
exit 0
