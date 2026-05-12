import { useCallback, useState } from "react";
import { apiUrl } from "../config/api";

type UploadStatus = "idle" | "uploading" | "success" | "error";

function formatApiError(status: number, data: unknown): string {
  const d = data as { detail?: unknown };
  if (typeof d?.detail === "string") return `${status}: ${d.detail}`;
  if (Array.isArray(d?.detail)) {
    const parts = d.detail.map((x: { msg?: string; loc?: unknown }) =>
      typeof x?.msg === "string" ? x.msg : JSON.stringify(x)
    );
    return `${status}: ${parts.join("; ") || "Request validation failed"}`;
  }
  if (d?.detail != null && typeof d.detail === "object") {
    return `${status}: ${JSON.stringify(d.detail)}`;
  }
  return `${status}: Upload failed — check that the backend API is reachable and try again.`;
}

export function DocumentIngestion() {
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState<string>("");
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);

  const uploadFile = useCallback(async (file: File) => {
    setStatus("uploading");
    setMessage("");
    setLastResult(null);
    const fd = new FormData();
    fd.append("file", file, file.name);
    try {
      const res = await fetch(apiUrl("/api/ingest/upload"), { method: "POST", body: fd });
      const rawText = await res.text();
      let data: unknown = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = { detail: rawText.slice(0, 500) };
      }
      if (!res.ok) {
        setStatus("error");
        setMessage(formatApiError(res.status, data));
        return;
      }
      setStatus("success");
      const row = data as Record<string, unknown>;
      setMessage(`Indexed ${String(row.chunks_stored ?? "?")} chunks from "${String(row.filename ?? file.name)}".`);
      setLastResult(row);
    } catch {
      setStatus("error");
      setMessage("Network error — is the backend API running and reachable?");
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) void uploadFile(f);
    },
    [uploadFile]
  );

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) void uploadFile(f);
      e.target.value = "";
    },
    [uploadFile]
  );

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft">
        <h2 className="font-display text-lg font-semibold text-ink-900">Ingest medical documents</h2>
        <p className="mt-1 text-sm text-slate-600">
          Drop PDF or plain-text files. The backend extracts text, chunks it, and persists embeddings in a local{" "}
          <span className="font-medium text-clinical-700">ChromaDB</span> collection. On the{" "}
          <strong className="font-medium text-slate-700">very first server start</strong>, the embedder may download
          ~80MB once — wait until the API console shows the server ready, then upload.
        </p>

        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              document.getElementById("medrag-file-input")?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 transition-colors ${
            dragOver
              ? "border-clinical-500 bg-clinical-50/80"
              : "border-slate-300 bg-slate-50/50 hover:border-clinical-400 hover:bg-clinical-50/40"
          }`}
          onClick={() => document.getElementById("medrag-file-input")?.click()}
        >
          <input id="medrag-file-input" type="file" accept=".pdf,.txt,.md,.text" className="hidden" onChange={onFileInput} />
          <div className="rounded-full bg-clinical-100 p-4 text-clinical-700">
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <p className="mt-4 font-medium text-ink-900">Drag &amp; drop files here</p>
          <p className="mt-1 text-sm text-slate-500">or click to browse · PDF, TXT, MD</p>
          {status === "uploading" && (
            <p className="mt-4 text-sm font-medium text-clinical-600">Uploading &amp; indexing…</p>
          )}
        </div>

        {message && (
          <div
            className={`mt-4 rounded-lg px-4 py-3 text-sm ${
              status === "error"
                ? "bg-red-50 text-red-800 ring-1 ring-red-200"
                : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
            }`}
            role="status"
          >
            {message}
          </div>
        )}

        {lastResult && status === "success" && (
          <dl className="mt-4 grid gap-2 rounded-lg bg-slate-50 p-4 text-xs text-slate-700 sm:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-500">Stored file</dt>
              <dd className="font-mono">{String(lastResult.stored_file ?? "—")}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Chunks</dt>
              <dd>{String(lastResult.chunks_stored ?? "—")}</dd>
            </div>
          </dl>
        )}
      </div>
    </section>
  );
}
