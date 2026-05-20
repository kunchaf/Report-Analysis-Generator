#!/usr/bin/env bash
# exit on error
set -e

echo "==> Building Frontend..."
cd frontend
npm install
npm run build

echo "==> Moving Frontend Assets to Backend..."
# This ensures your frontend dist folder is accessible to your backend if you are serving it statically.
# If you aren't serving frontend files via FastAPI, you can remove the next line.
mkdir -p ../backend/static
cp -r dist/* ../backend/static/

cd ..

echo "==> Installing Backend Dependencies..."
pip install -r backend/requirements.txt

echo "==> Build complete!"