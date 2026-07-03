#!/bin/bash

# Publishing script for @creedspace/mcp-server
# Run this after setting up the NPM organization

echo "🚀 Publishing @creedspace/mcp-server to NPM"
echo "==========================================="

# Check if logged in
echo "Checking NPM login..."
npm whoami
if [ $? -ne 0 ]; then
    echo "❌ Not logged in to NPM. Please run: npm login"
    exit 1
fi

# Check organization membership
echo "Checking organization membership..."
npm org ls creedspace $(npm whoami)
if [ $? -ne 0 ]; then
    echo "⚠️  You may not be a member of the creedspace organization"
    echo "Please ensure you're added to the organization first"
    exit 1
fi

# Clean and build
echo "Cleaning previous build..."
rm -rf dist/

echo "Building TypeScript..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

# Run tests
echo "Running tests..."
npm test
if [ $? -ne 0 ]; then
    echo "❌ Tests failed"
    exit 1
fi

# Deprecate old package if it exists
echo "Deprecating old unscoped package..."
npm deprecate creedspace-mcp-server@"*" "Package moved to @creedspace/mcp-server" || true

# Publish new scoped package
echo "Publishing @creedspace/mcp-server..."
npm publish --access public

if [ $? -eq 0 ]; then
    echo "✅ Successfully published @creedspace/mcp-server!"
    echo ""
    echo "Next steps:"
    echo "1. Test installation: npx @creedspace/mcp-server test"
    echo "2. Update documentation at creed.space"
    echo "3. Announce the change to users"
else
    echo "❌ Publishing failed. Please check the error above."
    exit 1
fi