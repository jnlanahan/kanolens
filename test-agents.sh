#!/bin/bash

echo "🧪 Running Multi-Agent System Tests..."
echo ""

# Install test dependencies if not already installed
npm install --save-dev vitest @vitest/ui

# Run the test suite
echo "Running agent tests..."
npx vitest run server/agents/__tests__/*.test.ts --reporter=verbose

echo ""
echo "✅ Test execution complete!"