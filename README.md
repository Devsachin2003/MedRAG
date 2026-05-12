# MedRAG Evaluation Suite

MedRAG Evaluation Suite is a medical retrieval-augmented generation (RAG) demo built to show a complete applied AI engineering workflow:

- ingesting documents into a persistent vector store
- retrieving context with a hybrid search strategy
- generating grounded answers with Groq-hosted LLMs
- evaluating the system with ragas and exporting reproducible CSV results

## Architecture Overview

The repository is split into a small FastAPI backend and a React frontend:

- **FastAPI** powers the backend API, ingestion routes, chat endpoints, and the evaluation route.
- **LangChain** provides the document splitting, retrieval orchestration, and Groq model integration.
- **ChromaDB** stores embedded document chunks for semantic retrieval.
- **BM25** provides keyword-based retrieval to complement vector search.
- **EnsembleRetriever** combines both retrievers so the system can balance semantic and lexical signals.
- **Groq** provides the chat and evaluation LLMs used by the app.
- **ragas** computes the evaluation metrics and writes a summary CSV for inspection.

At a high level, the flow is:

1. Documents are uploaded through the backend.
2. Text is extracted, chunked, and stored in ChromaDB with chunk-level duplicate protection.
3. A query triggers hybrid retrieval through vector search and BM25.
4. Retrieved chunks are passed to Groq for grounded answer generation.
5. The evaluation harness runs a fixed benchmark set, collects answers and contexts, and scores them with ragas.

## Repository Layout

- `backend/main.py` - FastAPI application and API routes.
- `backend/app/rag_core.py` - ingestion, retrieval, and grounded generation logic.
- `backend/app/eval_core.py` - shared evaluation harness used by the API and CLI.
- `evaluate_rag.py` - command-line entry point for running the evaluation pipeline.
- `frontend/` - React UI for ingestion, chat, and evaluation.

## Prerequisites

- Python 3.10+
- Node.js 18+
- A Groq API key available in your environment

## Backend Setup

Create a virtual environment and install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

Set the required environment variables in `backend/.env` or your shell environment:

```bash
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant
```

Run the backend with Uvicorn:

```bash
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The backend exposes:

- `GET /health`
- `POST /ingest`
- `POST /chat`
- `POST /api/evaluation/run`
- `POST /api/ingest/upload`
- `POST /api/chat/stream`

## Frontend Setup

Install and run the frontend from the `frontend/` directory:

```bash
cd frontend
npm install
npm run dev
```

By default, the frontend uses `http://localhost:8000` for API calls in local development.

## Production Deployment

Deploy the backend and frontend separately:

- **Backend:** Render Web Service built from `backend/Dockerfile`
- **Frontend:** Vercel project built from `frontend/`

Set the following environment variables in your hosting dashboards:

- **Render (backend)**
  - `GROQ_API_KEY` (required)
  - `GROQ_MODEL` (optional, defaults to `llama-3.1-8b-instant`)
- **Vercel (frontend)**
  - `VITE_API_URL` (set this in production), point it to your deployed Render backend base URL (for example `https://medrag-backend.onrender.com`). If omitted, the frontend falls back to `http://localhost:8000` for local development only.

ChromaDB persistence in production relies on the Render persistent disk configured in `render.yaml`, mounted at `backend/chroma_data` (`/opt/render/project/src/backend/chroma_data` in the container).

## Running the Evaluation

There are two equivalent ways to run the benchmark:

### 1. Command line

From the repository root:

```bash
python evaluate_rag.py
```

This queries the live backend, evaluates the configured test cases, and writes `ragas_evaluation_results.csv` at the repository root by default.

### 2. API / UI

Run the backend, open the frontend, and use the Evaluation Dashboard to trigger the same shared evaluation harness.

## ragas Metrics Used

The evaluation suite uses three ragas metrics:

- **Context Precision** - measures how much of the retrieved context is actually relevant to the question.
- **Faithfulness** - measures whether the answer stays grounded in the retrieved context instead of hallucinating unsupported claims.
- **Answer Relevancy** - measures how directly the generated answer addresses the user question.

These metrics are written to the CSV output for both per-case inspection and summary reporting.

## Demo Notes

This project is intentionally structured so the evaluation story is easy to show on screen:

- live RAG pipeline with ingestion and chat
- reproducible evaluation output in CSV form
- visible hybrid retrieval configuration
- a compact benchmark set for fast demo runs

## Troubleshooting

- If the backend reports that the Groq key is missing, confirm the environment variable is set before starting the server.
- If evaluation fails, make sure the backend is running and reachable at the URL passed to `evaluate_rag.py`.
- If you reset the vector store, delete `backend/chroma_data/` and re-ingest your documents.
