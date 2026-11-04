#!/usr/bin/env bash
# Fail if any commit in the given range carries an AI co-author or "Generated with" line.
# Usage: .ci/check-ai-attribution.sh <revision-range>
set -euo pipefail

range="${1:?usage: $0 <revision-range>}"
pattern='co-authored-by:.*(claude|anthropic|codex|openai|chatgpt|cursor|copilot)|generated (with|by) \[?(claude|codex|cursor|copilot)'

status=0
while read -r sha; do
  if lines="$(git log -1 --format=%B "${sha}" | grep -iE "${pattern}")"; then
    while IFS= read -r line; do
      echo "::error title=AI attribution::${sha:0:7} $(git log -1 --format=%s "${sha}"): ${line}"
    done <<< "${lines}"
    status=1
  fi
done < <(git rev-list "${range}")

if [ "${status}" -eq 0 ]; then
  echo "No AI attribution in ${range} ($(git rev-list --count "${range}") commits)."
fi
exit "${status}"
