PHONY: up dev-backend dev-frontend test lint

up:
	docker compose up --build

dev-backend:
	cd backend && uvicorn main:app --reload --host 127.0.0.1 --port 8000

dev-frontend:
	npm --prefix frontend run dev

test:
	cd backend && pytest -q

lint:
	cd backend && ruff check .
	npm --prefix frontend run lint
