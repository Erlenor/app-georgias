"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import {
  createArticle,
  runPipeline,
  createPipelineStream,
  getArticle,
  getPersonas,
} from "@/lib/api";
import { PIPELINE_STEPS } from "@/types";
import type { PipelineSSEEvent, Persona, PipelineResults } from "@/types";
import MarkdownRenderer from "@/components/MarkdownRenderer";

const EMPTY_RESULTS: PipelineResults = {
  research_brief: null,
  style_guide: null,
  draft: null,
  feedback: null,
  final_article: null,
};

const STEP_MESSAGES: Record<string, string[]> = {
  research: [
    "Digging through your notes...",
    "Identifying key arguments...",
    "Mapping out the topic landscape...",
    "Pulling insights from sources...",
    "Structuring the research brief...",
    "Connecting the dots between ideas...",
    "Analysing source credibility...",
    "Summarising key facts...",
    "Building the knowledge base...",
    "Extracting core themes...",
    "Cross-referencing information...",
    "Organising findings...",
    "Highlighting important data points...",
    "Preparing research foundations...",
    "Almost done with research...",
  ],
  style_extraction: [
    "Visiting the reference article...",
    "Analysing sentence structure...",
    "Detecting tone and voice...",
    "Measuring paragraph rhythm...",
    "Identifying signature phrases...",
    "Studying how arguments are built...",
    "Noting vocabulary patterns...",
    "Checking formality level...",
    "Examining headline style...",
    "Mapping the narrative flow...",
    "Extracting stylistic fingerprints...",
    "Calibrating writing style...",
    "Defining the style guide...",
    "Locking in the tone...",
    "Style extraction nearly complete...",
  ],
  draft: [
    "Opening a blank page...",
    "Writing the introduction...",
    "Developing the first argument...",
    "Adding supporting evidence...",
    "Crafting compelling subheadings...",
    "Building paragraph by paragraph...",
    "Weaving in the research...",
    "Applying the style guide...",
    "Shaping the narrative arc...",
    "Writing the core sections...",
    "Polishing sentence flow...",
    "Adding transitions between ideas...",
    "Forming a strong conclusion...",
    "Reviewing draft structure...",
    "First draft almost ready...",
  ],
  reflection: [
    "Putting on the editor hat...",
    "Reading through the draft critically...",
    "Checking factual accuracy...",
    "Evaluating argument strength...",
    "Looking for logical gaps...",
    "Comparing against research brief...",
    "Assessing style consistency...",
    "Identifying weak paragraphs...",
    "Noting areas to strengthen...",
    "Checking introduction impact...",
    "Reviewing the conclusion...",
    "Rating overall coherence...",
    "Prioritising improvement areas...",
    "Writing detailed feedback...",
    "Finishing editorial review...",
  ],
  finalization: [
    "Applying editor feedback...",
    "Strengthening weak sections...",
    "Polishing every sentence...",
    "Elevating the headline...",
    "Smoothing paragraph transitions...",
    "Enhancing the opening hook...",
    "Tightening the conclusion...",
    "Final style check...",
    "Removing redundant phrases...",
    "Adding final flourishes...",
    "Ensuring consistent tone...",
    "Last read-through in progress...",
    "Almost publication-ready...",
    "Putting the finishing touches...",
    "Your article is nearly done...",
  ],
};

function truncateText(text: string, maxLen = 160): string {
  return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
}

