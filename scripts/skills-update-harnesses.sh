#!/usr/bin/env bash
# Re-sync skills from skills-lock.json to ONLY the agent harnesses in HARNESS_AGENTS.
# Each `npx skills add` run uses explicit -s <name> flags from the lock (never -s '*').
# Prefer this over `npx skills update`, which can refresh every installed skill project-wide.
# https://github.com/vercel-labs/skills#available-agents

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

EXTRA=()
if [[ "${1:-}" == "--" ]]; then
  shift
  EXTRA=("$@")
fi

LOCK="${ROOT}/skills-lock.json"
if [[ ! -f "$LOCK" ]]; then
  echo "missing $LOCK" >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "install jq to run this script" >&2
  exit 1
fi

HARNESS_AGENTS=(cursor opencode droid kilo)

AG_ARGS=()
for a in "${HARNESS_AGENTS[@]}"; do
  AG_ARGS+=(-a "$a")
done

echo ">> syncing from skills-lock.json → agents: ${HARNESS_AGENTS[*]}"

while read -r line; do
  src="$(echo "$line" | jq -r '.source')"
  mapfile -t skills < <(echo "$line" | jq -r '.skills[]')
  if [[ ${#skills[@]} -eq 0 ]]; then
    continue
  fi
  SK_ARGS=()
  for s in "${skills[@]}"; do
    SK_ARGS+=(-s "$s")
  done
  echo ">> $src (${#skills[@]} skill(s))"
  # Do not read from the jq pipe (would swallow remaining groups).
  npx skills add "$src" -y "${AG_ARGS[@]}" "${SK_ARGS[@]}" "${EXTRA[@]}" < /dev/null
done < <(jq -c '.skills | to_entries | group_by(.value.source)[] | {source: .[0].value.source, skills: [.[].key]}' "$LOCK")

# Kiro (kiro-cli) expects workspace skills under .kiro/skills; the skills CLI copies per skill there.
# One symlink to .agents/skills keeps a single canonical tree (see https://kiro.dev/docs/skills/).
mkdir -p "${ROOT}/.kiro"
if [[ -e "${ROOT}/.kiro/skills" && ! -L "${ROOT}/.kiro/skills" ]]; then
  echo ">> replacing .kiro/skills directory with symlink to .agents/skills" >&2
  rm -rf "${ROOT}/.kiro/skills"
fi
ln -sfn ../.agents/skills "${ROOT}/.kiro/skills"
echo ">> .kiro/skills → ../.agents/skills"

echo ">> done"
