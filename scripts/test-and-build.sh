#!/bin/bash

echo "Running linting..."
npm run lint

echo "Running TypeScript compilation check..."
npx tsc --noEmit

echo "Running unit tests..."
npm run test:unit

echo "Running integration tests..."
npm run test:integration

echo "All checks completed."
