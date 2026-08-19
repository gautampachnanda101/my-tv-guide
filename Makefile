PORT ?= 3000

.PHONY: help install dev build start lint lint-css lint-all clean test kill-port check-port

help:
	@echo "Available targets:"
	@echo "  make install             - Install npm dependencies"
	@echo "  make dev [PORT=3000]     - Start the Next.js dev server (auto-picks a free port)"
	@echo "  make build               - Build the production bundle"
	@echo "  make start [PORT=3000]   - Start the production server (auto-picks a free port)"
	@echo "  make lint                - Run ESLint"
	@echo "  make lint-css            - Run Stylelint"
	@echo "  make lint-all            - Run ESLint + Stylelint"
	@echo "  make test                - Lint + build (local CI smoke test)"
	@echo "  make kill-port [PORT=3000] - Kill whatever process is listening on PORT"
	@echo "  make clean               - Remove build artifacts"

install:
	npm install

# Finds the first free TCP port starting at $(PORT) and prints it.
check-port:
	@port=$(PORT); \
	while lsof -nP -iTCP:$$port -sTCP:LISTEN >/dev/null 2>&1; do \
		echo "Port $$port is in use, trying $$((port+1))..." >&2; \
		port=$$((port+1)); \
	done; \
	echo $$port

dev:
	@port=$$($(MAKE) --no-print-directory check-port PORT=$(PORT)); \
	echo "Starting dev server on http://localhost:$$port"; \
	npm run dev -- -p $$port

build:
	npm run build

start:
	@port=$$($(MAKE) --no-print-directory check-port PORT=$(PORT)); \
	echo "Starting production server on http://localhost:$$port"; \
	npm run start -- -p $$port

lint:
	npm run lint

lint-css:
	npm run lint:css

lint-all:
	npm run lint:all

test: lint build
	@echo "Lint + build passed."
	@echo "Note: 'make lint-css' has pre-existing failures not covered by this target."

kill-port:
	@pids=$$(lsof -nP -iTCP:$(PORT) -sTCP:LISTEN -t 2>/dev/null); \
	if [ -z "$$pids" ]; then \
		echo "Nothing listening on port $(PORT)."; \
	else \
		echo "Killing process(es) on port $(PORT): $$pids"; \
		lsof -nP -iTCP:$(PORT) -sTCP:LISTEN; \
		kill $$pids; \
	fi

clean:
	rm -rf .next
