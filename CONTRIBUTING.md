# Contributing to MedRAG

Thanks for your interest in contributing! This project is a FastAPI backend + Vite/React frontend.

## Local development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Docker (optional)

```bash
docker compose up --build
```

## Tests and linting

```bash
cd backend
pytest -q
ruff check .
```

```bash
cd frontend
npm run lint
npm run build
```

## Pull requests

1. Fork the repo and create a feature branch.
2. Keep changes focused and include tests where possible.
3. Run tests/lint before opening a PR.
4. Fill out the PR template (if present) with context and screenshots.

## Dependency locking (optional)

If you want a reproducible lock file, you can use `pip-tools`:

```bash
pip install pip-tools
pip-compile backend/requirements.txt -o backend/requirements-frozen.txt
```
