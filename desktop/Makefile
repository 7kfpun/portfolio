.PHONY: help dev build lint clean install setup test kill

# Default target
help:
	@echo "Available commands:"
	@echo "  make dev          - Run development server with Tauri"
	@echo "  make build        - Build production application"
	@echo "  make lint         - Run TypeScript linting"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make install      - Install npm dependencies"
	@echo "  make setup        - Setup Rust environment"
	@echo "  make test         - Run tests"
	@echo "  make kill         - Kill running dev server on port 1420"

# Run development server
dev:
	@source $$HOME/.cargo/env && npm run tauri:dev

# Build production application
build:
	@source $$HOME/.cargo/env && npm run build && npm run tauri:build

# Run linting
lint:
	@npm run lint

# Clean build artifacts
clean:
	@rm -rf node_modules
	@rm -rf src-tauri/target
	@rm -rf dist
	@echo "Cleaned build artifacts"

# Install dependencies
install:
	@npm install
	@echo "Dependencies installed"

# Setup Rust environment
setup:
	@source $$HOME/.cargo/env && cargo --version
	@echo "Rust environment ready"

# Run tests (placeholder)
test:
	@npm run test

# Kill running dev server
kill:
	@lsof -ti:1420 | xargs kill -9 2>/dev/null || true
	@echo "Killed processes on port 1420"
