#!/usr/bin/env bash
set -euo pipefail

# Ensure ~/.bashrc works in non-interactive shells and exports user tool paths idempotently.
if [ -f "$HOME/.bashrc" ]; then
  sed -i '/case \$- in/,/esac/d' "$HOME/.bashrc" 2>/dev/null || true
fi
touch "$HOME/.bashrc"
PATH_EXPORT='export PATH="$HOME/.local/bin:$HOME/.pub-cache/bin:$PATH"'
grep -qxF "$PATH_EXPORT" "$HOME/.bashrc" || echo "$PATH_EXPORT" >> "$HOME/.bashrc"
export PATH="$HOME/.local/bin:$HOME/.pub-cache/bin:$PATH"

# Web / TypeScript global CLIs (install only if missing)
if ! command -v tsc >/dev/null 2>&1 || ! command -v tsx >/dev/null 2>&1; then
  npm install -g --no-audit --no-fund typescript tsx
fi

# Auto-install repository dependencies when manifests are present
if [ -f "package.json" ]; then
  if [ -f "pnpm-lock.yaml" ] && command -v pnpm >/dev/null 2>&1; then
    pnpm install --frozen-lockfile
  elif [ -f "yarn.lock" ] && command -v yarn >/dev/null 2>&1; then
    yarn install --frozen-lockfile
  elif [ -f "package-lock.json" ]; then
    npm ci --no-audit --no-fund
  else
    npm install --no-audit --no-fund
  fi
fi

if [ -f "frontend/package.json" ]; then
  npm --prefix frontend install --no-audit --no-fund
fi

if [ -f "pubspec.yaml" ] && command -v flutter >/dev/null 2>&1; then
  flutter pub get
fi

if [ -f "uv.lock" ] && command -v uv >/dev/null 2>&1; then
  uv sync --frozen
elif [ -f "poetry.lock" ] && command -v poetry >/dev/null 2>&1; then
  poetry install --no-interaction
elif [ -f "pyproject.toml" ] && command -v uv >/dev/null 2>&1; then
  uv sync
elif [ -f "requirements.txt" ]; then
  pip install --no-input -r requirements.txt
fi

# Smoke check core toolchains
echo "Environment ready:"
echo "  node:    $(node --version)"
echo "  tsc:     $(tsc --version)"
echo "  tsx:     $(tsx --version | head -n 1)"
echo "  python:  $(python3 --version)"
echo "  uv:      $(uv --version)"
echo "  poetry:  $(poetry --version)"
echo "  flutter: $(flutter --version | head -n 1)"
echo "  dart:    $(dart --version 2>&1)"
