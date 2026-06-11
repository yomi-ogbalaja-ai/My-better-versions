.PHONY: install deps backend frontend run build deploy clean

install:
	cd frontend && npm install

deps:
	go mod download
	cd frontend && npm install

backend:
	PORT=8092 ENV=dev go run main.go

frontend:
	cd frontend && npm run dev

build-frontend:
	cd frontend && npm run build

run: deps
	@echo "Starting Starship (Go backend + React frontend)..."
	@echo "Open http://localhost:3100  (not :3000 — that may be another app)"
	@echo "Backend API: http://localhost:8092/api/scores"
	@make -j2 backend frontend

build: deps
	go generate
	go build -o app main.go

deploy:
	apps-platform app deploy --no-build

clean:
	cd frontend && rm -rf node_modules dist
	rm -f app
	go clean
