"use client";

import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import PipelineProgress from "@/components/PipelineProgress";
import StepResult from "@/components/StepResult";
import {
  createArticle,
  runPipeline,
  createPipelineStream,
  getArticle,
  getPersonas,
} from "@/lib/api";
import { PIPELINE_STEPS } from "@/types";
import type { Article, PipelineSSEEvent, Persona, PipelineResults } from "@/types";

const EMPTY_RESULTS: PipelineResults = {
  research_brief: null,
  style_guide: null,
  draft: null,
  feedback: null,
  final_article: null,
};

// Truncate long author notes for display
function truncateText(text: string, maxLen = 160): string {
  return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
}

export default function GeneratorPage() {
  // Form
  const [title, setTitle] = useState("");
  const [authorNotes, setAuthorNotes] = useState("");
  const [sources, setSources] = useState<string[]>([""]);
  const [referenceUrl, setReferenceUrl] = useState("");
  const [constraints, setConstraints] = useState("");
  const [selectedPersonaId, setSelectedPersonaId] = useState("");
  const [personas, setPersonas] = useState<Persona[]>([]);

  // Pipeline state
  const [article, setArticle] = useState<Article | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [liveResults, setLiveResults] = useState<PipelineResults>({ ...EMPTY_RESULTS });
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"form" | "running" | "done">("form");

  useEffect(() => {
    void getPersonas().then(setPersonas).catch(() => null);
  }, []);

  // SSE stream handler
  const attachStream = useCallback((articleId: string) => {
    const es = createPipelineStream(articleId);

    es.onmessage = (event: MessageEvent) => {
      const data: PipelineSSEEvent = JSON.parse(event.data as string);

      if (data.event === "step_started") {
        setCurrentStep(data.step);
      } else if (data.event === "step_completed") {
        const keyMap: Record<string, keyof PipelineResults> = {
          research: "research_brief",
          style_extraction: "style_guide",
          draft: "draft",
          reflection: "feedback",
          finalization: "final_article",
        };
        const key = data.step ? keyMap[data.step] : null;
        if (key) {
          setLiveResults((prev) => ({ ...prev, [key]: data.data as string }));
        }
        setCurrentStep(null);
      } else if (data.event === "completed") {
        setPhase("done");
        setCurrentStep(null);
        // Refresh article from server for final state
        void getArticle(articleId).then(setArticle).catch(() => null);
        es.close();
      } else if (data.event === "error") {
        setError(data.error ?? "Pipeline failed.");
        setPhase("done");
        es.close();
      } else if (data.event === "done") {
        es.close();
      }
    };

    es.onerror = () => {
      setError("Connection to server interrupted.");
      es.close();
    };

    return () => es.close();
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!authorNotes.trim()) {
      setError("Author notes are required.");
      return;
    }

    setIsStarting(true);
    setLiveResults({ ...EMPTY_RESULTS });
    setCurrentStep(null);

    try {
      const filteredSources = sources.filter((s) => s.trim());
      const newArticle = await createArticle(title || "Untitled Article", {
        author_notes: authorNotes.trim(),
        sources: filteredSources,
        reference_url: referenceUrl.trim(),
        constraints: constraints.trim(),
      });

      setArticle(newArticle);
      setPhase("running");

      await runPipeline(newArticle.id, selectedPersonaId || undefined);
      attachStream(newArticle.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start pipeline.");
      setPhase("form");
    } finally {
      setIsStarting(false);
    }
  }

  function handleReset() {
    setPhase("form");
    setArticle(null);
    setLiveResults({ ...EMPTY_RESULTS });
    setCurrentStep(null);
    setError("");
    setTitle("");
    setAuthorNotes("");
    setSources([""]);
    setReferenceUrl("");
    setConstraints("");
  }

  function handleDownloadFinal() {
    const content = liveResults.final_article ?? article?.results.final_article;
    if (!content) return;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "article").replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const results = phase === "done" && article
    ? { ...liveResults, ...Object.fromEntries(
        Object.entries(article.results).filter(([, v]) => v !== null)
      ) }
    : liveResults;

  const articleStatus = phase === "running" ? "running" : phase === "done" ? "completed" : "pending";

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

          {/* ── FORM ── */}
          {phase === "form" && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">New Article</h1>
                <p className="text-slate-400 mt-1 text-sm">Fill in the inputs to start the AI pipeline</p>
              </div>

              <form onSubmit={(e) => void handleGenerate(e)} className="space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Title <span className="text-slate-500 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. The Future of Generative AI in Healthcare"
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600"
                  />
                </div>

                {/* Author Notes — protected, cannot be fully cleared */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Author Notes <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={authorNotes}
                    onChange={(e) => {
                      // Protect against fully clearing — must keep at least some content
                      if (e.target.value.length > 0 || authorNotes.length === 0) {
                        setAuthorNotes(e.target.value);
                      }
                    }}
                    placeholder="Describe the topic, main ideas, key points, target audience…"
                    rows={6}
                    required
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600 resize-y"
                  />
                  {authorNotes.length > 200 && (
                    <p className="text-slate-600 text-xs mt-1">
                      {authorNotes.length} characters · will be truncated in display
                    </p>
                  )}
                </div>

                {/* Sources */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Source URLs <span className="text-slate-500 font-normal">(optional)</span>
                  </label>
                  <div className="space-y-2">
                    {sources.map((src, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="url"
                          value={src}
                          onChange={(e) => {
                            const s = [...sources];
                            s[idx] = e.target.value;
                            setSources(s);
                          }}
                          placeholder="https://example.com/article"
                          className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600"
                        />
                        {sources.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSources(sources.filter((_, i) => i !== idx))}
                            className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSources([...sources, ""])}
                      className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      + Add source
                    </button>
                  </div>
                </div>

                {/* Reference URL — optional */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Reference URL <span className="text-slate-500 font-normal">(optional — for style analysis)</span>
                  </label>
                  <input
                    type="url"
                    value={referenceUrl}
                    onChange={(e) => setReferenceUrl(e.target.value)}
                    placeholder="https://example.com/reference-article"
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600"
                  />
                  <p className="text-slate-600 text-xs mt-1">
                    If omitted, style will be derived from the selected persona (if any)
                  </p>
                </div>

                {/* Persona selector */}
                {personas.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Persona <span className="text-slate-500 font-normal">(optional)</span>
                    </label>
                    <select
                      value={selectedPersonaId}
                      onChange={(e) => setSelectedPersonaId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">No persona</option>
                      {personas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.platform}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Constraints */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Constraints <span className="text-slate-500 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={constraints}
                    onChange={(e) => setConstraints(e.target.value)}
                    placeholder="e.g. max 1500 words, formal tone, focus on SME market…"
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600 resize-y"
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isStarting || !authorNotes.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-xl font-medium transition-colors shadow-lg shadow-emerald-900/30"
                >
                  {isStarting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Starting…
                    </>
                  ) : (
                    <>✦ Generate Article</>
                  )}
                </button>
              </form>
            </>
          )}

          {/* ── RUNNING / DONE ── */}
          {(phase === "running" || phase === "done") && (
            <>
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {title || "Untitled Article"}
                  </h1>
                  {authorNotes && (
                    <p className="text-slate-500 text-sm mt-1">
                      {truncateText(authorNotes)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {results.final_article && (
                    <button
                      onClick={handleDownloadFinal}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                    >
                      ↓ Download
                    </button>
                  )}
                  {phase === "done" && (
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors"
                    >
                      ✦ New Article
                    </button>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="mb-6">
                <PipelineProgress
                  status={articleStatus}
                  currentStep={currentStep}
                  results={results}
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-6">
                  {error}
                </div>
              )}

              {/* Step results — appear one by one as they complete */}
              <div className="space-y-3">
                {PIPELINE_STEPS.map((step) => {
                  const content = results[step.resultKey];
                  const isStreaming = currentStep === step.id;
                  if (!content && !isStreaming) return null;
                  return (
                    <StepResult
                      key={step.id}
                      icon={step.icon}
                      label={step.label}
                      description={step.description}
                      content={content}
                      isStreaming={isStreaming}
                      defaultOpen={step.id === "finalization" && !!content}
                    />
                  );
                })}
              </div>
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
