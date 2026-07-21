#!/bin/sh
set -eu

patterns='(sk-or-v1-[A-Za-z0-9_-]{20,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|postgres(ql)?://[^[:space:]]+:[^[:space:]@]+@)'

if git grep -IqE "$patterns" -- . \
  ':(exclude)*package-lock.json' \
  ':(exclude)_COMPLETENESS_REVIEW.md' \
  ':(exclude)scripts/check-secrets.sh'; then
  echo "Potential credential found in tracked files."
  exit 1
fi

if git log -p --all -- . \
  ':(exclude)*package-lock.json' | grep -IqE "$patterns"; then
  echo "Potential credential found in Git history; rotate and purge it before launch."
  exit 1
fi
