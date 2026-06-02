#!/usr/bin/env zsh
set -euo pipefail

PROJECT="/Volumes/外置存储/Fem Friendly/female-friendly-main"
PATCH="/Users/ashleyai/Documents/办公/codex-patches/female-friendly-strong-evidence-redesign.patch"

cd "$PROJECT"
apply_patch < "$PATCH"

echo "Applied strong-evidence recognition redesign patch."
