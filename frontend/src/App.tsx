import { useState } from "react";
import { Chat } from "./components/Chat";
import { DocumentIngestion } from "./components/DocumentIngestion";
import { EvalDashboard } from "./components/EvalDashboard";

type Tab = "ingest" | "chat" | "eval";

const tabs: { id: Tab; label: string; description: string }[] = [
  { id: "ingest", label: "Document Ingestion", description: "Upload PDFs & text into the vector index" },
  { id: "chat", label: "RAG Chat", description: "Query your corpus with grounded answers" },
  { id: "eval", label: "Evaluation", description: "Pipeline metrics & regression tests" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("ingest");

  return (
    <div className="min-h-screen bg-gradient-to-br from-clinical-50 via-white to-slate-50">
      <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur-md sticky top-0 z-10 shadow-soft">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-widest text-clinical-600">
                Prototype
              </p>
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
                MedRAG Evaluation Suite
              </h1>
              <p className="mt-1 max-w-xl text-sm text-slate-600">
                Medical document ingestion, retrieval-augmented Q&amp;A, and strict evaluation for demos.
              </p>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Primary">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                    tab === t.id
                      ? "bg-clinical-600 text-white shadow-md shadow-clinical-600/25"
                      : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
          <p className="mt-3 hidden text-xs text-slate-500 sm:block">{tabs.find((x) => x.id === tab)?.description}</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {tab === "ingest" && <DocumentIngestion />}
        {tab === "chat" && <Chat />}
        {tab === "eval" && <EvalDashboard />}
      </main>

      <footer className="border-t border-slate-200/80 bg-white/50 py-6 text-center text-xs text-slate-500">
        Interview demo build — not for clinical use.
      </footer>
    </div>
  );
}
