#!/usr/bin/env bash
set -euo pipefail

echo "VN Stock Dashboard — setup check"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js chưa được cài. Cài Node.js 18+ rồi chạy lại."
  exit 1
fi

MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$MAJOR" -lt 18 ]; then
  echo "Node.js $(node --version) chưa đủ. Cần Node.js 18+."
  exit 1
fi

echo "Node.js $(node --version) OK"

if [ ! -f config.json ]; then
  cp config.example.json config.json
  echo "Đã tạo config.json từ config.example.json. Hãy sửa watchlist nếu cần."
fi

if [ ! -d node_modules ]; then
  echo "Đang cài dependencies..."
  npm install
fi

echo ""
echo "Sẵn sàng. Chạy:"
echo "  npm run pipeline:eod"
echo "  npm start"
