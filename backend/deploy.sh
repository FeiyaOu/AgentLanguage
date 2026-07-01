#!/usr/bin/env bash
# Package the backend + dependencies into deploy.zip for Aliyun Function Compute.
# Usage: ./deploy.sh   (run from the backend/ directory)
set -euo pipefail

cd "$(dirname "$0")"

BUILD_DIR=".fc-build"
ZIP_PATH="../deploy.zip"

echo "==> Cleaning previous build..."
rm -rf "$BUILD_DIR" "$ZIP_PATH"
mkdir -p "$BUILD_DIR"

echo "==> Copying source code..."
cp main.py requirements.txt "$BUILD_DIR/"
cp -r agent "$BUILD_DIR/agent"

echo "==> Installing dependencies into package (linux-compatible)..."
# Note: "exceptiongroup" is a conditional dependency only needed on Python < 3.11.
# pip evaluates such markers against the LOCAL interpreter, so when building on a
# newer Python it gets skipped — but FC runs Python 3.10 and needs it. Add explicitly.
python3 -m pip install -r requirements.txt exceptiongroup \
    -t "$BUILD_DIR" \
    --platform manylinux2014_x86_64 \
    --python-version 3.10 \
    --only-binary=:all: \
    --upgrade

echo "==> Creating deploy.zip..."
cd "$BUILD_DIR"
zip -rq "../$ZIP_PATH" . -x "*__pycache__*" -x "*.pyc" -x "*.dist-info/RECORD"
cd ..
rm -rf "$BUILD_DIR"

echo "==> Done: $(cd .. && pwd)/deploy.zip"
echo "    Upload it in the FC console, start command:"
echo "    python3 -m uvicorn main:app --host 0.0.0.0 --port 9000"
