"""FastAPI application layer for the MedRAG backend."""

from __future__ import annotations

import asyncio
import json
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.eval_core import DEFAULT_OUTPUT_CSV, query_local_pipeline, run_medrag_evaluation
from app.rag_core import (
    collection_count,
    generate_grounded_response,
    ingest_document,
    persist_upload_copy,
    retrieve_context,
    stream_grounded_response,
    warmup_embedding_model,
)


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1)


class LegacyChatMessage(BaseModel):
    role: str
    content: str


class LegacyChatRequest(BaseModel):
    messages: list[LegacyChatMessage] = Field(default_factory=list)


class EvaluationRequest(BaseModel):
    output_csv: str | None = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await warmup_embedding_model()
    yield


app = FastAPI(title="MedRAG API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "collection_count": collection_count()}


@app.get("/version")
def version() -> dict[str, str]:
    return {"version": os.getenv("MEDRAG_VERSION", app.version)}


@app.post("/ingest")
async def ingest(file: UploadFile = File(...)) -> dict[str, Any]:
    return await _ingest_uploaded_file(file, pdf_only=True)


@app.post("/chat")
async def chat(body: ChatRequest) -> dict[str, Any]:
    import logging
    logger = logging.getLogger(__name__)

    query = body.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="query required")

    logger.info(f"\n{'='*80}")
    logger.info(f"[CHAT ENDPOINT] Received query: {query}")
    logger.info(f"{'='*80}")

    contexts = retrieve_context(query, k=6)

    logger.info(f"[CHAT ENDPOINT] Retrieved {len(contexts)} context chunks")
    for idx, ctx in enumerate(contexts):
        preview = ctx["text"][:100].replace("\n", " ")[:100]
        logger.info(
            f"[CHAT ENDPOINT] Context {idx}: source={ctx['source']}, "
            f"chunk_index={ctx['chunk_index']}, distance={ctx['distance']}, "
            f"preview='{preview}...'"
        )

    response = await asyncio.to_thread(generate_grounded_response, query, contexts)
    logger.info(f"[CHAT ENDPOINT] LLM Response: {response[:200]}...\n")

    return {"response": response, "sources": contexts}


@app.post("/api/evaluation/run")
async def run_evaluation(body: EvaluationRequest | None = None) -> dict[str, Any]:
    output_csv = Path(body.output_csv) if body and body.output_csv else DEFAULT_OUTPUT_CSV
    return await asyncio.to_thread(
        run_medrag_evaluation,
        question_runner=query_local_pipeline,
        output_csv=output_csv,
    )


async def _ingest_uploaded_file(file: UploadFile, *, pdf_only: bool) -> dict[str, Any]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename required.")
    if pdf_only and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF files only.")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file.")

    try:
        ingest_info = ingest_document(raw, file.filename)
        stored_file = persist_upload_copy(raw, file.filename)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {**ingest_info, "stored_file": stored_file}


@app.post("/api/ingest/upload")
async def ingest_compat(file: UploadFile = File(...)) -> dict[str, Any]:
    return await _ingest_uploaded_file(file, pdf_only=False)


def _legacy_query(messages: list[LegacyChatMessage]) -> str:
    user_parts = [message.content for message in messages if message.role == "user"]
    return user_parts[-1] if user_parts else (messages[-1].content if messages else "")


@app.post("/api/chat/stream")
async def chat_stream_compat(body: LegacyChatRequest):
    query = _legacy_query(body.messages).strip()
    if not query:
        raise HTTPException(status_code=400, detail="query required")

    contexts = retrieve_context(query, k=6)

    async def event_stream():
        yield f"data: {json.dumps({'type': 'sources', 'sources': contexts})}\n\n"
        async for piece in stream_grounded_response(query, contexts):
            yield f"data: {json.dumps({'type': 'token', 'token': piece})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
