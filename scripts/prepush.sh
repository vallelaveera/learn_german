#!/bin/bash
# Run before every commit + push. Usage:
#   bash scripts/prepush.sh && git add . && git commit -m "..." && git push
set -e

echo "▶ Running critical path tests..."
bash test-critical.sh

echo ""
echo "▶ Running production build..."
npm run build 2>&1 | tail -5

echo ""
echo "✅ prepush checks passed"
