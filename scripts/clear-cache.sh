#!/bin/bash

echo "🧹 Clearing Next.js cache..."

# Remove Next.js cache directories
rm -rf .next
rm -rf node_modules/.cache

# Remove pnpm cache
pnpm store prune

echo "✅ Cache cleared successfully!"
echo "🚀 Restarting development server..."

# Restart the development server
pnpm dev:live
