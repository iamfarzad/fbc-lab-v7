#!/bin/bash
set -e

echo "🧹 Starting DEEP cleanup..."
echo "⚠️  This will remove node_modules and reinstall dependencies"
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 1
fi

# Quick cleanup first
./cleanup.sh

# Remove dependencies
echo "Removing node_modules..."
rm -rf node_modules
rm -rf server/node_modules

# Clean pnpm cache
echo "Pruning pnpm store..."
pnpm store prune

# Reinstall
echo "Reinstalling dependencies..."
pnpm install

echo "✅ Deep cleanup complete!"