// Single merged step card — shows loading state while active, expandable when done
function StepCard({
                    icon,
                    label,
                    description,
                    content,
                    isActive,
                  }: {
  icon: string;
  label: string;
  description: string;
  content: string | null;
  isActive: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const messages = STEP_MESSAGES[PIPELINE_STEPS.find(s => s.label === label)?.id ?? ""] ?? ["Working on it..."];
  const isDone = !!content;

  const isFinal = label === "Final Article";

  // Final Article auto-opens and stays open. Others stay closed until clicked.
  useEffect(() => {
    if (isDone && isFinal) setIsOpen(true);
  }, [isDone, isFinal]);

  // Rotate messages while active
  useEffect(() => {
    if (!isActive || isDone) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMsgIdx((i) => (i + 1) % messages.length);
        setVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, [isActive, isDone, messages.length]);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    if (!content) return;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${label.toLowerCase().replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
      <div className={`border rounded-xl overflow-hidden transition-all duration-300 ${
          isFinal && isDone
              ? "border-emerald-400/60 bg-emerald-500/10 shadow-lg shadow-emerald-900/20"
              : isDone
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : isActive
                      ? "border-blue-500/40 bg-slate-900"
                      : "border-slate-800 bg-slate-900/40"
      }`}>
        {/* Header */}
        <div
            onClick={() => isDone && !isFinal && setIsOpen(v => !v)}
            className={`flex items-center justify-between p-4 ${isDone && !isFinal ? "cursor-pointer hover:bg-white/5" : "cursor-default"}`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{isDone ? "✅" : isActive ? icon : icon}</span>
            <div>
              <h3 className={`font-medium text-sm ${isDone ? "text-emerald-400" : isActive ? "text-white" : "text-slate-500"}`}>
                {label}
              </h3>
              <p className="text-xs text-slate-500">{description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isActive && !isDone && (
                <div className={`flex items-center gap-2 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-slate-400 text-xs italic hidden sm:inline">{messages[msgIdx]}</span>
                </div>
            )}
            {isDone && (
                <>
                  <span className="text-emerald-400 text-xs font-medium">Done!</span>
                  <button onClick={(e) => void handleCopy(e)} className="px-2 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors">
                    {copied ? "✓" : "Copy"}
                  </button>
                  <button onClick={handleDownload} className="px-2 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors">
                    ↓ .md
                  </button>
                  {!isFinal && (
                      <svg className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                  )}
                </>
            )}
          </div>
        </div>

        {/* Content */}
        {isOpen && isDone && content && (
            <div className="px-4 pb-4">
              <div className="border-t border-slate-800 pt-3">
                {isFinal ? (
                    <div className="bg-slate-950 rounded-lg p-5">
                      <MarkdownRenderer content={content} />
                    </div>
                ) : (
                    <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-mono bg-slate-950 rounded-lg p-4 overflow-auto max-h-96">
                {content}
              </pre>
                )}
              </div>
            </div>
        )}
      </div>
  );
}

// Form state persisted to sessionStorage so navigation doesn't wipe it
const FORM_KEY = "georgias_form_draft";

function loadFormDraft() {
  try {
    const raw = sessionStorage.getItem(FORM_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as {
      title: string; authorNotes: string; sources: string[];
      referenceUrl: string; constraints: string; selectedPersonaId: string;
    };
  } catch { return null; }
}

function saveFormDraft(data: object) {
  try { sessionStorage.setItem(FORM_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

function clearFormDraft() {
  try { sessionStorage.removeItem(FORM_KEY); } catch { /* ignore */ }
}

export default function GeneratorPage() {
  const saved = loadFormDraft();
  const [title, setTitle] = useState(saved?.title ?? "");
  const [authorNotes, setAuthorNotes] = useState(saved?.authorNotes ?? "");
  const [sources, setSources] = useState<string[]>(saved?.sources ?? [""]);
  const [referenceUrl, setReferenceUrl] = useState(saved?.referenceUrl ?? "");
  const [constraints, setConstraints] = useState(saved?.constraints ?? "");
  const [selectedPersonaId, setSelectedPersonaId] = useState(saved?.selectedPersonaId ?? "");
  const [personas, setPersonas] = useState<Persona[]>([]);

  const [articleId, setArticleId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [results, setResults] = useState<PipelineResults>({ ...EMPTY_RESULTS });
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"form" | "running" | "done">("form");
  const esRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const userScrolledRef = useRef(false);

  // Save form to sessionStorage on every change
  useEffect(() => {
    if (phase === "form") {
      saveFormDraft({ title, authorNotes, sources, referenceUrl, constraints, selectedPersonaId });
    }
  }, [title, authorNotes, sources, referenceUrl, constraints, selectedPersonaId, phase]);

  useEffect(() => {
    void getPersonas().then(setPersonas).catch(() => null);
  }, []);

  useEffect(() => {
    return () => {
      esRef.current?.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Track if user manually scrolled up
  useEffect(() => {
    const handleScroll = () => {
      const distFromBottom = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      userScrolledRef.current = distFromBottom > 200;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll to bottom when new results arrive, unless user scrolled up
  useEffect(() => {
    if (phase !== "running") return;
    if (!userScrolledRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [results, currentStep, phase]);

  const completedCount = Object.values(results).filter(Boolean).length;
  const progressPercent = (completedCount / 5) * 100;

  const updateResults = useCallback((newResults: PipelineResults) => {
    setResults((prev) => {
      const merged = { ...prev };
      (Object.keys(newResults) as (keyof PipelineResults)[]).forEach((k) => {
        if (newResults[k]) merged[k] = newResults[k];
      });
      return merged;
    });
  }, []);

  const startPolling = useCallback((id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const a = await getArticle(id);
        updateResults(a.results);
        if (a.pipeline_step) setCurrentStep(a.pipeline_step);
        if (a.status === "completed") {
          setPhase("done");
          setCurrentStep(null);
          updateResults(a.results);
          clearInterval(pollRef.current!);
          esRef.current?.close();
        } else if (a.status === "failed") {
          setError(a.error ?? "Pipeline failed.");
          setPhase("done");
          clearInterval(pollRef.current!);
          esRef.current?.close();
        }
      } catch { /* ignore */ }
    }, 4000);
  }, [updateResults]);

  const attachStream = useCallback((id: string) => {
    esRef.current?.close();
    const es = createPipelineStream(id);
    esRef.current = es;

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
        if (key) setResults((prev) => ({ ...prev, [key]: data.data as string }));
        setCurrentStep(null);
      } else if (data.event === "completed") {
        setPhase("done");
        setCurrentStep(null);
        if (pollRef.current) clearInterval(pollRef.current);
        void getArticle(id).then((a) => updateResults(a.results)).catch(() => null);
        es.close();
      } else if (data.event === "error") {
        setError(data.error ?? "Pipeline failed.");
        setPhase("done");
        es.close();
      } else if (data.event === "done") {
        es.close();
      }
    };

    es.onerror = () => { es.close(); };
  }, [updateResults]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!authorNotes.trim()) { setError("Author notes are required."); return; }

    setIsStarting(true);
    setResults({ ...EMPTY_RESULTS });
    setCurrentStep(null);

    try {
      const filteredSources = sources.filter((s) => s.trim());
      const newArticle = await createArticle(title || "Untitled Article", {
        author_notes: authorNotes.trim(),
        sources: filteredSources,
        reference_url: referenceUrl.trim(),
        constraints: constraints.trim(),
      });

      setArticleId(newArticle.id);
      setPhase("running");
      await runPipeline(newArticle.id, selectedPersonaId || undefined);
      attachStream(newArticle.id);
      startPolling(newArticle.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start pipeline.");
      setPhase("form");
    } finally {
      setIsStarting(false);
    }
  }

  function handleReset() {
    esRef.current?.close();
    if (pollRef.current) clearInterval(pollRef.current);
    setPhase("form");
    setArticleId(null);
    setResults({ ...EMPTY_RESULTS });
    setCurrentStep(null);
    setError("");
    setTitle("");
    setAuthorNotes("");
    setSources([""]);
    setReferenceUrl("");
    setConstraints("");
    setSelectedPersonaId("");
    clearFormDraft();
  }

  function handleDownloadFinal() {
    const content = results.final_article;
    if (!content) return;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "article").replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Title <span className="text-slate-500 font-normal">(optional)</span>
                      </label>
                      <input
                          type="text" value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g. The Future of Generative AI in Healthcare"
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Author Notes <span className="text-red-400">*</span>
                      </label>
                      <textarea
                          value={authorNotes}
                          onChange={(e) => { if (e.target.value.length > 0 || authorNotes.length === 0) setAuthorNotes(e.target.value); }}
                          placeholder="Describe the topic, main ideas, key points, target audience…"
                          rows={6} required
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600 resize-y"
                      />
                      {authorNotes.length > 200 && (
                          <p className="text-slate-600 text-xs mt-1">{authorNotes.length} characters</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Source URLs <span className="text-slate-500 font-normal">(optional)</span>
                      </label>
                      <div className="space-y-2">
                        {sources.map((src, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input
                                  type="url" value={src}
                                  onChange={(e) => { const s = [...sources]; s[idx] = e.target.value; setSources(s); }}
                                  placeholder="https://example.com/article"
                                  className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600"
                              />
                              {sources.length > 1 && (
                                  <button type="button" onClick={() => setSources(sources.filter((_, i) => i !== idx))}
                                          className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">✕</button>
                              )}
                            </div>
                        ))}
                        <button type="button" onClick={() => setSources([...sources, ""])}
                                className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
                          + Add source
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Reference URL <span className="text-slate-500 font-normal">(optional — for style analysis)</span>
                      </label>
                      <input
                          type="url" value={referenceUrl}
                          onChange={(e) => setReferenceUrl(e.target.value)}
                          placeholder="https://example.com/reference-article"
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600"
                      />
                      <p className="text-slate-600 text-xs mt-1">If omitted, style will be derived from the selected persona</p>
                    </div>

                    {personas.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            Persona <span className="text-slate-500 font-normal">(optional)</span>
                          </label>
                          <select value={selectedPersonaId} onChange={(e) => setSelectedPersonaId(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                            <option value="">No persona</option>
                            {personas.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.platform}</option>)}
                          </select>
                        </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Constraints <span className="text-slate-500 font-normal">(optional)</span>
                      </label>
                      <textarea value={constraints} onChange={(e) => setConstraints(e.target.value)}
                                placeholder="e.g. max 1500 words, formal tone, focus on SME market…"
                                rows={2}
                                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600 resize-y"
                      />
                    </div>

                    {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>}

                    <button type="submit" disabled={isStarting || !authorNotes.trim()}
                            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-xl font-medium transition-colors shadow-lg shadow-emerald-900/30">
                      {isStarting
                          ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Starting…</>
                          : <>✦ Generate Article</>}
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
                      <h1 className="text-xl font-bold text-white">{title || "Untitled Article"}</h1>
                      {authorNotes && <p className="text-slate-500 text-sm mt-1">{truncateText(authorNotes)}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {results.final_article && (
                          <button onClick={handleDownloadFinal}
                                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors">
                            ↓ Download
                          </button>
                      )}
                      {phase === "done" && (
                          <button onClick={handleReset}
                                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors">
                            ✦ New Article
                          </button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {phase === "running" && (
                      <div className="mb-3">
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${progressPercent}%` }} />
                        </div>
                      </div>
                  )}

                  {/* Pipeline circles — connectors aligned to circle center only */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-white font-medium text-sm">Pipeline Progress</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                          phase === "done" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"
                      }`}>{phase}</span>
                    </div>
                    <div className="flex items-start mt-4">
                      {PIPELINE_STEPS.map((step, idx) => {
                        const isDone = !!results[step.resultKey];
                        const isActive = currentStep === step.id;
                        return (
                            <div key={step.id} className="flex items-start flex-1">
                              <div className="flex flex-col items-center flex-1">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm border-2 transition-all duration-500 ${
                                    isDone ? "bg-emerald-500 border-emerald-500 text-white"
                                        : isActive ? "bg-blue-500/20 border-blue-500 text-blue-400 animate-pulse"
                                            : "bg-slate-800 border-slate-700 text-slate-500"
                                }`}>
                                  {isDone
                                      ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                      : <span>{step.icon}</span>
                                  }
                                </div>
                                <p className={`text-xs mt-1.5 text-center hidden sm:block ${
                                    isDone ? "text-emerald-400" : isActive ? "text-blue-400" : "text-slate-600"
                                }`}>{step.label}</p>
                              </div>
                              {/* Connector aligned to circle center (top: 18px = half of 36px circle) */}
                              {idx < PIPELINE_STEPS.length - 1 && (
                                  <div className="flex-shrink-0 w-4 sm:w-6" style={{ marginTop: "18px" }}>
                                    <div className={`h-0.5 w-full transition-all duration-500 ${isDone ? "bg-emerald-500" : "bg-slate-700"}`} />
                                  </div>
                              )}
                            </div>
                        );
                      })}
                    </div>
                  </div>

                  {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">{error}</div>}

                  {/* Initialising message */}
                  {phase === "running" && !currentStep && completedCount === 0 && (
                      <div className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 mb-4">
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <div className="w-4 h-4 border-2 border-slate-500 border-t-emerald-400 rounded-full animate-spin" />
                          Initialising pipeline…
                        </div>
                      </div>
                  )}

                  {/* Merged step cards */}
                  <div className="space-y-3">
                    {PIPELINE_STEPS.map((step) => {
                      const content = results[step.resultKey];
                      const isActive = currentStep === step.id;
                      const isDone = !!content;
                      // Only show if active, done, or phase is done (show all)
                      if (!isDone && !isActive && phase !== "done") return null;
                      return (
                          <StepCard
                              key={step.id}
                              icon={step.icon}
                              label={step.label}
                              description={step.description}
                              content={content}
                              isActive={isActive}
                          />
                      );
                    })}
                  </div>

                  {/* Done banner */}
                  {phase === "done" && !error && results.final_article && (
                      <div className="mt-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-5 py-4 text-center">
                        <p className="text-emerald-400 font-medium">✓ Article generation complete</p>
                        <p className="text-emerald-400/60 text-sm mt-1">Download the final article or start a new one</p>
                      </div>
                  )}
                  <div ref={bottomRef} className="h-4" />
                </>
            )}
          </main>
        </div>
      </ProtectedRoute>
  );
}