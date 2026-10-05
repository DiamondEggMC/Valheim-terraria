#!/bin/bash

FAILED_CHECKS=()

# ── tsgo / biome 并行跑 ───────────────────────────────────────────────────────
npx tsgo -p tsconfig.check.json &
pid_tsgo=$!

npx biome lint &
pid_biome=$!

wait $pid_tsgo || FAILED_CHECKS+=("tsgo")
wait $pid_biome || FAILED_CHECKS+=("biome")

# ── Tailwind CSS syntax ───────────────────────────────────────────────────────
tailwind_output=$(npx tailwindcss -i ./src/index.css -o /dev/null 2>&1 | grep -E '^(CssSyntaxError|Error):.*')
if [ -n "$tailwind_output" ]; then
  echo "$tailwind_output"
  FAILED_CHECKS+=("tailwind")
fi

# ── Oxlint (custom plugins: image, style) ─────────────────────────────────────
npx oxlint -c .oxlintrc.json src || FAILED_CHECKS+=("oxlint")

# ── Result ────────────────────────────────────────────────────────────────────
echo ""
if [ ${#FAILED_CHECKS[@]} -eq 0 ]; then
  echo "RESULT: ALL CHECKS PASSED ✓ Finished with 0 errors. Found no issues."
  exit 0
else
  echo "RESULT: FAILED ✗ Please fix all lint errors, then re-run 'pnpm run lint'."
  exit 1
fi
